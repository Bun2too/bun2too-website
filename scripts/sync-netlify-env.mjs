import {
  DeploymentConfigError,
  syncNetlifyEnvironment,
  validateDeployment,
  verifyAuth0Connection,
} from "./deploy-config.mjs";
try {
  validateDeployment(process.env);
  if (process.argv.includes("--check"))
    console.log(
      "Deployment configuration names, required values, and consistency checks passed. No values were printed.",
    );
  else {
    console.log(
      "Configuration consistency passed. Checking Auth0 Management connectivity without creating users or sending email.",
    );
    await verifyAuth0Connection(process.env);
    console.log("Auth0 Management credentials and required scopes verified.");
    console.log(
      `Configured ${await syncNetlifyEnvironment(process.env, fetch, (message) => console.log(message))} site environment keys for the production context. Values were not printed.`,
    );
  }
} catch (error) {
  console.error(
    error instanceof DeploymentConfigError
      ? error.message
      : "Deployment configuration failed. Raw provider output was withheld to protect private values.",
  );
  process.exitCode = 1;
}
