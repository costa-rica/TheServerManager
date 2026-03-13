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

  it("defaults to nick when APP_USER is not set", () => {
    delete process.env.APP_USER;
    const config = loadConfig();
    expect(config.APP_USER).toBe("nick");
  });

  it("derives correct paths for APP_USER=nick", () => {
    process.env.APP_USER = "nick";
    delete process.env.STAGING_DIR;
    const config = loadConfig();

    expect(config.APP_USER).toBe("nick");
    expect(config.APP_USER_HOME).toBe("/home/nick");
    expect(config.APP_USER_GROUP).toBe("nick");
    expect(config.APPLICATIONS_DIR).toBe("/home/nick/applications");
    expect(config.ENVIRONMENTS_DIR).toBe("/home/nick/environments");
    expect(config.STAGING_DIR).toBe(
      "/home/nick/project_resources/TheServerManager/staging"
    );
    expect(config.SYSTEMCTL_CSV_PATH).toBe("/home/nick/nick-systemctl.csv");
  });

  it("derives correct paths for APP_USER=limited_user", () => {
    process.env.APP_USER = "limited_user";
    delete process.env.STAGING_DIR;
    const config = loadConfig();

    expect(config.APP_USER).toBe("limited_user");
    expect(config.APP_USER_HOME).toBe("/home/limited_user");
    expect(config.APP_USER_GROUP).toBe("limited_user");
    expect(config.APPLICATIONS_DIR).toBe("/home/limited_user/applications");
    expect(config.ENVIRONMENTS_DIR).toBe("/home/limited_user/environments");
    expect(config.STAGING_DIR).toBe(
      "/home/limited_user/project_resources/TheServerManager/staging"
    );
    expect(config.SYSTEMCTL_CSV_PATH).toBe(
      "/home/limited_user/limited_user-systemctl.csv"
    );
  });

  it("STAGING_DIR uses env var when set, overriding the derived default", () => {
    process.env.APP_USER = "nick";
    process.env.STAGING_DIR = "/custom/staging/path";
    const config = loadConfig();

    expect(config.STAGING_DIR).toBe("/custom/staging/path");
  });

  it("STAGING_DIR reflects process.env.STAGING_DIR directly, not derived from APP_USER_HOME", () => {
    process.env.APP_USER = "limited_user";
    process.env.STAGING_DIR = "/srv/staging";
    const config = loadConfig();

    expect(config.STAGING_DIR).toBe("/srv/staging");
    expect(config.STAGING_DIR).not.toContain("/home/limited_user");
  });

  it("all exported paths are absolute", () => {
    process.env.APP_USER = "nick";
    delete process.env.STAGING_DIR;
    const config = loadConfig();

    expect(config.APP_USER_HOME.startsWith("/")).toBe(true);
    expect(config.APPLICATIONS_DIR.startsWith("/")).toBe(true);
    expect(config.ENVIRONMENTS_DIR.startsWith("/")).toBe(true);
    expect(config.STAGING_DIR.startsWith("/")).toBe(true);
    expect(config.SYSTEMCTL_CSV_PATH.startsWith("/")).toBe(true);
  });
});
