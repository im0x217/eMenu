import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pwUrl = pathToFileURL('C:/Users/mohan/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright/index.mjs').href;
const { chromium } = await import(pwUrl);

const SCREENSHOTS_DIR = 'C:/Users/mohan/.gemini/antigravity/brain/21e7600b-38ae-49ed-833e-a9edab1ad110/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:3000';

const PAGES_TO_AUDIT = [
  { name: 'Shop1_Storefront', url: `${BASE_URL}/app?shop=shop1#/shop/shop1`, waitSelector: '.product-card, .subcat-plain-section, .category-pill' },
  { name: 'Shop2_Storefront', url: `${BASE_URL}/app?shop=shop2#/shop/shop2`, waitSelector: '.product-card, .subcat-plain-section, .category-pill' },
  { name: 'Cart_Checkout', url: `${BASE_URL}/app?shop=shop1#/cart`, waitSelector: '.cart-view, .empty-cart, .order-summary' },
  { name: 'Favorites_View', url: `${BASE_URL}/app?shop=shop1#/favorites`, waitSelector: '.favorites-view, .empty-state, .product-card' },
  { name: 'Customer_Account', url: `${BASE_URL}/app?shop=shop1#/account`, waitSelector: '.account-view, .profile-card, .orders-section' },
  { name: 'Admin_Console', url: `${BASE_URL}/app?mode=admin#/admin`, waitSelector: '.admin-view, .admin-login-card, .pos-container' }
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false }
];

