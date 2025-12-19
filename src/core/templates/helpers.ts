import Handlebars from "handlebars";
import type { Collection, Entry } from "../model";

type ImageVariantName = "default" | "small" | "medium" | "large";
type ImagePick = {
  src?: string;
  width?: number;
  height?: number;
  srcset?: string;
};

let helpersRegistered = false;

// Register a small set of reusable helpers for templates.
export function registerDefaultHelpers(options?: { defaultLayoutName?: string }) {
  if (helpersRegistered) return;
  helpersRegistered = true;

  const fallbackLayout = options?.defaultLayoutName?.trim() || "layout";

  const safeString = (value: unknown) =>
    value == null ? "" : String(value);

  const toNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const toDate = (value: unknown): Date | null => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "string" && value.trim()) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const resolveLocaleFromContext = (options: any): string | undefined => {
    const root = options?.data?.root ?? {};
    const site = (root as any).site ?? (root as any).model?.site;
    const lang = site?.lang || site?.locale || site?.language;
    if (typeof lang === "string" && lang.trim()) return lang.trim();
    const loggingLocale = (root as any).logging?.locale;
    if (typeof loggingLocale === "string" && loggingLocale.trim()) return loggingLocale.trim();
    return undefined;
  };

  const truncate = (value: string, length: number) => {
    if (length <= 0) return "";
    if (value.length <= length) return value;
    return `${value.slice(0, length)}…`;
  };

  const normalizeVariantName = (raw: unknown): ImageVariantName | undefined => {
    if (raw === "default" || raw === "small" || raw === "medium" || raw === "large") {
      return raw;
    }
    if (typeof raw === "string" && raw.trim()) {
      const val = raw.trim().toLowerCase();
      if (val === "default" || val === "small" || val === "medium" || val === "large") {
        return val as ImageVariantName;
      }
    }
    return undefined;
  };

  const pickImageSource = (
    block: any,
    requested: ImageVariantName | undefined,
    fallback: ImageVariantName
  ): ImagePick => {
    const variants: any[] = Array.isArray(block?.content?.variants)
      ? (block.content.variants as any[])
      : [];

    const findVariant = (name: ImageVariantName | undefined) =>
      name
        ? variants.find(
            (v: any) => typeof v?.name === "string" && v.name.toLowerCase() === name
          )
        : undefined;

    const chosenVariant = findVariant(requested) ?? findVariant(fallback);

    const srcset = variants
      .map((v) => {
        const r = (v as any).route;
        const w = (v as any).width;
        if (typeof r === "string" && typeof w === "number" && Number.isFinite(w)) {
          return `${r} ${w}w`;
        }
        return null;
      })
      .filter(Boolean)
      .join(", ");

    return {
      src: (chosenVariant as any)?.route ?? block?.route,
      width: (chosenVariant as any)?.width ?? block?.content?.meta?.width,
      height: (chosenVariant as any)?.height ?? block?.content?.meta?.height,
      srcset: srcset || undefined,
    };
  };

  const resolveDefaultVariant = (options: any): ImageVariantName => {
    const root = options?.data?.root ?? {};
    const site = (root as any).site ?? (root as any).model?.site;
    const images = site?.images;
    const configured = normalizeVariantName(images?.defaultVariant);
    return configured ?? "default";
  };

  const buildAttributes = (attrs: Record<string, unknown>): string => {
    const pairs: string[] = [];
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      const escaped = Handlebars.escapeExpression(String(value));
      pairs.push(`${key}="${escaped}"`);
    }
    return pairs.join(" ");
  };

  Handlebars.registerHelper("imageSrc", function (block: any, options) {
    if (!block || block.type !== "image") return "";
    const variant = normalizeVariantName(options?.hash?.variant);
    const defaultVariant = resolveDefaultVariant(options);
    const picked = pickImageSource(block, variant, defaultVariant);
    return picked.src ?? "";
  });

  Handlebars.registerHelper("image", function (block: any, options) {
    if (!block || block.type !== "image") return "";
    const hash = options?.hash ?? {};

    const variant = normalizeVariantName(hash.variant);
    const defaultVariant = resolveDefaultVariant(options);
    const picked = pickImageSource(block, variant, defaultVariant);

    if (!picked.src) return "";

    const alt =
      hash.alt ??
      block?.name ??
      block?.rawName ??
      "";

    const attrs: Record<string, unknown> = {
      src: picked.src,
      alt,
      ...(hash.title ? { title: hash.title } : {}),
      ...(hash.class ? { class: hash.class } : {}),
      ...(hash.id ? { id: hash.id } : {}),
      ...(hash.loading ? { loading: hash.loading } : { loading: "lazy" }),
      ...(hash.decoding ? { decoding: hash.decoding } : {}),
      ...(picked.width ? { width: picked.width } : {}),
      ...(picked.height ? { height: picked.height } : {}),
      ...(picked.srcset ? { srcset: picked.srcset } : {}),
      ...(hash.sizes ? { sizes: hash.sizes } : {}),
    };

    for (const [key, value] of Object.entries(hash)) {
      if (key.startsWith("data-")) {
        attrs[key] = value;
      }
    }

    const imgTag = `<img ${buildAttributes(attrs)} />`;

    if (hash.figure) {
      const figAttrs: Record<string, unknown> = {};
      if (hash.figureClass) figAttrs.class = hash.figureClass;
      const captionText =
        hash.caption ?? alt ?? block?.name ?? "";
      const figure = `<figure ${buildAttributes(figAttrs)}>${imgTag}<figcaption>${Handlebars.escapeExpression(
        captionText
      )}</figcaption></figure>`;
      return new Handlebars.SafeString(figure);
    }

    return new Handlebars.SafeString(imgTag);
  });

  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper("neq", (a: unknown, b: unknown) => a !== b);
  Handlebars.registerHelper("in", (value: unknown, list: unknown) =>
    Array.isArray(list) ? list.includes(value as never) : false
  );
  Handlebars.registerHelper("safe", (html: unknown) =>
    new Handlebars.SafeString(html == null ? "" : String(html))
  );
  Handlebars.registerHelper("first", (arr: unknown) =>
    Array.isArray(arr) ? arr[0] : undefined
  );
  Handlebars.registerHelper("firstBlockOfType", (blocks: unknown, type: string) =>
    Array.isArray(blocks) ? blocks.find((b: any) => b?.type === type) : undefined
  );
  Handlebars.registerHelper("upper", (value: unknown) => safeString(value).toUpperCase());
  Handlebars.registerHelper("lower", (value: unknown) => safeString(value).toLowerCase());
  Handlebars.registerHelper("capitalize", (value: unknown) => {
    const s = safeString(value);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  });
  Handlebars.registerHelper("title", (value: unknown) =>
    safeString(value).replace(/\w\S*/g, (word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
  );
  Handlebars.registerHelper("truncate", (value: unknown, len: unknown) => {
    const s = safeString(value);
    const length = typeof len === "number" ? len : parseInt(String(len), 10);
    return Number.isFinite(length) ? truncate(s, length) : s;
  });
  Handlebars.registerHelper("formatDate", function (value: unknown, options) {
    const date = toDate(value);
    if (!date) return "";
    const hash = options?.hash ?? {};
    const localeFromHash =
      typeof hash.locale === "string" && hash.locale.trim() ? hash.locale.trim() : undefined;
    const locale = localeFromHash ?? resolveLocaleFromContext(options);
    const dateStyle = hash.dateStyle || hash.format || "medium";
    const timeStyle = hash.timeStyle || undefined;
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: dateStyle as Intl.DateTimeFormatOptions["dateStyle"],
        timeStyle: timeStyle as Intl.DateTimeFormatOptions["timeStyle"],
      }).format(date);
    } catch {
      return date.toISOString();
    }
  });
  Handlebars.registerHelper("fromNow", function (value: unknown, options) {
    const date = toDate(value);
    if (!date) return "";

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(diffSeconds);

    const localeFromHash =
      typeof options?.hash?.locale === "string" && options.hash.locale.trim()
        ? options.hash.locale.trim()
        : undefined;
    const locale = localeFromHash ?? resolveLocaleFromContext(options);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    const units: { threshold: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
      { threshold: 31536000, divisor: 31536000, unit: "year" }, // 365 days
      { threshold: 2592000, divisor: 2592000, unit: "month" },  // 30 days
      { threshold: 86400, divisor: 86400, unit: "day" },
      { threshold: 3600, divisor: 3600, unit: "hour" },
      { threshold: 60, divisor: 60, unit: "minute" },
    ];

    for (const { threshold, divisor, unit } of units) {
      if (absSeconds >= threshold) {
        const valueRounded = Math.round(diffSeconds / divisor);
        return rtf.format(valueRounded, unit);
      }
    }

    return rtf.format(diffSeconds, "second");
  });
  Handlebars.registerHelper("add", (a: unknown, b: unknown) => {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (na == null || nb == null) return "";
    return na + nb;
  });
  Handlebars.registerHelper("subtract", (a: unknown, b: unknown) => {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (na == null || nb == null) return "";
    return na - nb;
  });
  Handlebars.registerHelper("multiply", (a: unknown, b: unknown) => {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (na == null || nb == null) return "";
    return na * nb;
  });
  Handlebars.registerHelper("divide", (a: unknown, b: unknown) => {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (na == null || nb == null || nb === 0) return "";
    return na / nb;
  });
  Handlebars.registerHelper("percent", (part: unknown, total: unknown, decimals?: unknown) => {
    const p = toNumber(part);
    const t = toNumber(total);
    if (p == null || t == null || t === 0) return "";
    const d =
      typeof decimals === "number"
        ? decimals
        : Number.isFinite(Number(decimals))
        ? Number(decimals)
        : 0;
    const value = (p / t) * 100;
    return d > 0 ? value.toFixed(d) : Math.round(value);
  });

  // Block helper: find a collection by slug or id and evaluate the block with it.
  Handlebars.registerHelper("withCollection", function (slug: string, options) {
    const root = options.data?.root ?? {};
    const model = (root as any).model ?? root;
    const collections: Collection[] = Array.isArray((model as any).collections)
      ? (model as any).collections
      : [];
    const match = collections.find(
      (col) => col.slug === slug || col.id === slug || col.route === slug
    );
    return match ? options.fn(match, { data: options.data }) : "";
  });

  // Block helper: find an entry by slug/id/route across collections.
  Handlebars.registerHelper("withEntry", function (identifier: string, options) {
    const root = options.data?.root ?? {};
    const model = (root as any).model ?? root;
    const collections: Collection[] = Array.isArray((model as any).collections)
      ? (model as any).collections
      : [];

    let foundEntry: Entry | undefined;
    let foundCollection: Collection | undefined;

    for (const col of collections) {
      const entry = col.entries.find(
        (ent) =>
          ent.slug === identifier ||
          ent.id === identifier ||
          (ent.route && ent.route.replace(/\/+$/, "") === identifier.replace(/\/+$/, ""))
      );
      if (entry) {
        foundEntry = entry;
        foundCollection = col;
        break;
      }
    }

    if (!foundEntry) return "";
    const data = { ...(options.data || {}), collection: foundCollection };
    return options.fn(foundEntry, { data });
  });

  // Render a layout partial by name, with a default fallback.
  Handlebars.registerHelper("renderLayout", function (name: unknown, options) {
    const layoutName =
      (typeof name === "string" && name.trim()) || fallbackLayout;
    const partial = Handlebars.partials[layoutName];
    if (!partial) return "";

    const context = options.data?.root ?? {};
    const templateFn =
      typeof partial === "function"
        ? (partial as Handlebars.TemplateDelegate)
        : Handlebars.compile(partial as string);

    return new Handlebars.SafeString(templateFn(context));
  });
}
