import { replaceTemplatePlaceholders, readTemplateFile, generateServiceFile, type TemplateVariables } from "../../src/modules/systemd";
import fs from "fs/promises";
import path from "path";

jest.mock("fs/promises");

const SERVICE_TEMPLATES = [
  "expressjs.service",
  "flask.service",
  "fastapi.service",
  "nextjs.service",
  "pythonscript.service",
  "nodejsscript.service",
];

describe("replaceTemplatePlaceholders", () => {
  it("replaces {{USER_HOME}} correctly", () => {
    const result = replaceTemplatePlaceholders(
      "WorkingDirectory={{USER_HOME}}/applications/MyApp",
      { project_name: "MyApp", user_home: "/home/nick" }
    );
    expect(result).toBe("WorkingDirectory=/home/nick/applications/MyApp");
  });

  it("replaces {{USER}} correctly", () => {
    const result = replaceTemplatePlaceholders("User={{USER}}", {
      project_name: "MyApp",
      user: "nick",
    });
    expect(result).toBe("User=nick");
  });

  it("replaces {{GROUP}} correctly", () => {
    const result = replaceTemplatePlaceholders("Group={{GROUP}}", {
      project_name: "MyApp",
      group: "nick",
    });
    expect(result).toBe("Group=nick");
  });

  it("replaces all new placeholders together in a realistic template string", () => {
    const template = [
      "User={{USER}}",
      "Group={{GROUP}}",
      "WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}",
      "EnvironmentFile={{USER_HOME}}/applications/{{PROJECT_NAME}}/.env",
    ].join("\n");

    const result = replaceTemplatePlaceholders(template, {
      project_name: "MyApp",
      user_home: "/home/limited_user",
      user: "limited_user",
      group: "limited_user",
    });

    expect(result).toContain("User=limited_user");
    expect(result).toContain("Group=limited_user");
    expect(result).toContain(
      "WorkingDirectory=/home/limited_user/applications/MyApp"
    );
    expect(result).toContain(
      "EnvironmentFile=/home/limited_user/applications/MyApp/.env"
    );
    expect(result).not.toContain("{{USER_HOME}}");
    expect(result).not.toContain("{{USER}}");
    expect(result).not.toContain("{{GROUP}}");
  });

  it("leaves placeholders untouched when optional variables are not provided", () => {
    const result = replaceTemplatePlaceholders(
      "User={{USER}}\nGroup={{GROUP}}\nWorkingDirectory={{USER_HOME}}/apps/{{PROJECT_NAME}}",
      { project_name: "MyApp" }
    );
    expect(result).toContain("{{USER}}");
    expect(result).toContain("{{GROUP}}");
    expect(result).toContain("{{USER_HOME}}");
    expect(result).toContain("MyApp");
  });

  it("existing placeholders PROJECT_NAME and PORT still work", () => {
    const result = replaceTemplatePlaceholders(
      "Description={{PROJECT_NAME}} App\nExecStart=node --port {{PORT}} dist/server.js",
      { project_name: "MyApp", port: 3000 }
    );
    expect(result).toBe(
      "Description=MyApp App\nExecStart=node --port 3000 dist/server.js"
    );
  });

  it("replaces multiple occurrences of the same placeholder", () => {
    const result = replaceTemplatePlaceholders(
      "{{USER_HOME}}/applications/App\n{{USER_HOME}}/environments/App",
      { project_name: "App", user_home: "/home/nick" }
    );
    expect(result).toBe(
      "/home/nick/applications/App\n/home/nick/environments/App"
    );
  });
});

describe("readTemplateFile - service templates have no hardcoded paths", () => {
  const mockedFs = jest.mocked(fs);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(SERVICE_TEMPLATES)(
    "%s contains {{USER_HOME}} and not /home/nick",
    async (templateName) => {
      const templatePath = path.resolve(
        __dirname,
        "../../src/templates/systemdServiceFiles",
        templateName
      );
      // Read the actual file from disk (not mocked) to verify template content
      const { readFile } = jest.requireActual<typeof import("fs/promises")>(
        "fs/promises"
      );
      const content = await readFile(templatePath, "utf-8");

      expect(content).toContain("{{USER_HOME}}");
      expect(content).not.toContain("/home/nick");
    }
  );

  it.each(SERVICE_TEMPLATES)(
    "%s contains User={{USER}} and Group={{GROUP}}",
    async (templateName) => {
      const templatePath = path.resolve(
        __dirname,
        "../../src/templates/systemdServiceFiles",
        templateName
      );
      const { readFile } = jest.requireActual<typeof import("fs/promises")>(
        "fs/promises"
      );
      const content = await readFile(templatePath, "utf-8");

      expect(content).toContain("User={{USER}}");
      expect(content).toContain("Group={{GROUP}}");
    }
  );
});

describe("generateServiceFile", () => {
  const mockedFs = jest.mocked(fs);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.writeFile = jest.fn().mockResolvedValue(undefined);
  });

  it("generates a service file with /home/nick paths for APP_USER=nick", async () => {
    const templateName = "expressjs.service";
    const { readFile } = jest.requireActual<typeof import("fs/promises")>(
      "fs/promises"
    );
    mockedFs.readFile = jest
      .fn()
      .mockImplementation((p, enc) => readFile(p as string, enc as "utf-8"));

    const { content } = await generateServiceFile(
      templateName,
      {
        project_name: "MyApp",
        user_home: "/home/nick",
        user: "nick",
        group: "nick",
      },
      "/some/output/dir",
      "myapp.service"
    );

    expect(content).toContain("User=nick");
    expect(content).toContain("Group=nick");
    expect(content).toContain("WorkingDirectory=/home/nick/applications/MyApp");
    expect(content).toContain(
      "EnvironmentFile=/home/nick/applications/MyApp/.env"
    );
    expect(content).not.toContain("{{USER_HOME}}");
    expect(content).not.toContain("{{USER}}");
    expect(content).not.toContain("{{GROUP}}");
  });

  it("generates a service file with /home/limited_user paths for APP_USER=limited_user", async () => {
    const templateName = "expressjs.service";
    const { readFile } = jest.requireActual<typeof import("fs/promises")>(
      "fs/promises"
    );
    mockedFs.readFile = jest
      .fn()
      .mockImplementation((p, enc) => readFile(p as string, enc as "utf-8"));

    const { content } = await generateServiceFile(
      templateName,
      {
        project_name: "MyApp",
        user_home: "/home/limited_user",
        user: "limited_user",
        group: "limited_user",
      },
      "/some/output/dir",
      "myapp.service"
    );

    expect(content).toContain("User=limited_user");
    expect(content).toContain("Group=limited_user");
    expect(content).toContain(
      "WorkingDirectory=/home/limited_user/applications/MyApp"
    );
    expect(content).toContain(
      "EnvironmentFile=/home/limited_user/applications/MyApp/.env"
    );
  });
});
