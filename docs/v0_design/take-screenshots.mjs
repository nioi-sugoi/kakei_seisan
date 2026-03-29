import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';

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

// Convert element id to filename: "screen-04b-filter-modal" → "04b_filter_modal.png"
function idToFilename(id) {
  return id.replace(/^screen-/, '').replaceAll('-', '_') + '.png';
}

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

  // Auto-detect screens from HTML instead of maintaining a manual list
  const screenIds = await page.$$eval('[id^="screen-"]', els => els.map(el => el.id));
  console.log(`Detected ${screenIds.length} screens from HTML\n`);

  for (const id of screenIds) {
    const filename = idToFilename(id);
    const element = page.locator(`#${id}`);
    const box = await element.boundingBox();
    if (!box) {
      console.error(`Could not find element: ${id}`);
      continue;
    }
    // Screenshot just the screen element (the phone frame)
    await element.screenshot({
      path: join(screenshotsDir, filename),
      type: 'png',
    });
    console.log(`Screenshot saved: ${filename}`);
  }

  await browser.close();
  console.log('\nAll screenshots taken successfully!');
}

main().catch(console.error);
