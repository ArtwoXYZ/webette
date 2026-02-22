/**
 * Template helpers for image variants and HTML generation.
 */

import Handlebars from "handlebars";
import type {
  Block,
  ImageVariant,
  ImageVariantName,
  ResolvedBlockContent,
  Site,
} from "../model";

// Minimal site shape to resolve the default variant without coupling to full Site.
type SiteLike = Site | { images?: { defaultVariant?: unknown } } | Record<string, unknown>;

type ImageContent = Pick<ResolvedBlockContent, "variants" | "meta">;

// Narrow block type for helpers/resolvers that only handle images.
export type ImageBlock = Block & {
  type: "image";
  content?: ImageContent;
};

export type ImageRenderOptions = {
  variant?: ImageVariantName;
  alt?: string;
  title?: string;
  className?: string;
  id?: string;
  loading?: "lazy" | "eager" | "auto";
  decoding?: "async" | "sync" | "auto";
  sizes?: string;
  figure?: boolean;
  caption?: string;
  figureClass?: string;
  data?: Record<string, string>;
  site?: SiteLike;
};

export type ImagePick = {
  src?: string;
  width?: number;
  height?: number;
  srcset?: string;
};

// Normalize user-provided variants (helper params, markdown options).
export function normalizeVariantName(raw: unknown): ImageVariantName | undefined {
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
}

// Resolve the site default variant when available, fallback to "default".
export function resolveDefaultVariant(siteLike: SiteLike | undefined): ImageVariantName {
  const site = (siteLike as Site | undefined)?.site ?? siteLike;
  const images = (site as { images?: { defaultVariant?: unknown } } | undefined)?.images;
  const configured = normalizeVariantName(images?.defaultVariant);
  return configured ?? "default";
}

// Pick the most relevant source (variant or fallback) + generate srcset.
export function pickImageSource(
  block: ImageBlock,
  requested: ImageVariantName | undefined,
  fallback: ImageVariantName
): ImagePick {
  const variants: ImageVariant[] = Array.isArray(block?.content?.variants)
    ? (block.content.variants as ImageVariant[])
    : [];

  const findVariant = (name: ImageVariantName | undefined) =>
    name ? variants.find((v) => v.name === name) : undefined;

  const chosenVariant = findVariant(requested) ?? findVariant(fallback);

  const srcset = variants
    .map((v) => {
      const r = v.route;
      const w = v.width;
      if (typeof r === "string" && typeof w === "number" && Number.isFinite(w)) {
        return `${r} ${w}w`;
      }
      return null;
    })
    .filter(Boolean)
    .join(", ");

  return {
    src: chosenVariant?.route ?? block?.route,
    width: chosenVariant?.width ?? block?.content?.meta?.width,
    height: chosenVariant?.height ?? block?.content?.meta?.height,
    srcset: srcset || undefined,
  };
}

const escapeAttr = (value: unknown) => Handlebars.escapeExpression(String(value));

function buildAttributes(attrs: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    pairs.push(`${key}="${escapeAttr(value)}"`);
  }
  return pairs.join(" ");
}

// Build a full <img> (or <figure>) HTML string from a resolved image block.
export function buildImageHtml(block: ImageBlock, options: ImageRenderOptions = {}): string {
  if (!block || block.type !== "image") return "";

  const variant = normalizeVariantName(options.variant);
  const defaultVariant = resolveDefaultVariant(options.site);
  const picked = pickImageSource(block, variant, defaultVariant);
  if (!picked.src) return "";

  const alt =
    options.alt ??
    (typeof block?.content?.meta?.alt === "string" ? block.content.meta.alt : undefined) ??
    block?.name ??
    block?.rawName ??
    "";

  const attrs: Record<string, unknown> = {
    src: picked.src,
    alt,
    ...(options.title ? { title: options.title } : {}),
    ...(options.className ? { class: options.className } : {}),
    ...(options.id ? { id: options.id } : {}),
    ...(options.loading ? { loading: options.loading } : { loading: "lazy" }),
    ...(options.decoding ? { decoding: options.decoding } : {}),
    ...(picked.width ? { width: picked.width } : {}),
    ...(picked.height ? { height: picked.height } : {}),
    ...(picked.srcset ? { srcset: picked.srcset } : {}),
    ...(options.sizes ? { sizes: options.sizes } : {}),
  };

  if (options.data) {
    for (const [key, value] of Object.entries(options.data)) {
      if (!key.startsWith("data-")) continue;
      attrs[key] = value;
    }
  }

  const imgTag = `<img ${buildAttributes(attrs)} />`;

  if (options.figure) {
    const figAttrs: Record<string, unknown> = {};
    if (options.figureClass) figAttrs.class = options.figureClass;
    const captionText = options.caption ?? alt ?? block?.name ?? "";
    return `<figure ${buildAttributes(figAttrs)}>${imgTag}<figcaption>${escapeAttr(
      captionText
    )}</figcaption></figure>`;
  }

  return imgTag;
}
