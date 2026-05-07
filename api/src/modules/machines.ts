import os from "os";
import fs from "fs/promises";
import path from "path";
import logger from "../config/logger";
import { APP_USER_HOME, SYSTEMCTL_CSV_PATH } from "../config/appUser";

interface ServiceValidationWarning {
	code: "ENV_FILE_NOT_FOUND" | "NAME_APP_NOT_FOUND";
	filename: string;
	workingDirectory: string;
	message: string;
	details: string;
}

// Helper function to get machine name and local IP address
function getMachineInfo(): { machineName: string; localIpAddress: string; userHomeDir: string } {
	// Get machine hostname
	const machineName = os.hostname();

	// Get network interfaces
	const networkInterfaces = os.networkInterfaces();
	let localIpAddress = "";

	// Find the first non-internal IPv4 address
	for (const interfaceName in networkInterfaces) {
		const interfaces = networkInterfaces[interfaceName];
		if (!interfaces) continue;

		for (const iface of interfaces) {
			// Skip internal (i.e., 127.0.0.1) and non-IPv4 addresses
			if (iface.family === "IPv4" && !iface.internal) {
				localIpAddress = iface.address;
				break;
			}
		}

		if (localIpAddress) break;
	}

	// If no external IPv4 found, fallback to localhost
	if (!localIpAddress) {
		localIpAddress = "127.0.0.1";
	}

	return { machineName, localIpAddress, userHomeDir: APP_USER_HOME };
}

/**
 * Validates a service file and populates the service's name and workingDirectory
 *
 * Validation steps:
 * 1. Filename must not be null, empty, or whitespace-only
 * 2. Filename must end with '.service'
 * 3. Service file must exist at /etc/systemd/system/{filename}
 * 4. Reads the systemd service file to extract WorkingDirectory
 * 5. Optionally reads environment file to extract app name:
 *    - First tries .env file, then falls back to .env.local if not found
 *    - Searches for "NAME_APP=" string and extracts the value to the right
 *    - This matches both NAME_APP and NEXT_PUBLIC_NAME_APP variables
 *    - Missing env files or NAME_APP values become warnings, not validation errors
 * 6. Updates the service object in place with name and workingDirectory
 *
 * @param service - Service object with filename property (will be updated in place)
 * @throws Error with standardized error format if validation fails
 */
