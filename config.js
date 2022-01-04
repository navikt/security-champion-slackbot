function optional(key, defaultValue = undefined) {
  return process.env[key] || defaultValue;
}

function required(key, defaultValue = undefined) {
  const value = optional(key, defaultValue);
  if (!value) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
  return value;
}

module.exports = {
  TEAMKATALOG_API_URL: required(
    "TEAMKATALOG_API_URL",
    "https://teamkatalog.nais.adeo.no/api"
  ),
  TEAMKATALOG_MRH_SESSION: optional("TEAMKATALOG_MRH_SESSION", ""),
  SLACK_SIGNING_SECRET: required("SLACK_SIGNING_SECRET"),
  SLACK_BOT_TOKEN: required("SLACK_BOT_TOKEN"),
};
