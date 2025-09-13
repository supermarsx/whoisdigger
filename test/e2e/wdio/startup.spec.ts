import path from 'path'
import os from 'os'
import fs from 'fs'

describe('Startup', () => {
  it('attaches to Electron and shows file:// URL', async () => {
    await browser.pause(4000)
    const handles = await browser.getWindowHandles()
    expect(handles.length).toBeGreaterThan(0)
    let ok = false
    for (const h of handles) {
      await browser.switchToWindow(h)
      const url = await browser.getUrl()
      if (url.startsWith('file://') || url.includes('index.html')) {
        ok = true
        break
      }
    }
    expect(ok).toBe(true)
    // Save a screenshot artifact on success
    try {
      await browser.saveScreenshot(
        path.join(process.cwd(), 'test', 'e2e', 'artifacts', `startup-${Date.now()}.png`)
      )
    } catch {}
  })

  it('has no renderer console errors', async () => {
    await browser.pause(2000)
    // Evaluate error buffer set by preload when WDIO_E2E=1
    const errors = (await browser.execute(
      // @ts-ignore
      'return (window && window.__rendererErrors) || []'
    )) as unknown as string[]
    if (errors && errors.length) {
      try {
        await browser.saveScreenshot(
          path.join(process.cwd(), 'test', 'e2e', 'artifacts', `renderer-errors-${Date.now()}.png`)
        )
      } catch {}
    }
    expect((errors || []).length).toBe(0)
  })
})
