export function safeCmsHref(value: unknown) {
  if (typeof value !== "string" || /[\u0000-\u0020\\]/.test(value)) return "";
  if (
    (value.startsWith("/") && !value.startsWith("//")) ||
    value.startsWith("#")
  )
    return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {
    /* Invalid editorial link. */
  }
  return "";
}
