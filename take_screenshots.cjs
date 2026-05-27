const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  console.log("Navigating to dashboard...");
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, 'assets/screenshots/audit_dashboard_desktop.png') });

  console.log("Navigating to scanner...");
  await page.goto('http://localhost:5173/scanner');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'assets/screenshots/audit_scanner_desktop.png') });

  console.log("Navigating to downloads...");
  await page.goto('http://localhost:5173/downloads');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'assets/screenshots/audit_downloads_desktop.png') });

  console.log("Navigating to about...");
  await page.goto('http://localhost:5173/about');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'assets/screenshots/audit_about_desktop.png') });

  console.log("Navigating to login...");
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'assets/screenshots/audit_login_desktop.png') });

  await browser.close();
  console.log("Done");
}

capture().catch(console.error);