async function getServicesNameAndValidateServiceFile(service: any): Promise<void> {
	const { filename } = service;
	logger.info(`[machines.ts getServicesNameAndValidateServiceFile] Starting validation for: ${filename}`);

	// Validate filename is not null, undefined, empty, or whitespace-only
	if (!filename || typeof filename !== "string" || filename.trim() === "") {
		throw {
			error: {
				code: "VALIDATION_ERROR",
				message: "Invalid service filename",
				details: "Service filename cannot be null, empty, or whitespace-only",
				status: 400
			}
		};
	}

	// Validate filename ends with .service
	if (!filename.endsWith(".service")) {
		throw {
			error: {
				code: "VALIDATION_ERROR",
				message: "Invalid service filename",
				details: `Service filename must end with '.service'. Received: '${filename}'`,
				status: 400
			}
		};
	}

	const serviceFilePath = `/etc/systemd/system/${filename}`;

	logger.info(`[machines.ts] Validating service file: ${filename}`);

	// Check if service file exists and is accessible
	try {
		await fs.access(serviceFilePath);
		logger.info(`[machines.ts getServicesNameAndValidateServiceFile] fs.access succeeded for: ${serviceFilePath}`);
	} catch (error: any) {
		logger.info(`[machines.ts getServicesNameAndValidateServiceFile] fs.access failed for ${serviceFilePath}. Error code: ${error.code}`);

		// Distinguish between file not found and permission denied
		if (error.code === 'EACCES' || error.code === 'EPERM') {
			logger.info(`[machines.ts getServicesNameAndValidateServiceFile] Throwing 403 PERMISSION_DENIED for: ${filename}`);
			throw {
				error: {
					code: "SERVICE_FILE_PERMISSION_DENIED",
					message: `Permission denied accessing service file`,
					details: process.env.NODE_ENV !== 'production' ? `Service file '${filename}' exists at ${serviceFilePath} but cannot be accessed due to insufficient permissions` : undefined,
					status: 403
				}
			};
		}

		// File doesn't exist (ENOENT) or other error
		logger.info(`[machines.ts getServicesNameAndValidateServiceFile] Throwing 404 NOT_FOUND for: ${filename} (error code: ${error.code})`);
		throw {
			error: {
				code: "SERVICE_FILE_NOT_FOUND",
				message: `Service file not found`,
				details: `Service file '${filename}' does not exist at ${serviceFilePath}`,
				status: 404
			}
		};
	}

	// Read service file
	let serviceFileContent: string;
	try {
		serviceFileContent = await fs.readFile(serviceFilePath, "utf8");
		logger.info(`[machines.ts] Successfully read service file: ${filename}`);
	} catch (error: any) {
		throw {
			error: {
				code: "SERVICE_FILE_READ_ERROR",
				message: `Failed to read service file`,
				details: `Permission error or failed to read service file '${filename}': ${error.message}`,
				status: 400
			}
		};
	}

	// Parse WorkingDirectory from service file
	const workingDirectoryMatch = serviceFileContent.match(/^WorkingDirectory=(.+)$/m);
	if (!workingDirectoryMatch) {
		throw {
			error: {
				code: "WORKING_DIRECTORY_NOT_FOUND",
				message: `WorkingDirectory not found in service file`,
				details: `Service file '${filename}' is missing the WorkingDirectory property`,
				status: 400
			}
		};
	}

	const workingDirectory = workingDirectoryMatch[1].trim();
	logger.info(`[machines.ts] Found WorkingDirectory for ${filename}: ${workingDirectory}`);

	// Check if WorkingDirectory exists and is accessible
	try {
		await fs.access(workingDirectory);
	} catch (error: any) {
		// Distinguish between directory not found and permission denied
		if (error.code === 'EACCES' || error.code === 'EPERM') {
			throw {
				error: {
					code: "WORKING_DIRECTORY_PERMISSION_DENIED",
					message: `Permission denied accessing WorkingDirectory`,
					details: process.env.NODE_ENV !== 'production' ? `WorkingDirectory '${workingDirectory}' specified in service file '${filename}' exists but cannot be accessed due to insufficient permissions` : undefined,
					status: 403
				}
			};
		}

		// Directory doesn't exist (ENOENT) or other error
		throw {
			error: {
				code: "WORKING_DIRECTORY_NOT_FOUND",
				message: `WorkingDirectory does not exist`,
				details: `WorkingDirectory '${workingDirectory}' specified in service file '${filename}' does not exist`,
				status: 404
			}
		};
	}

	const fallbackName =
		typeof service.name === "string" && service.name.trim() !== ""
			? service.name.trim()
			: filename.replace(/\.service$/, "");

	service.name = fallbackName;
	service.workingDirectory = workingDirectory;
	delete service.envFileWarning;

	// Check if .env file exists in WorkingDirectory
	const envFilePath = path.join(workingDirectory, ".env");
	const envLocalFilePath = path.join(workingDirectory, ".env.local");

	const envCandidates = [
		{ label: ".env", filePath: envFilePath },
		{ label: ".env.local", filePath: envLocalFilePath },
	];
	const envFilesWithoutNameApp: string[] = [];
	let envFileFound = false;

	for (const envCandidate of envCandidates) {
		try {
			await fs.access(envCandidate.filePath);
			envFileFound = true;
			logger.info(`[machines.ts] Found ${envCandidate.label} file for ${filename}`);
		} catch (error: any) {
			if (error.code === 'EACCES' || error.code === 'EPERM') {
				throw {
					error: {
						code: "ENV_FILE_PERMISSION_DENIED",
						message: `Permission denied accessing ${envCandidate.label} file`,
						details: process.env.NODE_ENV !== 'production' ? `${envCandidate.label} file exists in '${workingDirectory}' for service '${filename}' but cannot be accessed due to insufficient permissions` : undefined,
						status: 403
					}
				};
			}

			continue;
		}

		let envFileContent: string;
		try {
			envFileContent = await fs.readFile(envCandidate.filePath, "utf8");
			logger.info(`[machines.ts] Successfully read ${envCandidate.label} file for ${filename}`);
		} catch (error: any) {
			if (error.code === 'EACCES' || error.code === 'EPERM') {
				throw {
					error: {
						code: "ENV_FILE_PERMISSION_DENIED",
						message: `Permission denied reading ${envCandidate.label} file`,
						details: process.env.NODE_ENV !== 'production' ? `${envCandidate.label} file exists in '${workingDirectory}' for service '${filename}' but cannot be read due to insufficient permissions` : undefined,
						status: 403
					}
				};
			}

			throw {
				error: {
					code: "ENV_FILE_READ_ERROR",
					message: `Failed to read ${envCandidate.label} file`,
					details: process.env.NODE_ENV !== 'production' ? `Failed to read ${envCandidate.label} file in '${workingDirectory}' for service '${filename}': ${error.message}` : undefined,
					status: 500
				}
			};
		}

		const nameAppMatch = envFileContent.match(/NAME_APP=(.+)$/m);
		if (nameAppMatch) {
			service.name = nameAppMatch[1].trim();
			logger.info(`[machines.ts] Found NAME_APP in ${envCandidate.label} for ${filename}: ${service.name}`);
			break;
		}

		envFilesWithoutNameApp.push(envCandidate.label);
	}

	if (!envFileFound) {
		service.envFileWarning = {
			code: "ENV_FILE_NOT_FOUND",
			filename,
			workingDirectory,
			message: "Environment file not found",
			details: `Neither .env nor .env.local file found in WorkingDirectory '${workingDirectory}' for service '${filename}'. Using fallback service name '${service.name}'.`,
		} satisfies ServiceValidationWarning;
	} else if (envFilesWithoutNameApp.length > 0 && service.name === fallbackName) {
		service.envFileWarning = {
			code: "NAME_APP_NOT_FOUND",
			filename,
			workingDirectory,
			message: "NAME_APP variable not found",
			details: `No variable containing "NAME_APP=" found in ${envFilesWithoutNameApp.join(" or ")} for service '${filename}'. Using fallback service name '${service.name}'.`,
		} satisfies ServiceValidationWarning;
	}

	logger.info(`[machines.ts] Successfully validated and populated service: ${filename}`);
}

