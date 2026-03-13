import { replaceTemplatePlaceholders, type TemplateVariables } from "../../src/modules/systemd";

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
