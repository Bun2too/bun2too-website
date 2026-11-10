import {
  DeploymentConfigError,
  verifyInsightsConnection,
} from "./deploy-config.mjs";
try {
  const count = await verifyInsightsConnection(process.env, fetch, (message) =>
    console.log(message),
  );
  console.log(
    `Insights connection passed: ${count} public articles; article lookup and feed checked where available. No settings were changed.`,
  );
} catch (error) {
  console.error(
    error instanceof DeploymentConfigError
      ? error.message
      : "Insights connection check failed; private provider details withheld",
  );
  process.exitCode = 1;
}
