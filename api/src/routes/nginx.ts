import express from "express";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { authenticateToken } from "../modules/authentication";
import { NginxFile } from "../models/nginxFile";
import { Machine } from "../models/machine";
import { checkBodyReturnMissing, isValidUUID } from "../modules/common";
import { verifyTemplateFileExists } from "../modules/fileValidation";
import {
	parseNginxConfig,
	populateNginxFilesWithMachineData,
} from "../modules/nginxParseConfig";
import { getMachineInfo } from "../modules/machines";
import { createNginxConfigFromTemplate } from "../modules/nginx";
import { STAGING_DIR } from "../config/appUser";
import { generateNginxScanReport } from "../modules/nginxReports";
import logger from "../config/logger";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const router = express.Router();
const execFileAsync = promisify(execFile);

type NginxSetupStatus = "yes" | "failed" | null;

interface NginxSetupSummary {
  symlink: NginxSetupStatus;
  nginxReload: NginxSetupStatus;
  certbot: NginxSetupStatus;
  errors: string[];
}

const DOMAIN_NAME_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function isValidDomainName(value: string): boolean {
  return DOMAIN_NAME_REGEX.test(value);
}

function formatExecError(error: unknown): string {
  if (error instanceof Error) {
    const execError = error as Error & { stderr?: string; stdout?: string };
    return execError.stderr || execError.stdout || execError.message;
  }

  return "Unknown error";
}

async function runSudoCommand(args: string[], timeout = 120000) {
  return execFileAsync("sudo", args, { timeout });
}

async function moveStagedNginxConfigToDestination(
  stagedFilePath: string,
  saveDestination: string
) {
  const destinationDir = `${saveDestination.replace(/\/+$/, "")}/`;
  await runSudoCommand(["/usr/bin/mv", stagedFilePath, destinationDir]);
}

async function ensureNginxSymlink(fileName: string) {
  const targetPath = path.join("/etc/nginx/sites-available", fileName);
  const linkPath = path.join("/etc/nginx/sites-enabled", fileName);

  try {
    const linkStats = await fs.promises.lstat(linkPath);
    if (!linkStats.isSymbolicLink()) {
      throw new Error(`${linkPath} already exists and is not a symlink`);
    }

    const existingTarget = await fs.promises.readlink(linkPath);
    if (existingTarget !== targetPath) {
      throw new Error(
        `${linkPath} already points to ${existingTarget}, expected ${targetPath}`
      );
    }

    return;
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  await runSudoCommand(["/usr/bin/ln", "-s", targetPath, linkPath]);
}

async function reloadNginx() {
  await runSudoCommand(["/usr/bin/systemctl", "reload", "nginx"]);
}

async function runCertbotForDomain(domainName: string) {
  await runSudoCommand(
    ["/usr/bin/certbot", "--nginx", "--reinstall", "-d", domainName],
    300000
  );
}

async function runNginxSetupAutomation(
  nginxFileRecord: any,
  fileName: string
): Promise<NginxSetupSummary> {
  const setupSummary: NginxSetupSummary = {
    symlink: null,
    nginxReload: null,
    certbot: null,
    errors: [],
  };

  try {
    await ensureNginxSymlink(fileName);
    setupSummary.symlink = "yes";
    nginxFileRecord.symlink = "yes";
    await nginxFileRecord.save();
  } catch (error) {
    setupSummary.symlink = "failed";
    setupSummary.errors.push(`symlink: ${formatExecError(error)}`);
    nginxFileRecord.symlink = "failed";
    await nginxFileRecord.save();
    return setupSummary;
  }

  try {
    await reloadNginx();
    setupSummary.nginxReload = "yes";
    nginxFileRecord.nginxReload = "yes";
    await nginxFileRecord.save();
  } catch (error) {
    setupSummary.nginxReload = "failed";
    setupSummary.errors.push(`nginxReload: ${formatExecError(error)}`);
    nginxFileRecord.nginxReload = "failed";
    await nginxFileRecord.save();
    return setupSummary;
  }

  try {
    await runCertbotForDomain(fileName);
    setupSummary.certbot = "yes";
    nginxFileRecord.certbot = "yes";
    await nginxFileRecord.save();
  } catch (error) {
    setupSummary.certbot = "failed";
    setupSummary.errors.push(`certbot: ${formatExecError(error)}`);
    nginxFileRecord.certbot = "failed";
    await nginxFileRecord.save();
  }

  return setupSummary;
}

// Apply JWT authentication to all routes
router.use(authenticateToken);

// 🔹 GET /nginx: Get all nginx config files with populated machine data
router.get("/", async (req: Request, res: Response) => {
  try {
    const nginxFiles = await NginxFile.find();

    // Populate nginx files with machine data (machineName and localIpAddress)
    // and strip MongoDB internal fields (_id, __v)
    const populatedNginxFiles =
      await populateNginxFilesWithMachineData(nginxFiles);

    res.json(populatedNginxFiles);
  } catch (error) {
    logger.error("Error fetching nginx files:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch nginx files",
        details:
          process.env.NODE_ENV !== "production"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
        status: 500,
      },
    });
  }
});

