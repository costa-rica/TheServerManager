jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

describe("npm module uses config-derived applications path", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("npmInstall uses /home/nick/applications when APP_USER=nick", async () => {
    process.env.APP_USER = "nick";

    // npm.ts calls execAsync(command, { maxBuffer }) so exec receives (cmd, options, callback)
    const childProcess = require("child_process");
    childProcess.exec.mockImplementation(
      (_cmd: string, _opts: object, callback: Function) => {
        callback(null, "", "");
        return {} as any;
      }
    );

    const { npmInstall } = require("../../src/modules/npm");
    await npmInstall("MyApp");

    expect(childProcess.exec).toHaveBeenCalledWith(
      expect.stringContaining("/home/nick/applications/MyApp"),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("npmInstall uses /home/limited_user/applications when APP_USER=limited_user", async () => {
    process.env.APP_USER = "limited_user";

    const childProcess = require("child_process");
    childProcess.exec.mockImplementation(
      (_cmd: string, _opts: object, callback: Function) => {
        callback(null, "", "");
        return {} as any;
      }
    );

    const { npmInstall } = require("../../src/modules/npm");
    await npmInstall("MyApp");

    expect(childProcess.exec).toHaveBeenCalledWith(
      expect.stringContaining("/home/limited_user/applications/MyApp"),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("npmBuild uses /home/nick/applications when APP_USER=nick", async () => {
    process.env.APP_USER = "nick";

    const childProcess = require("child_process");
    childProcess.exec.mockImplementation(
      (_cmd: string, _opts: object, callback: Function) => {
        callback(null, "", "");
        return {} as any;
      }
    );

    const { npmBuild } = require("../../src/modules/npm");
    await npmBuild("MyApp");

    expect(childProcess.exec).toHaveBeenCalledWith(
      expect.stringContaining("/home/nick/applications/MyApp"),
      expect.any(Object),
      expect.any(Function)
    );
  });
});
