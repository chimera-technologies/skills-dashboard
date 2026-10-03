import type { BrowserContext, Page } from '@playwright/test';

// REQ-13 / SEC-7.1: blocks and records every request that leaves the app's own origin.
export async function guardOrigin(context: BrowserContext, origin: string) {
  const wsOrigin = origin.replace(/^http/, 'ws');
  const allowed = (url: string) =>
    url.startsWith(`${origin}/`) || url.startsWith(`${wsOrigin}/`) || url.startsWith('data:') || url.startsWith('blob:');
  const found = new Set<string>();
  const record = (url: string) => {
    if (!allowed(url)) found.add(url);
  };

  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (allowed(url)) return route.continue();
    found.add(url);
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket(/.*/, (ws) => {
    if (allowed(ws.url())) return ws.connectToServer();
    found.add(ws.url());
    return ws.close();
  });
  context.on('request', (req) => record(req.url()));
  const watchPage = (page: Page) => page.on('websocket', (ws) => record(ws.url()));
  context.pages().forEach(watchPage);
  context.on('page', watchPage);

  return {
    violations: () => [...found],
    settle: async (page: Page) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    },
  };
}
