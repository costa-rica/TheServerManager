import path from "path";

const APP_USER = process.env.APP_USER || "nick";
const APP_USER_HOME = path.join("/home", APP_USER);
const APP_USER_GROUP = APP_USER;
const APPLICATIONS_DIR = path.join(APP_USER_HOME, "applications");
const ENVIRONMENTS_DIR = path.join(APP_USER_HOME, "environments");
const STAGING_DIR =
  process.env.STAGING_DIR ||
  path.join(APP_USER_HOME, "project_resources", "TheServerManager", "staging");
const SYSTEMCTL_CSV_PATH = process.env.PATH_AND_NAME_PRIVILIGE_CSV_FILE;

if (!SYSTEMCTL_CSV_PATH) {
  throw new Error(
    "Missing required environment variable PATH_AND_NAME_PRIVILIGE_CSV_FILE"
  );
}

export {
  APP_USER,
  APP_USER_HOME,
  APP_USER_GROUP,
  APPLICATIONS_DIR,
  ENVIRONMENTS_DIR,
  STAGING_DIR,
  SYSTEMCTL_CSV_PATH,
};