/**
 * Reads and parses the systemctl CSV file
 * @param csvPath - Path to the CSV file
 * @returns Array of unit filenames from the CSV
 * @throws Error if file doesn't exist or can't be read
 */
async function readSystemctlCsv(csvPath: string): Promise<string[]> {
	// Check if CSV file exists and is accessible
	try {
		await fs.access(csvPath);
	} catch (error: any) {
		// Distinguish between file not found and permission denied
		if (error.code === 'EACCES' || error.code === 'EPERM') {
			throw {
				error: {
					code: "CSV_FILE_PERMISSION_DENIED",
					message: "Permission denied accessing CSV file",
					details: process.env.NODE_ENV !== 'production' ? `The file ${csvPath} exists but cannot be accessed due to insufficient permissions` : undefined,
					status: 403
				}
			};
		}

		throw {
			error: {
				code: "CSV_FILE_NOT_FOUND",
				message: "CSV file not found",
				details: `The file ${csvPath} does not exist on this server`,
				status: 404
			}
		};
	}

	// Read CSV file
	let csvContent: string;
	try {
		csvContent = await fs.readFile(csvPath, "utf8");
	} catch (error: any) {
		throw {
			error: {
				code: "CSV_FILE_READ_ERROR",
				message: "Failed to read CSV file",
				details: process.env.NODE_ENV !== "production" ? error.message : undefined,
				status: 500
			}
		};
	}

	// Parse CSV and extract unique unit filenames
	const lines = csvContent.trim().split("\n");
	const units: string[] = [];

	// Skip header row (line 0)
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const columns = line.split(",");
		if (columns.length >= 6) {
			const unit = columns[5].trim();
			if (unit && !units.includes(unit)) {
				units.push(unit);
			}
		}
	}

	return units;
}

/**
 * Builds a service map from CSV units, linking .timer files to their corresponding .service files
 * @param units - Array of unit filenames from CSV
 * @returns Map of service filenames to their timer files (if any)
 * @throws Error if orphaned .timer file is found
 */
function buildServiceMapFromCsv(units: string[]): Map<string, { timerFile?: string }> {
	const serviceMap = new Map<string, { timerFile?: string }>();
	const timerFiles: string[] = [];

	// First pass: collect all .service files and .timer files
	for (const unit of units) {
		if (unit.endsWith(".service")) {
			serviceMap.set(unit, {});
		} else if (unit.endsWith(".timer")) {
			timerFiles.push(unit);
		}
	}

	// Second pass: match .timer files to their .service files
	for (const timerFile of timerFiles) {
		const serviceFileName = timerFile.replace(".timer", ".service");

		if (!serviceMap.has(serviceFileName)) {
			throw {
				error: {
					code: "ORPHANED_TIMER_FILE",
					message: "Orphaned timer file found",
					details: `Timer file '${timerFile}' found in CSV but corresponding service file '${serviceFileName}' is not present in the CSV`,
					status: 400
				}
			};
		}

		// Link timer to service
		const serviceEntry = serviceMap.get(serviceFileName);
		if (serviceEntry) {
			serviceEntry.timerFile = timerFile;
		}
	}

	return serviceMap;
}

