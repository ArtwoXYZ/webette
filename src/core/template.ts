// Minimal template renderer for internal layouts
// Supports:
// - {{key}} with HTML escaping
// - {{{key}}} without escaping (for trusted HTML fragments)

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolvePath(context: Record<string, unknown>, path: string) {
  const segments = path.split(".");
  let value: any = context;
  for (const segment of segments) {
    if (value == null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

export function renderTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(
    /{{{([\w.]+)}}}|{{([\w.]+)}}/g,
    (_match, rawKey: string, escapedKey: string) => {
      const key = rawKey ?? escapedKey;
      const value = resolvePath(context, key);
      const stringValue =
        value === undefined || value === null ? "" : String(value);
      return rawKey ? stringValue : escapeHtml(stringValue);
    }
  );
}
