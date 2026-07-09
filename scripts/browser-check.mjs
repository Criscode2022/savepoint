import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://localhost:4200';
const EMAIL = 'cristian@gmail.com';
const PASSWORD = '12345678a';
const OUT = path.join(process.cwd(), '.browser-check');

const routes = [
  { name: 'login', path: '/login', auth: false },
  { name: 'home', path: '/home', auth: true },
  { name: 'add-game', path: '/add', auth: true },
  { name: 'wishlist-add', path: '/wishlist/add', auth: true },
  { name: 'play-history', path: '/play-history', auth: true },
  { name: 'profile', path: '/profile', auth: true },
];

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('ion-input[formcontrolname="email"] input').fill(EMAIL);
  await page.locator('ion-input[formcontrolname="password"] input').fill(PASSWORD);
  await page.locator('ion-button.auth-submit').click();
  await page.waitForURL(/\/home/, { timeout: 20000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: true, steps: [], consoleErrors: [], pageErrors: [] };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      report.consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    report.pageErrors.push({ url: page.url(), text: String(err) });
  });

  try {
    await login(page);
    report.steps.push({ step: 'login', ok: true, url: page.url() });
    report.steps.push({ step: 'login-screenshot', file: await shot(page, '01-home-after-login') });

    for (const route of routes.filter((r) => r.auth && r.path !== '/home')) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const url = page.url();
      const onLogin = url.includes('/login');
      report.steps.push({
        step: route.name,
        ok: !onLogin,
        url,
        file: await shot(page, `02-${route.name}`),
      });
      if (onLogin) report.ok = false;
    }

    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
    const gameLink = page.locator('app-game-card, .game-list-item').first();
    if (await gameLink.count()) {
      await gameLink.click();
      await page.waitForTimeout(1000);
      report.steps.push({
        step: 'game-detail',
        ok: page.url().includes('/game/'),
        url: page.url(),
        file: await shot(page, '03-game-detail'),
      });
      const editBtn = page.locator('.edit-btn, ion-button[aria-label="Edit game"]').first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForTimeout(800);
        report.steps.push({
          step: 'game-edit',
          ok: page.url().includes('/edit/'),
          url: page.url(),
          file: await shot(page, '04-game-edit'),
        });
      }
    } else {
      report.steps.push({ step: 'game-detail', ok: true, skipped: 'no games in library' });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
    report.steps.push({
      step: 'home-mobile',
      ok: true,
      url: page.url(),
      file: await shot(page, '05-home-mobile'),
    });
  } catch (err) {
    report.ok = false;
    report.fatal = String(err);
    try {
      await shot(page, 'error-state');
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
  }

  if (report.consoleErrors.length || report.pageErrors.length) {
    report.ok = false;
  }

  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
