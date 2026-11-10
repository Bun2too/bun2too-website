import {
  DeploymentConfigError,
  syncNetlifyEnvironment,
  validateDeployment,
  verifyAuth0Connection,
  inspectNetlifySite,
  verifyInsightsConnection,
} from "./deploy-config.mjs";
try {
  if (process.argv.includes("--inspect-site")) {
    await inspectNetlifySite(process.env, fetch, (message) =>
      console.log(message),
    );
    console.log(
      "Read-only Netlify inspection passed. No settings were written and no deployment was created.",
    );
  } else {
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
        `Insights public API connection verified (${await verifyInsightsConnection(process.env, fetch, (message) => console.log(message))} articles; article lookup and feed checked where available).`,
      );
      console.log(
        `Configured ${await syncNetlifyEnvironment(process.env, fetch, (message) => console.log(message))} site environment keys for the production context. Credentials and setting values were withheld; only public hostname diagnostics were printed.`,
      );
    }
  }
} catch (error) {
  console.error(
    error instanceof DeploymentConfigError
      ? error.message
      : "Deployment configuration failed. Raw provider output was withheld to protect private values.",
  );
  process.exitCode = 1;
}