// Helper: Run deep programmatic DOM & layout audit inside the browser
async function runDomAudit(page, pageName, viewportName) {
  return await page.evaluate(({ pageName, viewportName }) => {
    const issues = {
      overflow: [],
      touchTargets: [],
      contrast: [],
      typography: [],
      hierarchy: []
    };

    const isMobile = viewportName === 'mobile';
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 1. OVERFLOW & PLACEMENTS
    const docScrollWidth = document.documentElement.scrollWidth;
    if (docScrollWidth > vw + 1) {
      issues.overflow.push({
        type: 'PAGE_HORIZONTAL_OVERFLOW',
        severity: 'HIGH',
        detail: `Document scrollWidth (${docScrollWidth}px) exceeds viewport width (${vw}px) by ${docScrollWidth - vw}px.`
      });
    }

    const allElements = Array.from(document.querySelectorAll('body *'));
    for (const el of allElements) {
      // Ignore horizontal scrolling carousels and subcategory rows
      if (
        el.classList.contains('subcat-products-grid-1row') ||
        el.classList.contains('categories-tabs-scroll') ||
        el.classList.contains('categories-scroll-wrapper') ||
        el.classList.contains('carousel-track') ||
        el.closest('.subcat-products-grid-1row') ||
        el.closest('.categories-tabs-scroll') ||
        el.closest('.carousel-track')
      ) {
        continue;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (rect.right > vw + 2 && el.scrollWidth > vw + 2) {
          const tag = el.tagName.toLowerCase();
          const cls = el.className ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : '';
          const id = el.id ? `#${el.id}` : '';
          issues.overflow.push({
            type: 'ELEMENT_OVERFLOW',
            severity: 'MEDIUM',
            detail: `<${tag}${id}${cls}> protrudes past viewport (right: ${Math.round(rect.right)}px > ${vw}px).`
          });
        }
      }
    }

    // 2. TOUCH TARGETS (WCAG 2.5.5 / RICO Mobile UI)
    const interactives = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], .card-stepper-btn'));
    for (const el of interactives) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Only check visible interactive elements
      if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        continue;
      }

      // Check for pseudo-element touch pads (::before / ::after)
      const beforeStyle = window.getComputedStyle(el, '::before');
      const afterStyle = window.getComputedStyle(el, '::after');
      const hasPseudoTouchPad = 
        (parseFloat(beforeStyle.width) >= 44 && parseFloat(beforeStyle.height) >= 44) ||
        (parseFloat(afterStyle.width) >= 44 && parseFloat(afterStyle.height) >= 44);

      if (isMobile && (rect.width < 44 || rect.height < 44) && !hasPseudoTouchPad) {
        const text = (el.innerText || el.getAttribute('aria-label') || el.name || el.className || '').trim().slice(0, 25);
        const tag = el.tagName.toLowerCase();
        const cls = el.className ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : '';
        issues.touchTargets.push({
          element: `<${tag}${cls}> "${text}"`,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          rule: 'WCAG 2.5.5 (44x44px minimum touch target)'
        });
      }
    }

    // 3. READABILITY & CONTRAST HELPER
    function parseRgb(colorStr) {
      if (!colorStr) return null;
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return {
        r: parseInt(m[1], 10),
        g: parseInt(m[2], 10),
        b: parseInt(m[3], 10),
        a: m[4] !== undefined ? parseFloat(m[4]) : 1
      };
    }

    function getLuminance(rgb) {
      const a = [rgb.r, rgb.g, rgb.b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }

    function getContrast(rgb1, rgb2) {
      const lum1 = getLuminance(rgb1);
      const lum2 = getLuminance(rgb2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    function getEffectiveBg(el) {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const style = window.getComputedStyle(cur);
        const bg = parseRgb(style.backgroundColor);
        if (bg && bg.a > 0.8) {
          return bg;
        }
        cur = cur.parentElement;
      }
      return { r: 247, g: 243, b: 236, a: 1 }; // Default warm parchment background
    }

    const textNodes = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span, label, a, button, .price-pill, .badge, .product-title, .product-desc'));
    const checkedTexts = new Set();

    for (const el of textNodes) {
      // Only inspect leaf or direct text elements
      if (el.children.length > 2) continue;
      const text = el.innerText ? el.innerText.trim() : '';
      if (!text || text.length < 2 || checkedTexts.has(text)) continue;
      checkedTexts.add(text);

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') continue;

      const fg = parseRgb(style.color);
      const bg = getEffectiveBg(el);
      const fontSize = parseFloat(style.fontSize);
      const fontWeight = parseInt(style.fontWeight, 10) || 400;
      const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
      const minRequired = isLarge ? 3.0 : 4.5;

      if (fg && bg) {
        const ratio = getContrast(fg, bg);
        if (ratio < minRequired && ratio > 1.05) {
          issues.contrast.push({
            text: text.slice(0, 30),
            fontSize: `${fontSize}px`,
            fontWeight,
            contrast: ratio.toFixed(2),
            required: minRequired,
            fg: style.color,
            bg: `rgb(${bg.r},${bg.g},${bg.b})`
          });
        }
      }

      // Check typography sizes and line heights
      if (fontSize < 11) {
        issues.typography.push({
          type: 'SUB_MINIMUM_FONT_SIZE',
          detail: `Text "${text.slice(0, 20)}" has font-size ${fontSize}px (< 11px micro-copy limit).`
        });
      }

      const lineHeightVal = parseFloat(style.lineHeight);
      if (!isNaN(lineHeightVal) && fontSize > 0) {
        const ratio = lineHeightVal / fontSize;
        if (ratio < 1.15 && ['h1', 'h2', 'h3', 'p'].includes(el.tagName.toLowerCase())) {
          issues.typography.push({
            type: 'TIGHT_ARABIC_LINE_HEIGHT',
            detail: `<${el.tagName.toLowerCase()}> "${text.slice(0, 20)}" has line-height ratio ${ratio.toFixed(2)} (Arabic ascenders/descenders may clip).`
          });
        }
      }
    }

    // Check inputs on mobile for font-size >= 16px (iOS auto-zoom prevention)
    if (isMobile) {
      const inputs = Array.from(document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea'));
      for (const input of inputs) {
        const style = window.getComputedStyle(input);
        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 16) {
          const name = input.name || input.placeholder || input.className || 'input';
          issues.typography.push({
            type: 'MOBILE_INPUT_AUTO_ZOOM_RISK',
            detail: `Input "${name}" has font-size ${fontSize}px (< 16px triggers iOS Safari auto-zoom).`
          });
        }
      }
    }

    // 4. PAGE HIERARCHY
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingLevels = headings.map(h => ({
      level: parseInt(h.tagName[1], 10),
      text: h.innerText.trim().slice(0, 25),
      fontSize: parseFloat(window.getComputedStyle(h).fontSize)
    }));

    const h1Count = headings.filter(h => h.tagName.toLowerCase() === 'h1').length;
    if (h1Count === 0) {
      issues.hierarchy.push({
        type: 'MISSING_H1_HEADING',
        detail: 'Page lacks a semantic <h1> landmark heading.'
      });
    } else if (h1Count > 1) {
      issues.hierarchy.push({
        type: 'MULTIPLE_H1_HEADINGS',
        detail: `Found ${h1Count} <h1> headings on the page; standard semantic document hierarchy recommends exactly one.`
      });
    }

    // Check for skipped heading levels (e.g. h1 followed directly by h3)
    for (let i = 0; i < headingLevels.length - 1; i++) {
      const cur = headingLevels[i].level;
      const next = headingLevels[i + 1].level;
      if (next > cur + 1) {
        issues.hierarchy.push({
          type: 'SKIPPED_HEADING_LEVEL',
          detail: `Heading sequence jumps from <h${cur}> ("${headingLevels[i].text}") to <h${next}> ("${headingLevels[i + 1].text}").`
        });
      }
    }

    // Check landmarks
    const mainCount = document.querySelectorAll('main, [role="main"]').length;
    const navCount = document.querySelectorAll('nav, [role="navigation"]').length;

    return {
      viewport: { width: vw, height: vh },
      headingSummary: headingLevels,
      landmarks: { mainCount, navCount },
      issues
    };
  }, { pageName, viewportName });
}

