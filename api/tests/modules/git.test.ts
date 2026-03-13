jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

describe("git module uses config-derived applications path", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses /home/nick/applications when APP_USER=nick", async () => {
    process.env.APP_USER = "nick";

    // Re-acquire the fresh mock after resetModules, then set up implementation
    const childProcess = require("child_process");
    childProcess.exec.mockImplementation((_cmd: string, callback: Function) => {
      callback(null, "main\n", "");
      return {} as any;
    });

    const { executeGitCommand } = require("../../src/modules/git");
    await executeGitCommand("MyApp", "branch");

    expect(childProcess.exec).toHaveBeenCalledWith(
      expect.stringContaining("/home/nick/applications/MyApp"),
      expect.any(Function)
    );
  });

  it("uses /home/limited_user/applications when APP_USER=limited_user", async () => {
    process.env.APP_USER = "limited_user";

    const childProcess = require("child_process");
    childProcess.exec.mockImplementation((_cmd: string, callback: Function) => {
      callback(null, "main\n", "");
      return {} as any;
    });

    const { executeGitCommand } = require("../../src/modules/git");
    await executeGitCommand("MyApp", "branch");

    expect(childProcess.exec).toHaveBeenCalledWith(
      expect.stringContaining("/home/limited_user/applications/MyApp"),
      expect.any(Function)
    );
  });
});