// 🔹 GET /nginx/scan-nginx-dir: Scan nginx directory and parse config files
router.get("/scan-nginx-dir", async (req: Request, res: Response) => {
  try {
    // 1. Get current machine's local IP
    const { localIpAddress: currentMachineIp } = getMachineInfo();

    // 2. Look up nginxHostServerMachineId using current IP
    const nginxHostMachine = await Machine.findOne({
      localIpAddress: currentMachineIp,
    });
    if (!nginxHostMachine) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Current machine not found in database",
          details: process.env.NODE_ENV !== 'production' ? `Current IP: ${currentMachineIp}` : undefined,
          status: 404
        }
      });
    }

    // 3. Read files from /etc/nginx/sites-available/
    const nginxDir = process.env.PATH_ETC_NGINX_SITES_AVAILABLE;
    let files: string[];

    try {
      files = await fs.promises.readdir(nginxDir);
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to read nginx directory",
          details: process.env.NODE_ENV !== 'production' ? `${nginxDir}: ${error instanceof Error ? error.message : "Unknown error"}` : undefined,
          status: 500
        }
      });
    }

    // 4. Filter out 'default'
    const configFiles = files.filter((file) => file !== "default");

    // 5. Parse each file
    const newEntries = [];
    const duplicates = [];
    const errors = [];

    for (const file of configFiles) {
      try {
        const filePath = path.join(nginxDir, file);
        const content = await fs.promises.readFile(filePath, "utf-8");
        const parsed = parseNginxConfig(content);

        // Skip if no server names found
        if (parsed.serverNames.length === 0) {
          errors.push({
            fileName: file,
            error: "No server names found in config file",
          });
          continue;
        }

        // Look up appHostServerMachinePublicId
        let appHostMachine = null;
        if (parsed.localIpAddress) {
          appHostMachine = await Machine.findOne({
            localIpAddress: parsed.localIpAddress,
          });
        }

        // Check for duplicates by primary server name
        const primaryServerName = parsed.serverNames[0];
        const existing = await NginxFile.findOne({
          serverName: primaryServerName,
        });

        if (existing) {
          duplicates.push({
            fileName: file,
            serverName: primaryServerName,
            additionalServerNames: parsed.serverNames.slice(1),
            portNumber: parsed.listenPort,
            localIpAddress: parsed.localIpAddress,
            framework: parsed.framework,
            reason: "Server name already exists in database",
          });
        } else {
          // Prepare new entry data
          const newEntryData = {
            publicId: randomUUID(),
            serverName: primaryServerName,
            serverNameArrayOfAdditionalServerNames: parsed.serverNames.slice(1),
            portNumber: parsed.listenPort || 0,
            appHostServerMachinePublicId: appHostMachine?.publicId || null,
            nginxHostServerMachinePublicId: nginxHostMachine.publicId,
            framework: parsed.framework,
            storeDirectory: nginxDir,
          };

          // Insert into database
          const createdEntry = await NginxFile.create(newEntryData);

          newEntries.push({
            fileName: file,
            serverName: primaryServerName,
            additionalServerNames: parsed.serverNames.slice(1),
            portNumber: parsed.listenPort,
            localIpAddress: parsed.localIpAddress,
            framework: parsed.framework,
            appHostMachineFound: !!appHostMachine,
            publicId: createdEntry.publicId,
          });
        }
      } catch (error) {
        errors.push({
          fileName: file,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 6. Generate CSV report
    const reportPath = generateNginxScanReport(newEntries, duplicates, errors);

    // 7. Return response
    res.json({
      scanned: configFiles.length,
      new: newEntries.length,
      duplicates: duplicates.length,
      errors: errors.length,
      currentMachineIp,
      nginxHostMachinePublicId: nginxHostMachine.publicId,
      reportPath,
      newEntries,
      duplicateEntries: duplicates,
      errorEntries: errors,
    });
  } catch (error) {
    logger.error("Error scanning nginx directory:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to scan nginx directory",
        details: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.message : "Unknown error") : undefined,
        status: 500
      }
    });
  }
});

