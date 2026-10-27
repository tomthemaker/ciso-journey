/** Text-only construction keeps learner-controlled fields out of HTML parsing. */
export function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  content: string | number = "",
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else el.setAttribute(key, value);
  }
  if (content !== "") el.textContent = String(content);
  return el;
}

export function byId<K extends keyof HTMLElementTagNameMap>(
  id: string,
  tag: K,
): HTMLElementTagNameMap[K] {
  const el = document.getElementById(id);
  if (!el || el.localName !== tag) throw new Error(`Missing ${tag}#${id}`);
  return el as HTMLElementTagNameMap[K];
}
