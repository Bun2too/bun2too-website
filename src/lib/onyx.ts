import { object, RequestError } from "./consent";
import { uuid, type SupportSource } from "./support";
export function onyxConfig() {
  const key = process.env.ONYX_API_KEY;
  const agent = Number(process.env.ONYX_PUBLIC_AGENT_ID);
  const tool = Number(process.env.ONYX_SEARCH_TOOL_ID);
  const documentSet = process.env.ONYX_PUBLIC_DOCUMENT_SET?.trim();
  let base: URL;
  try {
    base = new URL(process.env.ONYX_API_BASE_URL || "");
  } catch {
    throw new RequestError(503, "The support assistant is being connected.");
  }
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new RequestError(503, "The support assistant is being connected.");
  if (
    !key ||
    !Number.isInteger(agent) ||
    agent < 1 ||
    !process.env.ONYX_SEARCH_TOOL_ID ||
    !Number.isInteger(tool) ||
    tool < 0 ||
    !documentSet
  )
    throw new RequestError(
      503,
      "The support assistant is being connected. You can still send a private inquiry.",
    );
  return { key, agent, tool, documentSet, base: base.href.replace(/\/$/, "") };
}
export function publicSources(data: unknown): SupportSource[] {
  const response = object(data);
  const hosts = new Set(
    (
      process.env.SUPPORT_SOURCE_HOSTS ||
      "bun2too.com,www.bun2too.com,insights.bun2too.com"
    )
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const documents = Array.isArray(response.top_documents)
    ? response.top_documents.map(object)
    : [];
  const citations = Array.isArray(response.citation_info)
    ? response.citation_info.map(object)
    : [];
  const sources: SupportSource[] = [];
  const seen = new Set<string>();
  for (const citation of citations) {
    const doc = documents.find(
      (item) => item.document_id === citation.document_id,
    );
    if (
      !doc ||
      doc.hidden === true ||
      doc.is_relevant === false ||
      typeof doc.link !== "string"
    )
      continue;
    try {
      const url = new URL(doc.link);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        !hosts.has(url.hostname.toLowerCase()) ||
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/account") ||
        seen.has(url.href)
      )
        continue;
      seen.add(url.href);
      sources.push({
        title:
          typeof doc.semantic_identifier === "string"
            ? doc.semantic_identifier.slice(0, 160)
            : url.hostname,
        url: url.href,
        number:
          typeof citation.citation_number === "number"
            ? citation.citation_number
            : sources.length + 1,
      });
    } catch {
      /* Ignore invalid or non-public citation URLs. */
    }
    if (sources.length === 6) break;
  }
  return sources;
}
export async function askOnyx(
  message: string,
  session: string | null,
  fetcher: typeof fetch = fetch,
) {
  const config = onyxConfig();
  const response = await fetcher(`${config.base}/chat/send-chat-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      message,
      stream: false,
      include_citations: true,
      deep_research: false,
      parent_message_id: -1,
      allowed_tool_ids: [config.tool],
      forced_tool_id: config.tool,
      internal_search_filters: { document_set: [config.documentSet] },
      ...(session
        ? { chat_session_id: session }
        : {
            chat_session_info: {
              persona_id: config.agent,
              description: "Bun2Too website support",
              incognito: false,
            },
          }),
      additional_context:
        "Public Bun2Too customer support. Use only the approved public support document set. Answer concisely in plain text, grounded in retrieved sources. If the sources do not establish an answer, say so and offer the private inquiry form. Never invent account state, prices, guarantees, or actions taken. Never request passwords, tokens, payment details, or verification codes. Do not execute actions or change customer accounts.",
    }),
    signal: AbortSignal.timeout(45000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok)
    throw new RequestError(
      response.status === 429 ? 429 : 503,
      response.status === 429
        ? "The assistant is busy. Please try again shortly."
        : "The knowledge assistant is temporarily unavailable. You can send a private inquiry instead.",
    );
  const data = object(await response.json());
  const answer =
    typeof data.answer_citationless === "string" &&
    data.answer_citationless.trim()
      ? data.answer_citationless
      : data.answer;
  const sessionId = data.chat_session_id || session;
  if (
    data.error_msg ||
    typeof answer !== "string" ||
    !answer.trim() ||
    !uuid(sessionId)
  )
    throw new RequestError(
      503,
      "The assistant could not verify an answer. Please try again or send a private inquiry.",
    );
  return {
    answer: answer.slice(0, 12000),
    sources: publicSources(data),
    sessionId,
  };
}
