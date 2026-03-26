/**
 * Webette build pipeline entrypoint.
 *
 * Orchestrates the main steps:
 *   initialize → load plugins → scan → setup output → transform → render & finalize
 */

import type { Logger } from '../../logging/logger'
import { initializeBuild } from './initialize'
import { loadAndInitPlugins } from './plugins'
import { scanAndValidate } from './scan'
import { setupOutputDirectory } from './output'
import { resolveAndTransform } from './transform'
import { renderAndFinalize } from './finalize'

export type { BuildOptions } from './types'

export async function build(rootDir: string, options: import('./types').BuildOptions, logger: Logger): Promise<void> {
  const config = await initializeBuild(rootDir, options, logger)
  const pluginResult = await loadAndInitPlugins(config)
  const [scanResult] = await Promise.all([
    scanAndValidate(config, pluginResult),
    setupOutputDirectory(config),
  ])
  const transformResult = await resolveAndTransform(config, pluginResult, scanResult)
  await renderAndFinalize(config, pluginResult, transformResult)
}
