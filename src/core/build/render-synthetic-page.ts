/**
 * Shared factory for rendering static pages from a route string.
 * Used by renderTagPages and the onGeneratePages plugin hook.
 */

import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import { stripRouteSlashes } from '../../utils/path'
import type { RenderPage } from '../../plugins/types'

export type { RenderPage }

type HandlebarsRenderer = {
  render: (context: Record<string, unknown>) => string
}

export function createRenderPage(opts: {
  outputDir: string
  templateRenderer: HandlebarsRenderer
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
    const html = opts.templateRenderer.render(mergedContext)
    await mkdir(targetDir, { recursive: true })
    const indexPath = path.join(targetDir, 'index.html')
    if (opts.addExpectedOutput) {
      opts.addExpectedOutput(path.relative(opts.outputDir, indexPath))
    }
    const finalHtml = await opts.formatHtml(html, indexPath)
    return opts.writeIfChanged(indexPath, finalHtml)
  }
}
