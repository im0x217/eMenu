import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pwUrl = pathToFileURL('C:/Users/mohan/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright/index.mjs').href;
const { chromium } = await import(pwUrl);

const SCREENSHOTS_DIR = 'C:/Users/mohan/.gemini/antigravity/brain/21e7600b-38ae-49ed-833e-a9edab1ad110/screenshots/admin';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:3000';

async function runAdminDeepAudit() {
  console.log('============================================================');
  console.log('  e-Menu Admin Tabs & Modals Deep Playwright Audit');
  console.log('============================================================\n');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: 'mobile', width: 375, height: 812, isMobile: true, hasTouch: true },
    { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false }
  ];

  const adminResults = [];

  for (const vp of viewports) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`🔍 AUDITING ADMIN VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    console.log(`------------------------------------------------------------`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      locale: 'ar-LY'
    });

    const page = await context.newPage();

    // Step 1: Login
    console.log('Logging into Admin Console...');
    await page.goto(`${BASE_URL}/app?mode=admin#/admin`, { waitUntil: 'networkidle' });

    // Fill form
    await page.selectOption('.login-user-select', 'admin');
    await page.fill('input[type="password"]', '1977');
    await page.click('button[type="submit"]');

    // Wait for admin layout to load
    await page.waitForSelector('.admin-container, .admin-sidebar, .main-header', { timeout: 8000 });
    console.log('✓ Successfully logged in to Admin Console!');

    await page.waitForTimeout(500);

    // Save Dashboard screenshot
    const dashFile = `Admin_Dashboard_${vp.name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, dashFile) });
    console.log(`  📸 Screenshot: ${dashFile}`);

    // Audit Tabs
    const tabsToTest = [
      { id: 'analytics', title: 'الإحصائيات والتقارير' },
      { id: 'products', title: 'إدارة المنتجات' },
      { id: 'categories', title: 'إدارة الأصناف' },
      { id: 'orders', title: 'إدارة الطلبات' },
      { id: 'customers', title: 'العملاء والمفضلات' },
      { id: 'production', title: 'إدارة الإنتاج' }
    ];

    for (const t of tabsToTest) {
      console.log(`\nTesting Tab: [${t.title}] (${t.id})`);
      
      // On mobile, if sidebar is closed, open it or navigate
      if (vp.isMobile) {
        const sidebarOpen = await page.$eval('.admin-sidebar', el => el.classList.contains('open')).catch(() => false);
        if (!sidebarOpen) {
          const toggleBtn = await page.$('.menu-toggle-btn');
          if (toggleBtn) await toggleBtn.click();
          await page.waitForTimeout(300);
        }
      }

      // Click tab
      const tabBtn = await page.$(`button.menu-item:has-text("${t.title}")`);
      if (tabBtn) {
        await tabBtn.click();
        await page.waitForTimeout(600);
      }

      // Capture screenshot
      const tabFile = `Admin_Tab_${t.id}_${vp.name}.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, tabFile) });
      console.log(`  📸 Screenshot: ${tabFile}`);

      // Run DOM audit on active tab
      const tabAudit = await page.evaluate(({ tabId, isMobile }) => {
        const issues = [];
        
        // Touch target check
        const buttons = Array.from(document.querySelectorAll('.admin-main button, .admin-main a, .admin-main input, .admin-main select'));
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (isMobile && (rect.width < 44 || rect.height < 44)) {
              const label = (btn.innerText || btn.getAttribute('aria-label') || btn.className).trim().slice(0, 30);
              issues.push({
                type: 'TOUCH_TARGET_TOO_SMALL',
                element: `<${btn.tagName.toLowerCase()}> "${label}"`,
                size: `${Math.round(rect.width)}x${Math.round(rect.height)}px`
              });
            }
          }
        }

        // Contrast check
        function getLuminance(r, g, b) {
          const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        }

        const textEls = Array.from(document.querySelectorAll('.admin-main h1, .admin-main h2, .admin-main h3, .admin-main p, .admin-main span, .admin-main th, .admin-main td'));
        for (const el of textEls.slice(0, 50)) {
          const text = el.innerText ? el.innerText.trim() : '';
          if (!text || text.length < 2) continue;
          const style = window.getComputedStyle(el);
          const fgMatch = style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (fgMatch) {
            const fgLum = getLuminance(parseInt(fgMatch[1]), parseInt(fgMatch[2]), parseInt(fgMatch[3]));
            // Effective bg for table or glass panel is typically #ffffff / #f8fafc or #1e293b
            const bgLum = getLuminance(255, 255, 255); // conservative light bg assumption
            const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
            if (ratio < 4.5 && ratio > 1.2) {
              issues.push({
                type: 'LOW_CONTRAST',
                text: text.slice(0, 25),
                contrast: ratio.toFixed(2),
                color: style.color
              });
            }
          }
        }

        return { tabId, issues };
      }, { tabId: t.id, isMobile: vp.isMobile });

      console.log(`  Issues on [${t.title}]: ${tabAudit.issues.length}`);
      adminResults.push({ viewport: vp.name, tab: t.id, ...tabAudit });
    }

    // Step 2: Open and Audit Product Modal
    console.log('\nTesting Product Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(b => b.innerText && b.innerText.includes('إضافة منتج'));
      if (addBtn) addBtn.click();
    });
    
    // Also try clicking through selector
    const addProdBtn = await page.$('.products-tab-content button.btn-primary, button:has-text("إضافة منتج جديد")');
    if (addProdBtn) await addProdBtn.click().catch(() => {});

    await page.waitForSelector('.product-form-modal, .modal-box, .modal-content', { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);

    const modalFile = `Admin_Modal_ProductForm_${vp.name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, modalFile) });
    console.log(`  📸 Screenshot: ${modalFile}`);

    // Audit modal
    const modalAudit = await page.evaluate(({ isMobile }) => {
      const issues = [];
      const modal = document.querySelector('.modal-overlay:not([style*="display: none"]), .modal-box, .modal-content');
      if (!modal) return { issues: [{ type: 'MODAL_NOT_OPEN' }] };

      // Check close button touch target
      const closeBtn = modal.querySelector('.modal-close-btn, .close-btn, button[aria-label="إغلاق"]');
      if (closeBtn) {
        const rect = closeBtn.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          issues.push({
            type: 'MODAL_CLOSE_TARGET_TOO_SMALL',
            size: `${Math.round(rect.width)}x${Math.round(rect.height)}px`
          });
        }
      }

      // Check inputs
      const inputs = modal.querySelectorAll('input:not([type="checkbox"]), select, textarea');
      for (const input of inputs) {
        const style = window.getComputedStyle(input);
        const fontSize = parseFloat(style.fontSize);
        const rect = input.getBoundingClientRect();
        if (isMobile && fontSize < 16) {
          issues.push({
            type: 'MODAL_INPUT_FONT_SIZE_TOO_SMALL',
            name: input.name || input.placeholder,
            fontSize: `${fontSize}px`
          });
        }
        if (isMobile && rect.height < 44) {
          issues.push({
            type: 'MODAL_INPUT_HEIGHT_TOO_SMALL',
            name: input.name || input.placeholder,
            height: `${Math.round(rect.height)}px`
          });
        }
      }

      // Check modal action buttons
      const actionBtns = modal.querySelectorAll('.modal-footer button, .btn-modal-save, .btn-modal-cancel');
      for (const btn of actionBtns) {
        const rect = btn.getBoundingClientRect();
        if (isMobile && rect.height < 44) {
          issues.push({
            type: 'MODAL_ACTION_BUTTON_TOO_SMALL',
            label: btn.innerText.trim(),
            height: `${Math.round(rect.height)}px`
          });
        }
      }

      return { issues };
    }, { isMobile: vp.isMobile });

    console.log(`  Product Modal Issues: ${modalAudit.issues.length}`);
    adminResults.push({ viewport: vp.name, modal: 'product-form', ...modalAudit });

    // Close modal
    const closeBtn = await page.$('.modal-close-btn, button:has-text("إلغاء")');
    if (closeBtn) await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(SCREENSHOTS_DIR, 'admin_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(adminResults, null, 2), 'utf-8');
  console.log(`\n============================================================`);
  console.log(`✓ Admin Audit complete! Full report written to: ${reportPath}`);
  console.log(`============================================================\n`);
}

runAdminDeepAudit().catch(err => {
  console.error('Admin deep audit error:', err);
  process.exit(1);
});
