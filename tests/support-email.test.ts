import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import {
  inquiryEmailConfig,
  inquirySmtpOptions,
  notifyInquiry,
  acknowledgeInquiry,
} from "../src/lib/support-email";
import {
  parseInquiry,
  saveInquiry,
  type SupportStore,
} from "../src/lib/support";

const env = {
  SUPPORT_SES_SMTP_HOST: "smtp.example.invalid",
  SUPPORT_SES_SMTP_PORT: "587",
  SUPPORT_SES_SMTP_USERNAME: "fixture-smtp-user",
  SUPPORT_SES_SMTP_PASSWORD: "fixture-smtp-password",
  SUPPORT_INQUIRY_FROM_EMAIL: "sender@example.com",
  SUPPORT_INQUIRY_TO_EMAIL: "manager@example.com",
};
const config = inquiryEmailConfig(env)!;
function memory() {
  const records = new Map<string, { data: unknown; etag: string }>();
  let sequence = 0;
  const store: SupportStore = {
    read: async <T>(key: string) =>
      structuredClone((records.get(key) as { data: T; etag: string }) || null),
    write: async (key, data, condition) => {
      const old = records.get(key);
      if (
        (condition?.onlyIfNew && old) ||
        (condition?.onlyIfMatch && condition.onlyIfMatch !== old?.etag)
      )
        return { modified: false };
      const etag = String(++sequence);
      records.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
    remove: async (key) => {
      records.delete(key);
    },
  };
  return { store, records };
}
async function fixture() {
  const setup = memory();
  const input = parseInquiry({
    name: "A customer",
    email: "visitor@example.com",
    topic: "project",
    message: "Please help with our customer data project.",
    consent: true,
    requestId: randomUUID(),
    to: "attacker@example.com",
    transcript: ["not an inquiry"],
  })!;
  const reference = await saveInquiry(setup.store, "fixture-owner", input);
  return {
    ...setup,
    input,
    reference,
    notify: (send?: Parameters<typeof notifyInquiry>[5]) =>
      notifyInquiry(
        setup.store,
        "fixture-owner",
        input.requestId,
        config,
        new AbortController().signal,
        send,
      ),
  };
}

test("SMTP requires explicit configuration and TLS on every supported port", () => {
  assert.equal(inquiryEmailConfig({}), null);
  assert.deepEqual(
    inquiryEmailConfig(
      Object.fromEntries(
        Object.entries(env).map(([key, value]) => [
          key.replace("SUPPORT_SES_SMTP_", "SUPPORT_SENDER_SMTP_"),
          value,
        ]),
      ),
    ),
    config,
  );
  assert.equal(
    inquiryEmailConfig({ ...env, SUPPORT_SES_SMTP_PASSWORD: "" }),
    null,
  );
  assert.equal(
    inquiryEmailConfig({
      ...env,
      SUPPORT_INQUIRY_TO_EMAIL: "manager@example.com\r\nBcc: other@example.com",
    }),
    null,
  );
  assert.equal(
    inquiryEmailConfig({
      ...env,
      SUPPORT_SES_SMTP_HOST: "https://smtp.example.invalid/",
    }),
    null,
  );
  assert.equal(
    inquiryEmailConfig({ ...env, SUPPORT_SES_SMTP_PORT: "80" }),
    null,
  );
  for (const port of [25, 465, 587, 2465, 2587]) {
    const options = inquirySmtpOptions({ ...config, port });
    assert.equal(options.secure, [465, 2465].includes(port));
    assert.equal(options.requireTLS, true);
    assert.equal(options.tls?.rejectUnauthorized, true);
    assert.equal(options.disableFileAccess, true);
    assert.equal(options.disableUrlAccess, true);
    assert.equal(options.debug, false);
  }
});

test("requester acknowledgment is generic, independent, and sent only once", async () => {
  const setup = await fixture();
  let sends = 0;
  const send = async (message: {
    to?: unknown;
    text?: unknown;
    replyTo?: unknown;
  }) => {
    sends++;
    assert.equal(message.to, setup.input.email);
    assert.equal(message.replyTo, config.from);
    assert.match(String(message.text), new RegExp(setup.reference));
    assert.doesNotMatch(
      String(message.text),
      /customer data project|A customer|manager@example|fixture-smtp-password/,
    );
  };
  for (let attempt = 0; attempt < 2; attempt++)
    assert.equal(
      await acknowledgeInquiry(
        setup.store,
        "fixture-owner",
        setup.input.requestId,
        config,
        new AbortController().signal,
        send,
      ),
      "accepted",
    );
  assert.equal(sends, 1);
});

test("notification sends only saved inquiry fields to the fixed manager with visitor Reply-To", async (context) => {
  const setup = await fixture();
  let sent = 0;
  let closed = 0;
  context.mock.method(nodemailer, "createTransport", (options) => {
    assert.equal(options.host, config.host);
    assert.equal(options.requireTLS, true);
    return {
      sendMail: async (message: Record<string, unknown>) => {
        sent++;
        assert.equal(message.from, config.from);
        assert.equal(message.to, config.to);
        assert.equal(message.replyTo, setup.input.email);
        assert.match(
          String(message.text),
          /Please help with our customer data project/,
        );
        assert.match(String(message.text), new RegExp(setup.reference));
        assert.doesNotMatch(
          String(message.text),
          /attacker|transcript|not an inquiry|fixture-smtp-password/,
        );
        assert.equal((message.signal as AbortSignal).aborted, false);
        return { accepted: [config.to], messageId: "fixture-message-id" };
      },
      close: () => {
        closed++;
      },
    };
  });
  assert.equal(await setup.notify(), "accepted");
  assert.equal(await setup.notify(), "accepted");
  assert.equal(sent, 1);
  assert.equal(closed, 1);
});

test("concurrent retries claim one notification and never resend uncertain acceptance", async () => {
  const setup = await fixture();
  let sends = 0;
  let started!: () => void;
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const sending = new Promise<void>((resolve) => {
    started = resolve;
  });
  const send = async () => {
    sends++;
    started();
    await pending;
  };
  const first = setup.notify(send);
  await sending;
  assert.equal(await setup.notify(send), "unconfirmed");
  finish();
  assert.equal(await first, "accepted");
  assert.equal(await setup.notify(send), "accepted");
  assert.equal(sends, 1);
  const other = await notifyInquiry(
    setup.store,
    "another-owner",
    setup.input.requestId,
    config,
    new AbortController().signal,
    send,
  );
  assert.equal(other, "unconfirmed");
  assert.equal(sends, 1);
});

test("failed SMTP acceptance retains the inquiry, withholds provider details, and blocks blind resend", async (context) => {
  const setup = await fixture();
  const logs: unknown[][] = [];
  context.mock.method(console, "error", (...args) => logs.push(args));
  let sends = 0;
  const fail = async () => {
    sends++;
    throw new Error("provider-private-response-and-secret");
  };
  assert.equal(await setup.notify(fail), "unconfirmed");
  assert.equal(await setup.notify(fail), "unconfirmed");
  assert.equal(sends, 1);
  const saved = await setup.store.read<{ reference: string; message: string }>(
    `inquiries/fixture-owner/${setup.input.requestId}`,
  );
  assert.equal(saved?.data.reference, setup.reference);
  assert.equal(saved?.data.message, setup.input.message);
  assert.doesNotMatch(
    JSON.stringify(logs),
    /provider-private-response-and-secret/,
  );
});
