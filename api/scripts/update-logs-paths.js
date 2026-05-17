#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const OLD_LOGS_PREFIX_REGEX = /^\/home\/nick\/logs\//;
const NEW_LOGS_PREFIX = "/home/limited_user/logs/";
const OLD_LOGS_QUERY = { "servicesArray.pathToLogs": OLD_LOGS_PREFIX_REGEX };
const CORRECT_LOGS_QUERY = {
  "servicesArray.pathToLogs": /^\/home\/limited_user\/logs\//,
};

function formatTimestampForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "-",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
}

function parseArgs(argv) {
  const allowedFlags = new Set(["--dry-run", "--apply", "--confirm"]);
  const unknownFlags = argv.filter((arg) => !allowedFlags.has(arg));

  if (unknownFlags.length > 0) {
    return {
      ok: false,
      message: `Unknown flag: ${unknownFlags[0]}\n${usage()}`,
    };
  }

  const isDryRun = argv.includes("--dry-run");
  const isApply = argv.includes("--apply");
  const isConfirm = argv.includes("--confirm");

  if (isDryRun && isApply) {
    return {
      ok: false,
      message: "--apply and --dry-run cannot be used together",
    };
  }

  if (isConfirm && !isApply) {
    return {
      ok: false,
      message: "--confirm requires --apply\n" + usage(),
    };
  }

  if (isApply && isConfirm) {
    return { ok: true, mode: "apply-confirm" };
  }

  if (isApply) {
    return { ok: true, mode: "apply-preview" };
  }

  return { ok: true, mode: "dry-run" };
}

function usage() {
  return [
    "Usage:",
    "  npm run update-logs-paths",
    "  npm run update-logs-paths -- --dry-run",
    "  npm run update-logs-paths -- --apply",
    "  npm run update-logs-paths -- --apply --confirm",
  ].join("\n");
}

function createLogger(output) {
  const lines = [];

  return {
    lines,
    log(message = "") {
      lines.push(message);
      output(message);
    },
  };
}

function registerMachineModel(connection) {
  if (connection.models.Machine) {
    return connection.models.Machine;
  }

  return connection.model(
    "Machine",
    new mongoose.Schema({}, { strict: false }),
    "machines"
  );
}

function rewriteServiceLogPath(service) {
  if (
    typeof service.pathToLogs !== "string" ||
    !OLD_LOGS_PREFIX_REGEX.test(service.pathToLogs)
  ) {
    return { ...service };
  }

  return {
    ...service,
    pathToLogs: service.pathToLogs.replace(
      OLD_LOGS_PREFIX_REGEX,
      NEW_LOGS_PREFIX
    ),
  };
}

function getServiceChanges(machine, updatedServices) {
  const services = Array.isArray(machine.servicesArray)
    ? machine.servicesArray
    : [];

  return services
    .map((service, index) => ({
      index,
      before: service.pathToLogs,
      after: updatedServices[index] && updatedServices[index].pathToLogs,
    }))
    .filter(
      (change) =>
        typeof change.before === "string" && change.before !== change.after
    );
}

function writeAuditFile(lines, auditDir, startTime) {
  fs.mkdirSync(auditDir, { recursive: true });

  const auditPath = path.join(
    auditDir,
    `dry-run-${formatTimestampForFile(startTime)}.txt`
  );

  fs.writeFileSync(auditPath, `${lines.join("\n")}\n`, "utf8");

  return auditPath;
}

