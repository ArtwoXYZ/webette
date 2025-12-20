import type { WebetteEnv } from "../../config/env";

type TemplateKey = keyof WebetteEnv["templates"]["default"];

export type TemplatesOverrides = Partial<{
  root: string;
  default: Partial<Record<TemplateKey, string>>;
}>;

const DEFAULT_KEYS: TemplateKey[] = [
  "wrapper",
  "layout",
  "index",
  "notFound",
  "accessForbidden",
];

export function parseTemplatesOverrides(
  raw?: Record<string, unknown>
): TemplatesOverrides {
  if (!raw || typeof raw !== "object") return {};

  const overrides: TemplatesOverrides = {};

  if (typeof raw.root === "string" && raw.root.trim()) {
    overrides.root = raw.root.trim();
  }

  const rawDefault = raw.default;
  if (rawDefault && typeof rawDefault === "object") {
    const defaults: Record<string, string> = {};
    for (const key of DEFAULT_KEYS) {
      const value = (rawDefault as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) {
        defaults[key] = value.trim();
      }
    }
    if (Object.keys(defaults).length) {
      overrides.default = defaults as TemplatesOverrides["default"];
    }
  }

  return overrides;
}

export function resolveTemplatesConfig(
  base: WebetteEnv["templates"],
  raw?: Record<string, unknown>
): {
  templates: WebetteEnv["templates"];
  siteTemplatesRoot?: string;
} {
  const overrides = parseTemplatesOverrides(raw);
  return {
    templates: {
      ...base,
      default: {
        ...base.default,
        ...(overrides.default ?? {}),
      },
    },
    siteTemplatesRoot: overrides.root,
  };
}
