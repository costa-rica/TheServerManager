const {
  getServiceChanges,
  parseArgs,
  rewriteServiceLogPath,
} = require("../../scripts/update-logs-paths");

describe("update-logs-paths migration script", () => {
  it("rejects conflicting apply and dry-run flags before connection work", () => {
    expect(parseArgs(["--apply", "--dry-run"])).toEqual({
      ok: false,
      message: "--apply and --dry-run cannot be used together",
    });
  });

  it("preserves every service field while rewriting only the old log prefix", () => {
    const service = {
      name: "api",
      filename: "api.service",
      filenameTimer: "api.timer",
      workingDirectory: "/srv/api",
      port: 3000,
      pathToLogs: "/home/nick/logs/api.log",
      customNote: "preserve-me",
    };

    expect(rewriteServiceLogPath(service)).toEqual({
      ...service,
      pathToLogs: "/home/limited_user/logs/api.log",
    });
  });

  it("does not rewrite already-correct paths or embedded old prefixes", () => {
    const alreadyCorrect = {
      filename: "web.service",
      pathToLogs: "/home/limited_user/logs/web.log",
    };
    const embeddedOldPrefix = {
      filename: "worker.service",
      pathToLogs: "/tmp/archive/home/nick/logs/worker.log",
    };

    expect(rewriteServiceLogPath(alreadyCorrect)).toEqual(alreadyCorrect);
    expect(rewriteServiceLogPath(embeddedOldPrefix)).toEqual(embeddedOldPrefix);
  });

  it("reports only services whose paths changed", () => {
    const machine = {
      servicesArray: [
        { pathToLogs: "/home/nick/logs/api.log" },
        { pathToLogs: "/home/limited_user/logs/web.log" },
      ],
    };
    const updatedServices = machine.servicesArray.map(rewriteServiceLogPath);

    expect(getServiceChanges(machine, updatedServices)).toEqual([
      {
        index: 0,
        before: "/home/nick/logs/api.log",
        after: "/home/limited_user/logs/api.log",
      },
    ]);
  });
});