// 🔹 POST /nginx/create-config-file: Create nginx configuration file
router.post("/create-config-file", async (req: Request, res: Response) => {
  // Log request body for testing
  logger.info("📥 POST /nginx/create-config-file - Request body:");
  logger.info(JSON.stringify(req.body, null, 2));
  logger.info(`Body type: ${typeof req.body}`);
  logger.info("Body keys:", Object.keys(req.body || {}));
  try {
    // Validate required fields
    const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
      "templateFileName",
      "serverNamesArray",
      "appHostServerMachinePublicId",
      "portNumber",
      "saveDestination",
    ]);

    if (!isValid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: `Missing required fields: ${missingKeys.join(", ")}`,
          status: 400
        }
      });
    }

    const {
      templateFileName,
      serverNamesArray,
      appHostServerMachinePublicId,
      portNumber,
      saveDestination,
    } = req.body;

    // Validate and map templateFileName to actual file
    if (
      typeof templateFileName !== "string" ||
      templateFileName.trim() === ""
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: "templateFileName must be a non-empty string",
          status: 400
        }
      });
    }

    // Map template type to actual filename
    const templateFileMap: Record<string, string> = {
      expressJs: "expressJsSitesAvailable.txt",
      nextJsPython: "nextJsPythonSitesAvailable.txt",
    };

    const actualTemplateFileName = templateFileMap[templateFileName];
    if (!actualTemplateFileName) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid templateFileName",
          details: `Must be one of: ${Object.keys(templateFileMap).join(", ")}`,
          status: 400
        }
      });
    }

    // Validate serverNamesArray (array of strings)
    if (!Array.isArray(serverNamesArray) || serverNamesArray.length === 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: "serverNamesArray must be a non-empty array",
          status: 400
        }
      });
    }

    if (
      !serverNamesArray.every(
        (name) =>
          typeof name === "string" &&
          name.trim() !== "" &&
          isValidDomainName(name.trim())
      )
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: "All server names must be valid domain or subdomain names",
          status: 400
        }
      });
    }

    const normalizedServerNamesArray = serverNamesArray.map((name) =>
      name.trim()
    );

    // Validate appHostServerMachinePublicId (non-empty string)
    if (
      typeof appHostServerMachinePublicId !== "string" ||
      appHostServerMachinePublicId.trim() === ""
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: "appHostServerMachinePublicId must be a non-empty string",
          status: 400
        }
      });
    }

    // Verify machine exists in database
    const machine = await Machine.findOne({
      publicId: appHostServerMachinePublicId,
    });
    if (!machine) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Machine not found",
          details: "Machine with specified appHostServerMachinePublicId not found",
          status: 404
        }
      });
    }

    // Validate portNumber (number, 1-65535)
    if (
      typeof portNumber !== "number" ||
      portNumber < 1 ||
      portNumber > 65535
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: "portNumber must be a number between 1 and 65535",
          status: 400
        }
      });
    }

    // Validate saveDestination (must be a non-empty string path)
    if (typeof saveDestination !== "string" || saveDestination.trim() === "") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: "saveDestination must be a non-empty string path",
          status: 400
        }
      });
    }

    // Verify template file exists
    const fileValidation = verifyTemplateFileExists(actualTemplateFileName);
    if (!fileValidation.exists) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Template file not found",
          details: process.env.NODE_ENV !== 'production' ? fileValidation.error : undefined,
          status: 404
        }
      });
    }

    // Get current machine's IP to find nginxHostServerMachineId
    const { localIpAddress: currentMachineIp } = getMachineInfo();
    const nginxHostMachine = await Machine.findOne({
      localIpAddress: currentMachineIp,
    });

    if (!nginxHostMachine) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Current machine not found in database",
          details: process.env.NODE_ENV !== 'production' ? `Current IP: ${currentMachineIp}` : undefined,
          status: 404
        }
      });
    }

    // Machine document already validated and fetched above (line 217)
    // Use it to get the local IP address
    if (!machine.localIpAddress) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Machine configuration error",
          details: process.env.NODE_ENV !== 'production' ? "Machine document does not have a localIpAddress field" : undefined,
          status: 500
        }
      });
    }

    // Create nginx config file from template
    const targetStoreDirectory = saveDestination.replace(/\/+$/, "");
    const usesSitesAvailable =
      path.resolve(targetStoreDirectory) === "/etc/nginx/sites-available";
    const stagingDestination = usesSitesAvailable ? STAGING_DIR : targetStoreDirectory;

    const configResult = await createNginxConfigFromTemplate({
      templateFilePath: fileValidation.fullPath!,
      serverNamesArray: normalizedServerNamesArray,
      localIpAddress: machine.localIpAddress,
      portNumber,
      saveDestination: stagingDestination,
    });

    if (!configResult.success) {
      logger.error("Nginx config creation failed", { error: configResult.error });
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create nginx config file",
          details: process.env.NODE_ENV !== 'production' ? configResult.error : undefined,
          status: 500
        }
      });
    }

    const fileName = normalizedServerNamesArray[0];
    const finalFilePath = path.join(targetStoreDirectory, fileName);

    if (usesSitesAvailable) {
      try {
        await moveStagedNginxConfigToDestination(
          configResult.filePath!,
          targetStoreDirectory
        );
      } catch (error) {
        logger.error("Failed to move nginx config from staging", {
          error: formatExecError(error),
        });

        try {
          await fs.promises.unlink(configResult.filePath!);
        } catch (cleanupError) {
          logger.warn("Failed to clean up staged nginx config", cleanupError);
        }

        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to move nginx config file to sites-available",
            details:
              process.env.NODE_ENV !== "production"
                ? formatExecError(error)
                : undefined,
            status: 500,
          },
        });
      }
    }

    // Determine framework (default to ExpressJs)
    // Note: Could be enhanced to detect framework from template or request
    const framework = "ExpressJs";

    // Use saveDestination as the storeDirectory
    const storeDirectory = targetStoreDirectory;

    // Auto-generate publicId
    const publicId = randomUUID();

    // Create NginxFile database record
    const nginxFileRecord = await NginxFile.create({
      publicId,
      serverName: fileName,
      serverNameArrayOfAdditionalServerNames: normalizedServerNamesArray.slice(1),
      portNumber,
      appHostServerMachinePublicId,
      nginxHostServerMachinePublicId: nginxHostMachine.publicId,
      framework,
      storeDirectory,
      symlink: null,
      nginxReload: null,
      certbot: null,
    });

    const setupSummary = usesSitesAvailable
      ? await runNginxSetupAutomation(nginxFileRecord, fileName)
      : {
          symlink: null,
          nginxReload: null,
          certbot: null,
          errors: ["Setup automation skipped because saveDestination is not /etc/nginx/sites-available"],
        };

    res.status(201).json({
      message:
        setupSummary.errors.length > 0
          ? "Nginx config file created with setup warnings"
          : "Nginx config file created successfully",
      filePath: usesSitesAvailable ? finalFilePath : configResult.filePath,
      databaseRecord: nginxFileRecord,
      setupSummary,
    });
  } catch (error) {
    logger.error("Error creating nginx config file:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create nginx config file",
        details: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.message : "Unknown error") : undefined,
        status: 500
      }
    });
  }
});

