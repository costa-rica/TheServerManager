describe("appUser config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadConfig() {
    return require("../../src/config/appUser");
  }

  function setRequiredPrivilegeCsvPath(
    value = "/home/nick/nick-systemctl.csv"
  ) {
    process.env.PATH_AND_NAME_PRIVILIGE_CSV_FILE = value;
  }

  function setRequiredAppUserEnv() {
    process.env.APP_USER = "nick";
    process.env.STAGING_DIR = "/tmp/tsm-test-staging";
  }

  it("throws when PATH_AND_NAME_PRIVILIGE_CSV_FILE is not set", () => {
    setRequiredAppUserEnv();
    delete process.env.PATH_AND_NAME_PRIVILIGE_CSV_FILE;

    expect(() => loadConfig()).toThrow(
      "Missing required environment variable PATH_AND_NAME_PRIVILIGE_CSV_FILE"
    );
  });

  it("throws when APP_USER is not set", () => {
    setRequiredPrivilegeCsvPath();
    process.env.STAGING_DIR = "/tmp/tsm-test-staging";
    delete process.env.APP_USER;

    expect(() => loadConfig()).toThrow(
      "Missing required environment variable APP_USER"
    );
  });

  it("throws when STAGING_DIR is not set", () => {
    setRequiredPrivilegeCsvPath();
    process.env.APP_USER = "nick";
    delete process.env.STAGING_DIR;

    expect(() => loadConfig()).toThrow(
      "Missing required environment variable STAGING_DIR"
    );
  });

  it("derives correct paths for APP_USER=nick", () => {
    setRequiredPrivilegeCsvPath();
    process.env.APP_USER = "nick";
    process.env.STAGING_DIR = "/tmp/tsm-test-staging";
    const config = loadConfig();

    expect(config.APP_USER).toBe("nick");
    expect(config.APP_USER_HOME).toBe("/home/nick");
    expect(config.APP_USER_GROUP).toBe("nick");
    expect(config.APPLICATIONS_DIR).toBe("/home/nick/applications");
    expect(config.ENVIRONMENTS_DIR).toBe("/home/nick/environments");
    expect(config.STAGING_DIR).toBe("/tmp/tsm-test-staging");
    expect(config.SYSTEMCTL_CSV_PATH).toBe("/home/nick/nick-systemctl.csv");
  });

  it("keeps the privilege CSV path independent from APP_USER=limited_user", () => {
    setRequiredPrivilegeCsvPath("/home/nick/nick-systemctl.csv");
    process.env.APP_USER = "limited_user";
    process.env.STAGING_DIR = "/srv/staging";
    const config = loadConfig();

    expect(config.APP_USER).toBe("limited_user");
    expect(config.APP_USER_HOME).toBe("/home/limited_user");
    expect(config.APP_USER_GROUP).toBe("limited_user");
    expect(config.APPLICATIONS_DIR).toBe("/home/limited_user/applications");
    expect(config.ENVIRONMENTS_DIR).toBe("/home/limited_user/environments");
    expect(config.STAGING_DIR).toBe("/srv/staging");
    expect(config.SYSTEMCTL_CSV_PATH).toBe("/home/nick/nick-systemctl.csv");
  });

  it("STAGING_DIR uses env var when set", () => {
    setRequiredPrivilegeCsvPath();
    process.env.APP_USER = "nick";
    process.env.STAGING_DIR = "/custom/staging/path";
    const config = loadConfig();

    expect(config.STAGING_DIR).toBe("/custom/staging/path");
  });

  it("STAGING_DIR reflects process.env.STAGING_DIR directly, not derived from APP_USER_HOME", () => {
    setRequiredPrivilegeCsvPath();
    process.env.APP_USER = "limited_user";
    process.env.STAGING_DIR = "/srv/staging";
    const config = loadConfig();

    expect(config.STAGING_DIR).toBe("/srv/staging");
    expect(config.STAGING_DIR).not.toContain("/home/limited_user");
  });

  it("all exported paths are absolute", () => {
    setRequiredPrivilegeCsvPath();
    process.env.APP_USER = "nick";
    process.env.STAGING_DIR = "/tmp/tsm-test-staging";
    const config = loadConfig();

    expect(config.APP_USER_HOME.startsWith("/")).toBe(true);
    expect(config.APPLICATIONS_DIR.startsWith("/")).toBe(true);
    expect(config.ENVIRONMENTS_DIR.startsWith("/")).toBe(true);
    expect(config.STAGING_DIR.startsWith("/")).toBe(true);
    expect(config.SYSTEMCTL_CSV_PATH.startsWith("/")).toBe(true);
  });
});
