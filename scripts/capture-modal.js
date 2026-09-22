import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const pwUrl = pathToFileURL('C:/Users/mohan/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright/index.mjs').href;
const { chromium } = await import(pwUrl);

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true
});

for (const vp of [{ name: 'mobile', width: 375, height: 812 }, { name: 'desktop', width: 1280, height: 800 }]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.name === 'mobile' });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/app?mode=admin#/admin', { waitUntil: 'networkidle' });
  await page.selectOption('.login-user-select', 'admin');
  await page.fill('input[type="password"]', '1977');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.admin-container', { timeout: 8000 });

  // If mobile, open sidebar
  if (vp.name === 'mobile') {
    const toggleBtn = await page.$('.menu-toggle-btn');
    if (toggleBtn) await toggleBtn.click();
    await page.waitForTimeout(300);
  }

  // Go to orders tab
  const ordersTab = await page.$('button.menu-item:has-text("إدارة الطلبات")');
  if (ordersTab) await ordersTab.click();
  await page.waitForTimeout(600);

  // Click fast order button
  const fastOrderBtn = await page.$('button:has-text("إنشاء طلب جديد")');
  if (fastOrderBtn) {
    await fastOrderBtn.click();
    await page.waitForSelector('.fast-order-modal, .modal-box, .modal-content', { timeout: 4000 });
    await page.waitForTimeout(600);
    const shotPath = `C:/Users/mohan/.gemini/antigravity/brain/21e7600b-38ae-49ed-833e-a9edab1ad110/screenshots/admin/Admin_Modal_FastOrder_${vp.name}.png`;
    await page.screenshot({ path: shotPath });
    console.log(`Captured: ${shotPath}`);
  }

  await context.close();
}

await browser.close();
console.log('Done!');
