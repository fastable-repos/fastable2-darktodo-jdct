import { Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const screenshotsDir = path.resolve('./e2e/screenshots')

/** Captures a full-page screenshot saved to e2e/screenshots/<name>.png */
export async function captureScreenshot(page: Page, name: string): Promise<void> {
  try {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }
    await page.screenshot({
      path: path.join(screenshotsDir, `${name}.png`),
      fullPage: true,
    })
  } catch (err) {
    console.error(`Failed to capture screenshot "${name}":`, err)
  }
}

/**
 * Attaches a console-error listener to the page and resolves after a short
 * stabilisation delay.  Call it *before* the actions you want to monitor.
 * If any console errors were emitted during that window the promise rejects.
 */
export async function assertNoConsoleErrors(page: Page): Promise<void> {
  const errors: string[] = []
  const handler = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  }
  page.on('console', handler)
  await page.waitForTimeout(400)
  page.off('console', handler)
  if (errors.length > 0) {
    throw new Error(`Console errors detected:\n${errors.join('\n')}`)
  }
}