// 🔹 DELETE /nginx/clear: Clear all nginx files from database
router.delete("/clear", async (req: Request, res: Response) => {
  try {
    const result = await NginxFile.deleteMany({});

    res.json({
      message: "NginxFiles collection cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error("Error clearing nginx files:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to clear nginx files",
        details: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.message : "Unknown error") : undefined,
        status: 500
      }
    });
  }
});

// 🔹 GET /nginx/config-file/:nginxFilePublicId: Get nginx config file contents
router.get("/config-file/:nginxFilePublicId", async (req: Request, res: Response) => {
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  try {
    const { nginxFilePublicId } = req.params as { nginxFilePublicId: string };

    // Validate publicId format (UUID v4)
    if (!isValidUUID(nginxFilePublicId)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid nginxFilePublicId format",
          details: "nginxFilePublicId must be a valid UUID v4",
          status: 400,
        },
      });
    }

    // Find the configuration document
    const config = await NginxFile.findOne({ publicId: nginxFilePublicId });
    if (!config) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Configuration not found",
          details: "Nginx configuration with specified publicId not found",
          status: 404,
        },
      });
    }

    // Construct file path
    const filePath = path.join(config.storeDirectory, config.serverName);

    // Read the file using sudo cat
    try {
      const command = `sudo cat "${filePath}"`;
      logger.info(`📖 Executing: ${command}`);
      const { stdout } = await execAsync(command);
      logger.info(`📖 Successfully read nginx config file: ${filePath}`);

      res.json({
        content: stdout,
        filePath,
        serverName: config.serverName,
      });
    } catch (error: any) {
      // Handle file read errors
      logger.error(`❌ Failed to read file: ${error.message}`);

      if (error.message.includes("No such file or directory")) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Configuration file not found on disk",
            details:
              process.env.NODE_ENV !== "production"
                ? `File not found: ${filePath}`
                : undefined,
            status: 404,
          },
        });
      } else if (error.message.includes("Permission denied")) {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Permission denied reading configuration file",
            details:
              process.env.NODE_ENV !== "production"
                ? `Access denied: ${filePath}`
                : undefined,
            status: 500,
          },
        });
      } else {
        throw error; // Re-throw unexpected errors
      }
    }
  } catch (error) {
    logger.error("Error reading nginx config file:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to read nginx configuration file",
        details:
          process.env.NODE_ENV !== "production"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
        status: 500,
      },
    });
  }
});

