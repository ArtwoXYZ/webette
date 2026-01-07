/**
 * Templates config parsing (site overrides on top of tool defaults).
 */

import type { WebetteEnv } from "../../config/env";

type TemplateKey = keyof WebetteEnv["templates"]["default"];
type CustomIndexOverrides = NonNullable<TemplatesOverrides["custom"]>["index"];
type CustomEntryOverrides = NonNullable<TemplatesOverrides["custom"]>["entry"];

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
    entry: Record<string, string>;
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
    const rawEntry = (rawCustom as Record<string, unknown>).entry;

    const custom: NonNullable<TemplatesOverrides["custom"]> = {
      index: {},
      entry: {},
    };

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
        custom.index = indexOverrides;
      }
    }

    if (rawEntry && typeof rawEntry === "object") {
      const entryOverrides: CustomEntryOverrides = {};
      for (const [rawKey, rawValue] of Object.entries(rawEntry as Record<string, unknown>)) {
        const key = String(rawKey ?? "").trim();
        const value = typeof rawValue === "string" ? rawValue.trim() : "";
        if (!key || !value) continue;
        entryOverrides[key] = value;
      }
      custom.entry = entryOverrides;
    }

    if (
      (custom.index.root || custom.index.collections || custom.index.collection) ||
      Object.keys(custom.entry).length
    ) {
      overrides.custom = custom;
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
