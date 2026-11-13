import { RequestError } from "./consent";

// Bound the whole operation, including response bodies and SDK retry waits.
// The abort signal also prevents later SDK retries from starting network calls.
export async function supportDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parent?: AbortSignal,
  timeoutMessage = "AI answers took too long to respond. Please try again or send a private inquiry.",
) {
  const controller = new AbortController();
  const signal = parent
    ? AbortSignal.any([parent, controller.signal])
    : controller.signal;
  const unavailable = () => new RequestError(503, timeoutMessage);
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(unavailable());
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await Promise.race([
      aborted,
      Promise.resolve().then(() => {
        if (signal.aborted) throw unavailable();
        return run(signal);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    controller.abort();
  }
}
