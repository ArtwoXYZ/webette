/**
 * Resolves collection-level assets (outside entries) using block resolvers.
 */

import type { WebetteEnv } from "../../config/env";
import type { Logger } from "../../logging/logger";
import { resolveAudioConfig } from "../block-types/audio/config";
import { resolveImageConfig } from "../block-types/image/config";
import { resolveVideoConfig } from "../block-types/video/config";
import type { Site } from "../model";
import { getResolver } from "../resolve/registry";

export async function resolveCollectionAssets(options: {
  rootDir: string;
  site: Site;
  toolEnv: WebetteEnv;
  readContent: boolean;
  logger: Logger;
}): Promise<Site> {
  const { rootDir, site, toolEnv, readContent, logger } = options;

  const collections = site.collections
    ? await Promise.all(
        site.collections.map(async (collection) => {
          if (!collection.assets || !collection.assets.length) {
            return collection;
          }

          const assets = await Promise.all(
            collection.assets.map(async (asset) => {
              const resolver = getResolver(asset);
              if (!resolver) return asset;

              const imageConfig = resolveImageConfig(rootDir, toolEnv, site);
              const audioConfig = resolveAudioConfig(rootDir, toolEnv, site);
              const videoConfig = resolveVideoConfig(rootDir, toolEnv, site);

              const routeSegments = [
                collection.slug || collection.id,
                asset.slug || asset.rawName,
              ];
              const routeHint = `${routeSegments.join("/")}${asset.ext ?? ""}`;

              const resolved = await resolver(asset, {
                rootDir,
                site,
                toolEnv,
                imageConfig,
                audioConfig,
                videoConfig,
                readContent,
                logger,
                routeHint,
                routeSegments,
              });

              const { blockRoute, ...content } = resolved ?? {};

              return {
                ...asset,
                ...(blockRoute ? { route: blockRoute } : {}),
                ...(resolved ? { content } : {}),
              };
            })
          );

          return { ...collection, assets };
        })
      )
    : undefined;

  return {
    ...site,
    ...(collections ? { collections } : {}),
  };
}

