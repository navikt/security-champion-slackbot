function optional(key: string, defaultValue: any = undefined) {
  return process.env[key] || defaultValue;
}

function required(key: string, defaultValue: any = undefined) {
  const value = optional(key, defaultValue);
  if (!value) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
  return value;
}

function asBool(value: any) {
  return value === true || value === "true";
}

export default {
  TEAMKATALOG_API_URL: required(
    "TEAMKATALOG_API_URL",
    "https://teamkatalog.nais.adeo.no/api"
  ),
  TEAMKATALOG_MRH_SESSION: optional("TEAMKATALOG_MRH_SESSION", ""),
  SLACK_SIGNING_SECRET: required("SLACK_SIGNING_SECRET"),
  SLACK_BOT_TOKEN: required("SLACK_BOT_TOKEN"),
  SECURITY_CHAMPION_CHANNEL: required("SECURITY_CHAMPION_CHANNEL"),
  SECURITY_CHAMPION_ADMIN_CHANNEL: required("SECURITY_CHAMPION_ADMIN_CHANNEL"),
  SECURITY_CHAMPION_SLACK_USERGROUP: required(
    "SECURITY_CHAMPION_SLACK_USERGROUP"
  ),
  GSC_BUCKET_NAME: optional("GSC_BUCKET_NAME"),
  DRY_RUN: asBool(optional("DRY_RUN", false)),
  FORCE_UPDATE: asBool(optional("FORCE_UPDATE", false)),
};
