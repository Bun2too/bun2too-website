import nodemailer from "nodemailer";
import {
  inquiryEmailConfig,
  inquirySmtpOptions,
} from "../src/lib/support-email.ts";

const config = inquiryEmailConfig();
if (!config) {
  console.error(
    "Inquiry SMTP configuration is incomplete or invalid. Check SUPPORT_SES_SMTP_HOST, SUPPORT_SES_SMTP_PORT, SUPPORT_SES_SMTP_USERNAME, SUPPORT_SES_SMTP_PASSWORD, SUPPORT_INQUIRY_FROM_EMAIL and SUPPORT_INQUIRY_TO_EMAIL. Values withheld.",
  );
  process.exitCode = 1;
} else {
  const transport = nodemailer.createTransport(inquirySmtpOptions(config));
  let timer;
  try {
    await Promise.race([
      transport.verify(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          transport.close();
          reject(new Error("timeout"));
        }, 12000);
      }),
    ]);
    console.log(
      "SMTP connection, TLS and authentication verified. No email was sent; sender/recipient eligibility and inbox delivery are not verified.",
    );
  } catch {
    console.error(
      "SMTP connection or authentication failed. Provider response and credentials withheld. Check region, TLS port, credentials and network access.",
    );
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    transport.close();
  }
}
