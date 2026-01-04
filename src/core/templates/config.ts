import type { WebetteEnv } from "../../config/env";

type TemplateKey = keyof WebetteEnv["templates"]["default"];
type CustomIndexOverrides = NonNullable<TemplatesOverrides["custom"]>["index"];

export type TemplatesOverrides = Partial<{
  root: string;
  default: Partial<Record<TemplateKey, string>>;
  assets: {
    dir: string;
    publicBase: string;
  };
  custom: {
    index: {
      root?: string;
      collections?: string;
      collection?: Record<string, string>;
    };
  };
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

  const rawAssets = (raw as Record<string, unknown>).assets;
  if (rawAssets && typeof rawAssets === "object") {
    const dir = (rawAssets as Record<string, unknown>).dir;
    const publicBase = (rawAssets as Record<string, unknown>).publicBase;
    if (
      typeof dir === "string" &&
      dir.trim() &&
      typeof publicBase === "string" &&
      publicBase.trim()
    ) {
      overrides.assets = {
        dir: dir.trim(),
        publicBase: publicBase.trim(),
      };
    }
  }

  const rawCustom = (raw as Record<string, unknown>).custom;
  if (rawCustom && typeof rawCustom === "object") {
    const rawIndex = (rawCustom as Record<string, unknown>).index;
    if (rawIndex && typeof rawIndex === "object") {
      const indexOverrides: CustomIndexOverrides = {};
      const root = (rawIndex as Record<string, unknown>).root;
      if (typeof root === "string" && root.trim()) {
        indexOverrides.root = root.trim();
      }
      const collections = (rawIndex as Record<string, unknown>).collections;
      if (typeof collections === "string" && collections.trim()) {
        indexOverrides.collections = collections.trim();
      }
      const collection = (rawIndex as Record<string, unknown>).collection;
      if (collection && typeof collection === "object") {
        const entries = Object.entries(collection as Record<string, unknown>)
          .filter(([, value]) => typeof value === "string" && String(value).trim());
        if (entries.length) {
          indexOverrides.collection = entries.reduce((acc, [key, value]) => {
            acc[key] = String(value).trim();
            return acc;
          }, {} as Record<string, string>);
        }
      }
      if (
        indexOverrides.root ||
        indexOverrides.collections ||
        indexOverrides.collection
      ) {
        overrides.custom = { index: indexOverrides };
      }
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
  assets?: TemplatesOverrides["assets"];
  custom?: TemplatesOverrides["custom"];
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
    ...(overrides.assets ? { assets: overrides.assets } : {}),
    ...(overrides.custom ? { custom: overrides.custom } : {}),
  };
}
