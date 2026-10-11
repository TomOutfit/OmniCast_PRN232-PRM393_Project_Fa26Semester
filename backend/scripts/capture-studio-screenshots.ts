import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\d1ef9869-10aa-4123-b8e2-c1f2e4c6c546';

async function main() {
  console.log('🚀 Launching Chrome to capture UI screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000'],
    defaultViewport: { width: 1600, height: 1000 },
  });

  const page = await browser.newPage();

  try {
    // 1. Visit Home / Channels page
    console.log('📸 Capturing Home / Browse page...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_omnicast_home.png') });

    // 2. Login as STAFF
    console.log('🔑 Logging in as STAFF...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'staff@omnicast.dev');
    await page.type('input[type="password"]', 'Staff123!');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_omnicast_login.png') });
    
    // Submit login
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }
    await new Promise(r => setTimeout(r, 3000));

    // 3. Visit Live Studio
    console.log('📸 Capturing Live Studio (/studio/live)...');
    await page.goto('http://localhost:3001/studio/live', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_omnicast_studio_live.png') });

    // 4. Try clicking "Mode 2: Tự Ghi Hình" tab
    console.log('📸 Capturing Self-Record tab (Mode 2)...');
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Mode 2') || text.includes('Tự Ghi Hình') || text.includes('Tự ghi hình'))) {
        await btn.click();
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_omnicast_studio_self_record.png') });
        break;
      }
    }

    // 5. Try clicking "Mode 3: Danh Mục Nguồn" tab
    console.log('📸 Capturing Catalog tab (Mode 3)...');
    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Mode 3') || text.includes('Danh Mục Nguồn') || text.includes('Danh mục nguồn'))) {
        await btn.click();
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_omnicast_studio_catalog.png') });
        break;
      }
    }

    // 6. Visit EPG Schedule (/epg)
    console.log('📸 Capturing EPG Schedule (/epg)...');
    await page.goto('http://localhost:3001/epg', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_omnicast_epg.png') });

    // 7. Visit Channels Overview (/channels)
    console.log('📸 Capturing Channels Overview (/channels)...');
    await page.goto('http://localhost:3001/channels', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '08_omnicast_channels.png') });

    // 8. Visit Sport 1 Channel player (/channels/omni-sport-1)
    console.log('📸 Capturing Channel Player (/channels/omni-sport-1)...');
    await page.goto('http://localhost:3001/channels/omni-sport-1', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_omnicast_channel_player.png') });

    console.log('✅ All screenshots captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
