import path from "path";

function requireEnvVar(varName: string) {
  const value = process.env[varName];

  if (!value) {
    throw new Error(`Missing required environment variable ${varName}`);
  }

  return value;
}

const APP_USER = requireEnvVar("APP_USER");
const APP_USER_HOME = path.join("/home", APP_USER);
const APP_USER_GROUP = APP_USER;
const APPLICATIONS_DIR = path.join(APP_USER_HOME, "applications");
const ENVIRONMENTS_DIR = path.join(APP_USER_HOME, "environments");
const STAGING_DIR = requireEnvVar("STAGING_DIR");
const SYSTEMCTL_CSV_PATH = requireEnvVar("PATH_AND_NAME_PRIVILIGE_CSV_FILE");

export {
  APP_USER,
  APP_USER_HOME,
  APP_USER_GROUP,
  APPLICATIONS_DIR,
  ENVIRONMENTS_DIR,
  STAGING_DIR,
  SYSTEMCTL_CSV_PATH,
};
