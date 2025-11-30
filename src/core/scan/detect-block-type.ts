// Lightweight file-type detector to tag blocks
type DetectOptions = {
  treatTxtAsMarkdown?: boolean;
};

export function detectBlockType(
  ext: string | undefined,
  isDirectory: boolean,
  options: DetectOptions = {}
): string {
  if (isDirectory) return "folder";
  if (!ext) return "unclassified";

  const lower = ext.toLowerCase();
  if ([".md", ".markdown", ".mdown"].includes(lower)) return "markdown";

  // Allow .txt to reuse the markdown pipeline by default; when disabled, keep it as plain text.
  if (lower === ".txt") {
    return options.treatTxtAsMarkdown === false ? "text" : "markdown";
  }

  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".ico", ".apng"].includes(lower))
    return "image";
  if ([".mp4", ".mov", ".webm", ".m4v", ".mkv", ".avi"].includes(lower)) return "video";
  if ([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"].includes(lower)) return "audio";

  // Anything not covered above is left to plugins: mark as unclassified.
  return "unclassified";
}
