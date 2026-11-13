import {
  verifyContentfulConnection,
  DeploymentConfigError,
} from "./deploy-config.mjs";
try {
  const count = await verifyContentfulConnection({
    ...process.env,
    CONTENTFUL_ENABLED: "true",
  });
  console.log(
    `Verified Contentful published website content (${count} pages); credentials and provider bodies withheld.`,
  );
} catch (error) {
  console.error(
    error instanceof DeploymentConfigError
      ? error.message
      : "Contentful verification failed; raw provider output withheld.",
  );
  process.exitCode = 1;
}
