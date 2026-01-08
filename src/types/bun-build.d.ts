/**
 * Type augmentation for Bun's build API.
 *
 * Bun supports `write: false` to keep build output in memory, but some `bun-types`
 * versions don't expose it on `BuildConfigBase`.
 */

declare module "bun" {
  interface BuildConfigBase {
    write?: boolean;
  }
}
