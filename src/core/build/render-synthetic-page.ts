/**
 * Shared factory for rendering static pages from a route string.
 * Used by renderTagPages and the onGeneratePages plugin hook.
 */

import * as path from 'node:path'
import { stripRouteSlashes } from '../../utils/path'
import { renderToFile, DEFAULT_PAGE_FILENAME, type TemplateRenderer } from './render-to-file'
import type { RenderPage } from '../../plugins/types'

export type { RenderPage }

export function createRenderPage(opts: {
  outputDir: string
  templateRenderer: TemplateRenderer
  renderBaseContext: Record<string, unknown>
  writeIfChanged: (filePath: string, content: string) => Promise<boolean>
  formatHtml: (html: string, filePath: string) => Promise<string>
  addExpectedOutput?: (relativePath: string) => void
}): RenderPage {
  return async ({ route, layoutName, context }) => {
    const targetDir = path.join(opts.outputDir, stripRouteSlashes(route))
    const mergedContext: Record<string, unknown> = {
      ...opts.renderBaseContext,
      ...(context ?? {}),
      layoutName,
    }
    if (opts.addExpectedOutput) {
      const indexPath = path.join(targetDir, DEFAULT_PAGE_FILENAME)
      opts.addExpectedOutput(path.relative(opts.outputDir, indexPath))
    }
    return renderToFile({
      templateRenderer: opts.templateRenderer,
      context: mergedContext,
      targetDir,
      formatHtml: opts.formatHtml,
      writeIfChanged: opts.writeIfChanged,
    })
  }
}