async function runFullAudit() {
  console.log('============================================================');
  console.log('  e-Menu Playwright Visual & Architectural UI Audit');
  console.log('============================================================\n');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allAuditResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`🔍 AUDITING VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    console.log(`------------------------------------------------------------`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      locale: 'ar-LY'
    });

    const page = await context.newPage();

    for (const pageConfig of PAGES_TO_AUDIT) {
      console.log(`\nTesting Page: ${pageConfig.name} (${pageConfig.url})`);
      
      try {
        await page.goto(pageConfig.url, { waitUntil: 'networkidle', timeout: 15000 });
        
        // Wait for key elements to render
        try {
          await page.waitForSelector(pageConfig.waitSelector, { timeout: 4000 });
        } catch (e) {
          // Selector might not match if view has alternate state, proceed gracefully
        }

        // Wait an extra 500ms for animations and tokens to settle
        await page.waitForTimeout(600);

        // Capture high-res screenshot
        const screenshotFileName = `${pageConfig.name}_${vp.name}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFileName);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`  📸 Screenshot saved: ${screenshotFileName}`);

        // Run deep programmatic audit
        const auditData = await runDomAudit(page, pageConfig.name, vp.name);
        
        const pageResult = {
          page: pageConfig.name,
          viewport: vp.name,
          screenshot: screenshotFileName,
          ...auditData
        };

        allAuditResults.push(pageResult);

        // Print quick summary
        const { overflow, touchTargets, contrast, typography, hierarchy } = auditData.issues;
        const totalIssues = overflow.length + touchTargets.length + contrast.length + typography.length + hierarchy.length;
        
        if (totalIssues === 0) {
          console.log(`  ✅ Perfect Score! Zero placement, contrast, or hierarchy defects.`);
        } else {
          console.log(`  ⚠️ Issues Detected: ${totalIssues}`);
          if (overflow.length) console.log(`     - Overflow: ${overflow.length}`);
          if (touchTargets.length) console.log(`     - Touch Targets (<44px): ${touchTargets.length}`);
          if (contrast.length) console.log(`     - Low Contrast: ${contrast.length}`);
          if (typography.length) console.log(`     - Typography/Inputs: ${typography.length}`);
          if (hierarchy.length) console.log(`     - Heading Hierarchy: ${hierarchy.length}`);
        }

      } catch (err) {
        console.error(`  ❌ Failed to audit ${pageConfig.name}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();

  // Save full audit JSON report
  const reportPath = path.join(SCREENSHOTS_DIR, 'audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allAuditResults, null, 2), 'utf-8');
  console.log(`\n============================================================`);
  console.log(`✓ Audit complete! Full report written to: ${reportPath}`);
  console.log(`============================================================\n`);
}

runFullAudit().catch(err => {
  console.error('Fatal error during Playwright UI audit:', err);
  process.exit(1);
});