/**
 * Checks that all service files exist in /etc/systemd/system/
 * @param serviceMap - Map of service filenames
 * @throws Error if any service file is not found
 */
async function checkServiceFilesExist(serviceMap: Map<string, { timerFile?: string }>): Promise<void> {
	const systemdPath = "/etc/systemd/system";

	for (const [serviceFileName] of Array.from(serviceMap.entries())) {
		const serviceFilePath = path.join(systemdPath, serviceFileName);

		try {
			await fs.access(serviceFilePath);
		} catch (error: any) {
			// Distinguish between file not found and permission denied
			if (error.code === 'EACCES' || error.code === 'EPERM') {
				throw {
					error: {
						code: "SERVICE_FILE_PERMISSION_DENIED",
						message: "Permission denied accessing service file in systemd directory",
						details: process.env.NODE_ENV !== 'production' ? `Service file '${serviceFileName}' is listed in the CSV and exists at ${serviceFilePath} but cannot be accessed due to insufficient permissions` : undefined,
						status: 403
					}
				};
			}

			throw {
				error: {
					code: "SERVICE_FILE_NOT_FOUND_IN_DIRECTORY",
					message: "Service file not found in systemd directory",
					details: `Service file '${serviceFileName}' is listed in the CSV but does not exist at ${serviceFilePath}`,
					status: 404
				}
			};
		}
	}
}

/**
 * Extracts port number from a service file
 * Looks for "PORT=", "0.0.0.0:", or "--port" followed by exactly 4 digits
 * @param serviceFileName - Name of the service file
 * @returns Port number or undefined if not found
 * @throws Error if port format is invalid (not exactly 4 digits)
 */
async function extractPortFromServiceFile(serviceFileName: string): Promise<number | undefined> {
	const serviceFilePath = path.join("/etc/systemd/system", serviceFileName);

	let serviceFileContent: string;
	try {
		serviceFileContent = await fs.readFile(serviceFilePath, "utf8");
	} catch (error: any) {
		throw {
			error: {
				code: "SERVICE_FILE_READ_ERROR",
				message: "Failed to read service file",
				details: process.env.NODE_ENV !== "production" ? error.message : undefined,
				status: 500
			}
		};
	}

	// Search for "PORT=", "0.0.0.0:", or "--port" followed by digits
	const portPatterns = [
		/PORT=(\d+)/,
		/0\.0\.0\.0:(\d+)/,
		/--port\s+(\d+)/
	];

	for (const pattern of portPatterns) {
		const match = serviceFileContent.match(pattern);
		if (match) {
			const portString = match[1];

			// Validate exactly 4 digits
			if (portString.length !== 4) {
				throw {
					error: {
						code: "INVALID_PORT_FORMAT",
						message: "Invalid port number format",
						details: `Service file '${serviceFileName}' contains port number '${portString}' which is not exactly 4 digits`,
						status: 400
					}
				};
			}

			return parseInt(portString, 10);
		}
	}

	// No port found - this is acceptable
	return undefined;
}

/**
 * Main function to build services array from the systemctl CSV file
 * @returns Array of service objects with filename, port (optional), and filenameTimer (optional)
 */
async function buildServicesArrayFromSystemctl(): Promise<Array<{
	filename: string;
	port?: number;
	filenameTimer?: string;
}>> {
	// Step 1: Read CSV and extract units
	const units = await readSystemctlCsv(SYSTEMCTL_CSV_PATH);

	// Step 2: Build service map and validate no orphaned timers
	const serviceMap = buildServiceMapFromCsv(units);

	// Step 3: Check all service files exist in /etc/systemd/system/
	await checkServiceFilesExist(serviceMap);

	// Step 4: Build the response array
	const servicesArray: Array<{
		filename: string;
		port?: number;
		filenameTimer?: string;
	}> = [];

	for (const [serviceFileName, { timerFile }] of Array.from(serviceMap.entries())) {
		const serviceEntry: {
			filename: string;
			port?: number;
			filenameTimer?: string;
		} = {
			filename: serviceFileName
		};

		// Extract port from service file
		const port = await extractPortFromServiceFile(serviceFileName);
		if (port !== undefined) {
			serviceEntry.port = port;
		}

		// Add timer file if exists
		if (timerFile) {
			serviceEntry.filenameTimer = timerFile;
		}

		servicesArray.push(serviceEntry);
	}

	return servicesArray;
}

export {
	getMachineInfo,
	getServicesNameAndValidateServiceFile,
	buildServicesArrayFromSystemctl
};
