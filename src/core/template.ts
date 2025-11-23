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

export function renderTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(
    /{{{(\w+)}}}|{{(\w+)}}/g,
    (_match, rawKey: string, escapedKey: string) => {
      const key = rawKey ?? escapedKey;
      const value = context[key] ?? "";
      return rawKey ? value : escapeHtml(value);
    }
  );
}
