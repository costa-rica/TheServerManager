import {
  replaceTemplatePlaceholders,
  readTemplateFile,
  generateServiceFile,
  resolveSubprojectPath,
  validateSubprojectName,
  type TemplateVariables,
} from "../../src/modules/systemd";
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

  it("replaces {{SUBPROJECT_PATH}} with a subdirectory when provided", () => {
    const result = replaceTemplatePlaceholders(
      "WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}{{SUBPROJECT_PATH}}",
      {
        project_name: "MyApp",
        user_home: "/home/limited_user",
        subproject_path: "/api",
      }
    );

    expect(result).toBe(
      "WorkingDirectory=/home/limited_user/applications/MyApp/api"
    );
  });

  it("replaces {{SUBPROJECT_PATH}} with an empty string when omitted", () => {
    const result = replaceTemplatePlaceholders(
      "WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}{{SUBPROJECT_PATH}}",
      {
        project_name: "MyApp",
        user_home: "/home/limited_user",
        subproject_path: "",
      }
    );

    expect(result).toBe(
      "WorkingDirectory=/home/limited_user/applications/MyApp"
    );
    expect(result).not.toContain("//");
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
      expect(content).toContain("{{SUBPROJECT_PATH}}");
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
        subproject_path: "",
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
    expect(content).not.toContain("{{SUBPROJECT_PATH}}");
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
        subproject_path: "",
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
    expect(content).not.toContain("{{SUBPROJECT_PATH}}");
    expect(content).not.toContain("//.env");
  });
});

describe("service filename with subproject suffix", () => {
  // This mirrors the filename construction logic in api/src/routes/services.ts
  function buildServiceFilename(
    projectName: string,
    subproject?: string
  ): string {
    const project_name_lowercase = projectName.toLowerCase();
    const trimmedSubproject = subproject?.trim();
    const subprojectSuffix = trimmedSubproject
      ? `-${trimmedSubproject.toLowerCase()}`
      : "";
    return `${project_name_lowercase}${subprojectSuffix}.service`;
  }

  function buildTimerFilename(
    projectName: string,
    subproject?: string
  ): string {
    const project_name_lowercase = projectName.toLowerCase();
    const trimmedSubproject = subproject?.trim();
    const subprojectSuffix = trimmedSubproject
      ? `-${trimmedSubproject.toLowerCase()}`
      : "";
    return `${project_name_lowercase}${subprojectSuffix}.timer`;
  }

  it("includes lowercased subproject in service filename", () => {
    expect(buildServiceFilename("MyProject", "api")).toBe(
      "myproject-api.service"
    );
  });

  it("includes lowercased subproject in timer filename", () => {
    expect(buildTimerFilename("MyProject", "api")).toBe("myproject-api.timer");
  });

  it("lowercases mixed-case subproject in filename", () => {
    expect(buildServiceFilename("MyProject", "Api")).toBe(
      "myproject-api.service"
    );
  });

  it("preserves hyphens in subproject name", () => {
    expect(buildServiceFilename("MyProject", "jobs-runner")).toBe(
      "myproject-jobs-runner.service"
    );
  });

  it("preserves underscores in subproject name", () => {
    expect(buildServiceFilename("MyProject", "worker_01")).toBe(
      "myproject-worker_01.service"
    );
  });

  it("produces original filename when subproject is omitted", () => {
    expect(buildServiceFilename("MyProject")).toBe("myproject.service");
    expect(buildTimerFilename("MyProject")).toBe("myproject.timer");
  });

  it("produces original filename when subproject is empty string", () => {
    expect(buildServiceFilename("MyProject", "")).toBe("myproject.service");
    expect(buildTimerFilename("MyProject", "")).toBe("myproject.timer");
  });
});

describe("subproject helpers", () => {
  it("resolves a valid subproject to a prefixed path segment", () => {
    expect(resolveSubprojectPath("api")).toBe("/api");
  });

  it("resolves an omitted subproject to an empty path segment", () => {
    expect(resolveSubprojectPath(undefined)).toBe("");
  });

  it.each([
    "../etc",
    "/api",
    "api/",
    ".",
    "..",
    "api/web",
    " api",
    "api ",
    "worker.job",
  ])("rejects invalid subproject value %s", (subproject) => {
    expect(validateSubprojectName(subproject)).not.toBeNull();
  });

  it.each(["api", "web", "worker_01", "jobs-runner"])(
    "accepts valid subproject value %s",
    (subproject) => {
      expect(validateSubprojectName(subproject)).toBeNull();
    }
  );
});
