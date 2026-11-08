import {
  DeploymentConfigError,
  syncNetlifyEnvironment,
  validateDeployment,
} from "./deploy-config.mjs";
try {
  validateDeployment(process.env);
  if (process.argv.includes("--check"))
    console.log(
      "Deployment configuration names, required values, and consistency checks passed. No values were printed.",
    );
  else
    console.log(
      `Configured ${await syncNetlifyEnvironment(process.env)} site environment keys for the production context. Values were not printed.`,
    );
} catch (error) {
  console.error(
    error instanceof DeploymentConfigError
      ? error.message
      : "Deployment configuration failed. Raw provider output was withheld to protect private values.",
  );
  process.exitCode = 1;
}
