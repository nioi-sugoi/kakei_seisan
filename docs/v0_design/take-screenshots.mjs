import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotsDir = join(__dirname, 'screenshots');
const htmlPath = join(__dirname, 'mockups.html');

// Ensure screenshots dir exists
mkdirSync(screenshotsDir, { recursive: true });

// Delete all existing PNGs in screenshots dir
const existingFiles = readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
for (const file of existingFiles) {
  unlinkSync(join(screenshotsDir, file));
  console.log(`Deleted old screenshot: ${file}`);
}

const screens = [
  { id: 'screen-01-login', filename: '01_login.png' },
  { id: 'screen-02-otp', filename: '02_otp.png' },
  { id: 'screen-03-timeline-solo', filename: '03_timeline_solo.png' },
  { id: 'screen-04-timeline-managed', filename: '04_timeline_managed.png' },
  { id: 'screen-05-entry-form', filename: '05_entry_form.png' },
  { id: 'screen-05b-entry-edit-form', filename: '05b_entry_edit_form.png' },
  { id: 'screen-06-entry-detail', filename: '06_entry_detail.png' },
  { id: 'screen-07-entry-detail-cancelled', filename: '07_entry_detail_cancelled.png' },
  { id: 'screen-08-settlement', filename: '08_settlement.png' },
  { id: 'screen-08b-settlement-detail', filename: '08b_settlement_detail.png' },
  { id: 'screen-08c-image-viewer', filename: '08c_image_viewer.png' },
  { id: 'screen-09-partner-invitation', filename: '09_partner_invitation.png' },
  { id: 'screen-10-partner-shared', filename: '10_partner_shared.png' },
  { id: 'screen-11-partner-managed', filename: '11_partner_managed.png' },
  { id: 'screen-12-approval', filename: '12_approval.png' },
  { id: 'screen-13-settings', filename: '13_settings.png' },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`file://${htmlPath}`);
  // Wait for Tailwind CDN to load
  await page.waitForTimeout(2000);

  for (const screen of screens) {
    const element = page.locator(`#${screen.id}`);
    const box = await element.boundingBox();
    if (!box) {
      console.error(`Could not find element: ${screen.id}`);
      continue;
    }
    // Screenshot just the screen element (the phone frame)
    await element.screenshot({
      path: join(screenshotsDir, screen.filename),
      type: 'png',
    });
    console.log(`Screenshot saved: ${screen.filename}`);
  }

  await browser.close();
  console.log('\nAll screenshots taken successfully!');
}

main().catch(console.error);
