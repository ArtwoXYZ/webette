/**
 * Build phase 4: output directory setup.
 *
 * Handles existing output directory according to overwrite policy.
 */

import { mkdir, stat } from 'node:fs/promises'
import { t } from '../../logging/i18n'
import { rmWithRetries } from '../../utils/fs'
import type { BuildConfig } from './types'

export async function setupOutputDirectory(config: BuildConfig): Promise<void> {
  const { scoped, outputDir, overwrite, locale } = config

  if (overwrite === 'replace-all') {
    try {
      await rmWithRetries(outputDir, { recursive: true, force: true })
      const stillThere = await stat(outputDir)
        .then(() => true)
        .catch(() => false)
      if (stillThere) {
        scoped.error('build.cleanOutputDirFailed', {
          outputDir,
          error: 'Directory still exists after removal attempt',
        })
        throw new Error(`Could not remove output directory ${outputDir}`)
      }
      scoped.info('build.cleanOutputDir', { outputDir })
    } catch (err: any) {
      scoped.error('build.cleanOutputDirFailed', {
        outputDir,
        error: String(err),
      })
      throw err
    }
  }

  let outputDirExists = false
  try {
    const dirStat = await stat(outputDir)
    if (!dirStat.isDirectory()) {
      const message = t(locale, 'build.outputNotDirectory', { outputDir })
      scoped.error('build.outputNotDirectory', { outputDir })
      throw new Error(message)
    }
    outputDirExists = true
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      scoped.error('build.mkdirFailed', {
        outputDir,
        error: String(err),
      })
      throw err
    }
  }

  if (outputDirExists) {
    scoped.debug('build.outputDirExists', { outputDir })
    switch (overwrite) {
      case 'none':
        scoped.error('build.overwriteDenied', { outputDir })
        throw new Error(t(locale, 'build.overwriteDenied', { outputDir }))
      case 'replace-all':
        // Already removed above; fall through to mkdir
        break
      case 'replace-files':
        break
      default:
        break
    }
  }

  try {
    await mkdir(outputDir, { recursive: true })
  } catch (err: any) {
    if (err?.code !== 'EEXIST') {
      scoped.error('build.mkdirFailed', {
        outputDir,
        error: String(err),
      })
      throw err
    }
    scoped.debug('build.outputDirExists', { outputDir })
  }
}
