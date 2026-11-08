import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { askOnyx, publicSources } from "../src/lib/onyx";
import {
  consumeLimit,
  DAY,
  ownedConversation,
  parseChat,
  parseInquiry,
  saveInquiry,
  SUPPORT_COOKIE,
  visitor,
  type SupportStore,
} from "../src/lib/support";
import { RequestError } from "../src/lib/consent";
function memory() {
  const entries = new Map<string, { data: unknown; etag: string }>();
  let sequence = 0;
  const store: SupportStore = {
    read: async <T>(key: string) =>
      (entries.get(key) as { data: T; etag: string }) || null,
    write: async (key, data, condition) => {
      const old = entries.get(key);
      if (
        (condition?.onlyIfNew && old) ||
        (condition?.onlyIfMatch && condition.onlyIfMatch !== old?.etag)
      )
        return { modified: false };
      const etag = `etag-${++sequence}`;
      entries.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
    remove: async (key) => {
      entries.delete(key);
    },
  };
  return { store, entries };
}
test("support cookies are signed, expire, and cannot be forged into another visitor", () => {
  const secret = "test-only-session-secret-32-characters-minimum";
  const now = 10000000;
  const first = visitor(new Request("https://bun2too.com"), secret, now);
  const follow = visitor(
    new Request("https://bun2too.com", {
      headers: { cookie: `${SUPPORT_COOKIE}=${first.value}` },
    }),
    secret,
    now + 1,
  );
  assert.equal(follow.owner, first.owner);
  assert.equal(follow.fresh, false);
  const forged = visitor(
    new Request("https://bun2too.com", {
      headers: { cookie: `${SUPPORT_COOKIE}=${first.value.slice(0, -1)}x` },
    }),
    secret,
    now + 1,
  );
  assert.notEqual(forged.owner, first.owner);
  assert.equal(forged.fresh, true);
  const expired = visitor(
    new Request("https://bun2too.com", {
      headers: { cookie: `${SUPPORT_COOKIE}=${first.value}` },
    }),
    secret,
    now + DAY + 1,
  );
  assert.notEqual(expired.owner, first.owner);
});
test("support inputs require consent, bounded text, and app-owned identifiers", () => {
  assert.throws(
    () => parseChat({ message: "Hello", consent: false }),
    RequestError,
  );
  assert.throws(
    () => parseChat({ message: "x".repeat(2001), consent: true }),
    RequestError,
  );
  assert.throws(
    () =>
      parseChat({
        message: "Hello",
        consent: true,
        conversationId: "../../other-user",
      }),
    RequestError,
  );
  const input = parseChat({
    message: " Hello ",
    consent: true,
    persona_id: 0,
    chat_session_id: randomUUID(),
    allowed_tool_ids: [999],
  });
  assert.deepEqual(input, {
    message: "Hello",
    conversationId: null,
    captchaToken: "",
  });
  assert.throws(() => parseInquiry({ consent: false }), RequestError);
});
test("another visitor cannot read or attach a conversation, including expired sessions", async () => {
  const { store } = memory();
  const id = randomUUID();
  await store.write(`conversations/${id}`, {
    owner: "owner-one",
    onyxSession: randomUUID(),
    messages: [],
    expiresAt: 2000,
  });
  await assert.rejects(
    ownedConversation(store, id, "owner-two", 1000),
    (error) => error instanceof RequestError && error.status === 404,
  );
  await assert.rejects(
    ownedConversation(store, id, "owner-one", 3000),
    RequestError,
  );
  assert.equal(
    (await ownedConversation(store, id, "owner-one", 1000)).data.owner,
    "owner-one",
  );
});
test("distributed limits use conditional writes and reject requests over the budget", async () => {
  const { store } = memory();
  await consumeLimit(store, "visitor", 2, 60000, 1000);
  await consumeLimit(store, "visitor", 2, 60000, 1000);
  await assert.rejects(
    consumeLimit(store, "visitor", 2, 60000, 1000),
    (error) => error instanceof RequestError && error.status === 429,
  );
  await consumeLimit(store, "visitor", 2, 60000, 61000);
});
test("private inquiries persist contact consent, exclude chats by default, and are idempotent", async () => {
  const { store, entries } = memory();
  const now = Date.parse("2026-11-07T12:00:00Z");
  const input = parseInquiry({
    name: "Customer",
    email: "Person@Example.com",
    topic: "project",
    message: "Help us connect our customer data.",
    consent: true,
    requestId: randomUUID(),
    transcript: ["client-injected content"],
  })!;
  const first = await saveInquiry(store, "owner", input, now);
  const second = await saveInquiry(store, "owner", input, now);
  assert.equal(first, second);
  assert.equal(entries.size, 1);
  const record = [...entries.values()][0].data as Record<string, unknown>;
  assert.equal(record.email, "person@example.com");
  assert.deepEqual(record.transcript, []);
  assert.equal(record.expiresAt, now + 90 * DAY);
  assert.equal("marketing" in record, false);
  assert.equal(
    (record.consent as { purpose: string }).purpose,
    "respond-to-inquiry",
  );
});
test("transcript attachment uses server-owned content only after explicit consent", async () => {
  const { store, entries } = memory();
  const id = randomUUID();
  await store.write(`conversations/${id}`, {
    owner: "one",
    onyxSession: randomUUID(),
    messages: [{ role: "user", content: "Original question" }],
    expiresAt: 2000,
  });
  const inquiry = parseInquiry({
    name: "Person",
    email: "person@example.com",
    topic: "account",
    message: "Please help with this question.",
    requestId: randomUUID(),
    consent: true,
    conversationId: id,
    includeTranscript: true,
  })!;
  await assert.rejects(
    saveInquiry(store, "other", inquiry, 1000),
    RequestError,
  );
  await saveInquiry(store, "one", inquiry, 1000);
  const record = entries.get(`inquiries/one/${inquiry.requestId}`)!.data as {
    transcript: unknown[];
  };
  assert.deepEqual(record.transcript, [
    { role: "user", content: "Original question" },
  ]);
});
test("citations expose only cited, public, safe URLs and never document metadata", () => {
  const data = {
    top_documents: [
      {
        document_id: "public",
        semantic_identifier: "Customer technology",
        link: "https://bun2too.com/services",
        primary_owners: ["private@example.com"],
      },
      {
        document_id: "private",
        link: "https://support.example.invalid/document/internal",
      },
      { document_id: "script", link: "javascript:alert(1)" },
      {
        document_id: "hidden",
        link: "https://bun2too.com/secret",
        hidden: true,
      },
    ],
    citation_info: [
      { document_id: "public", citation_number: 1 },
      { document_id: "private", citation_number: 2 },
      { document_id: "script", citation_number: 3 },
      { document_id: "hidden", citation_number: 4 },
    ],
  };
  assert.deepEqual(publicSources(data), [
    {
      title: "Customer technology",
      url: "https://bun2too.com/services",
      number: 1,
    },
  ]);
});
test("Onyx request forces the configured public RAG agent and search tool", async () => {
  const names = [
    "ONYX_API_KEY",
    "ONYX_PUBLIC_AGENT_ID",
    "ONYX_SEARCH_TOOL_ID",
    "ONYX_PUBLIC_DOCUMENT_SET",
    "ONYX_API_BASE_URL",
  ];
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  const sessionId = randomUUID();
  Object.assign(process.env, {
    ONYX_API_KEY: "test-only-key",
    ONYX_PUBLIC_AGENT_ID: "12",
    ONYX_SEARCH_TOOL_ID: "4",
    ONYX_PUBLIC_DOCUMENT_SET: "Bun2Too public support",
    ONYX_API_BASE_URL: "https://support.example.invalid/api",
  });
  try {
    const bodies: Record<string, unknown>[] = [];
    const fetcher: typeof fetch = async (url, options) => {
      assert.equal(
        url,
        "https://support.example.invalid/api/chat/send-chat-message",
      );
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        "Bearer test-only-key",
      );
      bodies.push(JSON.parse(String(options?.body)));
      return Response.json({
        answer: "A sourced answer [1]",
        answer_citationless: "A sourced answer",
        chat_session_id: sessionId,
        top_documents: [
          {
            document_id: "doc",
            link: "https://bun2too.com/services",
            semantic_identifier: "Services",
          },
        ],
        citation_info: [{ document_id: "doc", citation_number: 1 }],
        pre_answer_reasoning: "Never send reasoning to the browser",
      });
    };
    const result = await askOnyx("How can you help?", null, fetcher);
    assert.deepEqual(bodies[0].chat_session_info, {
      persona_id: 12,
      description: "Bun2Too website support",
      incognito: false,
    });
    assert.deepEqual(bodies[0].allowed_tool_ids, [4]);
    assert.equal(bodies[0].forced_tool_id, 4);
    assert.deepEqual(bodies[0].internal_search_filters, {
      document_set: ["Bun2Too public support"],
    });
    assert.equal(bodies[0].stream, false);
    assert.equal(result.answer, "A sourced answer");
    assert.equal("pre_answer_reasoning" in result, false);
    await askOnyx("Follow-up question", sessionId, fetcher);
    assert.equal(bodies[1].chat_session_id, sessionId);
    assert.equal("chat_session_info" in bodies[1], false);
    await assert.rejects(
      askOnyx(
        "Question",
        null,
        async () => new Response("private upstream details", { status: 500 }),
      ),
      (error) =>
        error instanceof RequestError &&
        !error.message.includes("private upstream"),
    );
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
