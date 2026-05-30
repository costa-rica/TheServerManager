describe("logger config startup validation", () => {
  const originalEnv = process.env;
  const originalExit = process.exit;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exit = originalExit;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadLogger() {
    return require("../../src/config/logger");
  }

  it("logs missing required env vars and exits before startup continues", () => {
    process.env.NODE_ENV = "test";
    process.env.NAME_APP = "TestServerManagerAPI";
    process.env.PATH_TO_LOGS = "/tmp/tsm-test-logs";
    process.env.PATH_AND_NAME_PRIVILIGE_CSV_FILE =
      "/home/nick/nick-systemctl.csv";
    delete process.env.APP_USER;
    delete process.env.STAGING_DIR;
    delete process.env.PATH_PROJECT_RESOURCES;

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exit = jest
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit:${code}`);
      });

    expect(() => loadLogger()).toThrow("process.exit:1");
    expect(consoleError).toHaveBeenCalledWith(
      "[FATAL ERROR] Missing required environment variable(s): APP_USER, STAGING_DIR, PATH_PROJECT_RESOURCES"
    );
    expect(exit).toHaveBeenCalledWith(1);
  });
});