async function runOnce({
  mongoUri,
  mode = "dry-run",
  output = console.log,
  auditDir = path.resolve(__dirname, "logs"),
  writeAudit = true,
} = {}) {
  if (!mongoUri) {
    output("Missing MONGODB_URI");
    return { exitCode: 1, auditPath: null };
  }

  const startTime = new Date();
  const logger = createLogger(output);
  const isApplyConfirm = mode === "apply-confirm";
  let auditPath = null;
  let connection;

  logger.log("The Server Manager log path migration");
  logger.log(`Mode: ${mode}`);
  logger.log(
    "Rewrite scope: /home/nick/logs/ -> /home/limited_user/logs/"
  );
  logger.log(`Started at: ${startTime.toISOString()}`);

  const stats = {
    machinesScanned: 0,
    machinesMatched: 0,
    machinesAlreadyCorrect: 0,
    servicesMatched: 0,
    writesAttempted: 0,
    writesSucceeded: 0,
    writesFailed: 0,
  };

  try {
    connection = await mongoose.createConnection(mongoUri).asPromise();
    const Machine = registerMachineModel(connection);

    stats.machinesScanned = await Machine.collection.countDocuments({});
    stats.machinesAlreadyCorrect = await Machine.collection.countDocuments(
      CORRECT_LOGS_QUERY
    );

    const machines = await Machine.find(OLD_LOGS_QUERY).lean();
    stats.machinesMatched = machines.length;

    for (const machine of machines) {
      const services = Array.isArray(machine.servicesArray)
        ? machine.servicesArray
        : [];
      const updatedServices = services.map(rewriteServiceLogPath);
      const serviceChanges = getServiceChanges(machine, updatedServices);

      stats.servicesMatched += serviceChanges.length;

      for (const change of serviceChanges) {
        logger.log(
          `${machine.publicId || "[unknown-publicId]"} ${
            machine.machineName || "[unknown-machineName]"
          }  serviceIdx=${change.index}  ${change.before} -> ${change.after}`
        );
      }

      if (isApplyConfirm && serviceChanges.length > 0) {
        stats.writesAttempted += 1;

        try {
          const result = await Machine.collection.updateOne(
            { _id: machine._id },
            { $set: { servicesArray: updatedServices } }
          );

          if (result.acknowledged && result.matchedCount === 1) {
            stats.writesSucceeded += 1;
            logger.log(
              `${machine.publicId || "[unknown-publicId]"} ${
                machine.machineName || "[unknown-machineName]"
              }  write=success`
            );
          } else {
            stats.writesFailed += 1;
            logger.log(
              `${machine.publicId || "[unknown-publicId]"} ${
                machine.machineName || "[unknown-machineName]"
              }  write=failed`
            );
          }
        } catch (error) {
          stats.writesFailed += 1;
          logger.log(
            `${machine.publicId || "[unknown-publicId]"} ${
              machine.machineName || "[unknown-machineName]"
            }  write=failed`
          );
        }
      }
    }

    if (mode === "apply-preview") {
      logger.log(
        "PREVIEW ONLY - re-run with --apply --confirm to write changes"
      );
    }

    const endTime = new Date();
    logger.log(
      [
        "Summary:",
        `mode=${mode}`,
        `machinesScanned=${stats.machinesScanned}`,
        `machinesMatched=${stats.machinesMatched}`,
        `machinesAlreadyCorrect=${stats.machinesAlreadyCorrect}`,
        `servicesMatched=${stats.servicesMatched}`,
        `writesAttempted=${stats.writesAttempted}`,
        `writesSucceeded=${stats.writesSucceeded}`,
        `writesFailed=${stats.writesFailed}`,
        `startedAt=${startTime.toISOString()}`,
        `endedAt=${endTime.toISOString()}`,
      ].join(" ")
    );

    if (writeAudit) {
      auditPath = writeAuditFile(logger.lines, auditDir, startTime);
      output(`Audit file: ${auditPath}`);
    }

    return {
      exitCode: stats.writesFailed > 0 ? 1 : 0,
      auditPath,
      stats,
    };
  } catch (error) {
    logger.log(`Migration failed: ${error.message}`);

    if (writeAudit) {
      auditPath = writeAuditFile(logger.lines, auditDir, startTime);
      output(`Audit file: ${auditPath}`);
    }

    return { exitCode: 1, auditPath, stats };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed.ok) {
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  require("dotenv").config({
    path: path.resolve(__dirname, "..", ".env"),
    quiet: true,
  });

  const result = await runOnce({
    mongoUri: process.env.MONGODB_URI,
    mode: parsed.mode,
  });

  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  getServiceChanges,
  parseArgs,
  rewriteServiceLogPath,
  runOnce,
};

/*
 * Manual rollback (reverses this migration):
 *   Swap both regexes below:
 *     query:          /^\/home\/limited_user\/logs\//
 *     map replacement: /^\/home\/limited_user\/logs\//  ->  "/home/nick/logs/"
 *   Save as scripts/update-logs-paths-rollback.js and run via:
 *     npm run update-logs-paths -- --apply --confirm
 *   (after wiring an equivalent npm script). Do NOT mutate this file in place
 *   to roll back - keep the forward script intact for audit.
 */