// 🔹 POST /nginx/config-file/:nginxFilePublicId: Update nginx config file with validation
router.post("/config-file/:nginxFilePublicId", async (req: Request, res: Response) => {
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  try {
    const { nginxFilePublicId } = req.params as { nginxFilePublicId: string };
    const { content } = req.body;

    // Validate publicId format (UUID v4)
    if (!isValidUUID(nginxFilePublicId)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid nginxFilePublicId format",
          details: "nginxFilePublicId must be a valid UUID v4",
          status: 400,
        },
      });
    }

    // Validate content is provided
    if (!content || typeof content !== "string") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: "Missing or invalid 'content' field in request body. Must be a non-empty string.",
          status: 400,
        },
      });
    }

    // Find the configuration document
    const config = await NginxFile.findOne({ publicId: nginxFilePublicId });
    if (!config) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Configuration not found",
          details: "Nginx configuration with specified publicId not found",
          status: 404,
        },
      });
    }

    // Construct file paths
    const fileName = config.serverName;
    const nginxFilePath = path.join(config.storeDirectory, fileName);
    const backupFileName = `${fileName}.backup.${Date.now()}`;
    const backupFilePath = path.join(config.storeDirectory, backupFileName);
    const tmpFilePath = path.join(STAGING_DIR, fileName);

    logger.info(`📝 Updating nginx config file: ${nginxFilePath}`);
    logger.info(`📝 Backup path: ${backupFilePath}`);
    logger.info(`📝 Temp path: ${tmpFilePath}`);

    try {
      // Step 1: Create backup of original file using sudo cp
      try {
        const backupCommand = `sudo cp "${nginxFilePath}" "${backupFilePath}"`;
        logger.info(`💾 Executing: ${backupCommand}`);
        await execAsync(backupCommand);
        logger.info(`💾 Created backup: ${backupFilePath}`);
      } catch (error: any) {
        logger.error(`❌ Backup creation failed: ${error.message}`);
        if (error.message.includes("No such file or directory")) {
          return res.status(404).json({
            error: {
              code: "NOT_FOUND",
              message: "Configuration file not found on disk",
              details:
                process.env.NODE_ENV !== "production"
                  ? `File not found: ${nginxFilePath}`
                  : undefined,
              status: 404,
            },
          });
        } else {
          return res.status(500).json({
            error: {
              code: "INTERNAL_ERROR",
              message: "Permission denied creating backup",
              details:
                process.env.NODE_ENV !== "production"
                  ? error.message
                  : undefined,
              status: 500,
            },
          });
        }
      }

      // Step 2: Write new content to staging directory (no sudo needed)
      try {
        logger.info(`✍️  Writing new content to temp file: ${tmpFilePath}`);
        logger.info(`✍️  Content length: ${content.length} characters`);

        // Log content preview (first 200 and last 200 characters)
        const contentLines = content.split('\n');
        logger.info(`✍️  Content preview - Total lines: ${contentLines.length}`);
        logger.info(`✍️  First 5 lines:\n${contentLines.slice(0, 5).join('\n')}`);
        logger.info(`✍️  Last 5 lines:\n${contentLines.slice(-5).join('\n')}`);

        await fs.promises.writeFile(tmpFilePath, content, "utf-8");
        logger.info(`✍️  Successfully wrote temp file: ${tmpFilePath}`);
      } catch (error: any) {
        logger.error(`❌ Write to temp file failed: ${error.message}`);
        // Clean up backup
        try {
          await execAsync(`sudo rm "${backupFilePath}"`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw new Error(`Failed to write temporary file: ${error.message}`);
      }

      // Step 3: Move new file to nginx directory using sudo mv
      try {
        // IMPORTANT: Destination must be directory (with trailing slash), not full file path
        // This matches the sudoers rule: /usr/bin/mv <STAGING_DIR>/* /etc/nginx/sites-available/
        const mvCommand = `sudo mv "${tmpFilePath}" "${config.storeDirectory}/"`;
        logger.info(`📦 Executing: ${mvCommand}`);
        await execAsync(mvCommand);
        logger.info(`📦 Moved new file to: ${nginxFilePath}`);
      } catch (error: any) {
        logger.error(`❌ Failed to move file: ${error.message}`);
        // Clean up temp file and backup
        try {
          await fs.promises.unlink(tmpFilePath);
          await execAsync(`sudo rm "${backupFilePath}"`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw new Error(`Failed to move file to nginx directory: ${error.message}`);
      }

      // Step 4: Run nginx -t to validate
      try {
        logger.info(`🔍 Running nginx -t validation...`);
        const { stdout, stderr } = await execAsync("sudo nginx -t");
        logger.info(`✅ nginx -t passed`);
        logger.info(`✅ nginx -t stdout: ${stdout}`);
        logger.info(`✅ nginx -t stderr: ${stderr}`);

        // Step 5a: Success - Delete backup
        try {
          const rmCommand = `sudo rm "${backupFilePath}"`;
          logger.info(`🗑️  Executing: ${rmCommand}`);
          await execAsync(rmCommand);
          logger.info(`🗑️  Deleted backup: ${backupFilePath}`);
        } catch (cleanupError) {
          logger.warn(`⚠️  Failed to delete backup (non-critical): ${cleanupError}`);
        }

        res.json({
          message: "Nginx configuration updated successfully",
          filePath: nginxFilePath,
          serverName: config.serverName,
          validationPassed: true,
        });
      } catch (nginxTestError: any) {
        // Step 5b: nginx -t failed - Restore backup
        logger.error(`❌ nginx -t validation FAILED`);
        logger.error(`❌ nginx -t exit code: ${nginxTestError.code}`);
        logger.error(`❌ nginx -t stdout: ${nginxTestError.stdout || '(empty)'}`);
        logger.error(`❌ nginx -t stderr: ${nginxTestError.stderr || '(empty)'}`);
        logger.error(`❌ Full nginx -t error: ${nginxTestError.message}`);

        try {
          const restoreCommand = `sudo mv "${backupFilePath}" "${nginxFilePath}"`;
          logger.info(`♻️  Executing: ${restoreCommand}`);
          await execAsync(restoreCommand);
          logger.info(`♻️  Restored backup: ${backupFilePath} -> ${nginxFilePath}`);
        } catch (restoreError: any) {
          logger.error(`⚠️  CRITICAL: Failed to restore backup: ${restoreError.message}`);
        }

        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Nginx configuration validation failed",
            details:
              process.env.NODE_ENV !== "production"
                ? `nginx -t failed: ${nginxTestError.stderr || nginxTestError.message}`
                : "Invalid nginx configuration syntax. Changes have been reverted.",
            status: 400,
          },
        });
      }
    } catch (error: any) {
      logger.error(`❌ Unexpected error during update: ${error.message}`);
      throw error; // Re-throw to outer catch
    }
  } catch (error) {
    logger.error("Error updating nginx config file:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update nginx configuration file",
        details:
          process.env.NODE_ENV !== "production"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
        status: 500,
      },
    });
  }
});

// 🔹 DELETE /nginx/:publicId: Delete nginx config file and database record
router.delete("/:publicId", async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params as { publicId: string };

    // Validate publicId format (UUID v4)
    if (!isValidUUID(publicId)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid publicId format",
          details: "publicId must be a valid UUID v4",
          status: 400,
        },
      });
    }

    // Find the configuration document
    const config = await NginxFile.findOne({ publicId });
    if (!config) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Configuration not found",
          status: 404,
        },
      });
    }

    // Construct file path
    const filePath = path.join(config.storeDirectory, config.serverName);

    // Delete physical file (continue even if file doesn't exist)
    try {
      await fs.promises.unlink(filePath);
      logger.info(`🗑️  Deleted nginx config file: ${filePath}`);
    } catch (error) {
      // Log warning but continue - file may already be deleted
      logger.warn(
        `⚠️  File not found (will still delete DB entry): ${filePath}`
      );
    }

    // Delete database document
    await NginxFile.findOneAndDelete({ publicId });

    res.json({
      message: "Nginx configuration deleted successfully",
      serverName: config.serverName,
      filePath,
    });
  } catch (error) {
    logger.error("Error deleting nginx configuration:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete nginx configuration",
        details:
          process.env.NODE_ENV !== "production"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
        status: 500,
      },
    });
  }
});

export default router;
