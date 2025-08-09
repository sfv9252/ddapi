const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function crawlData(server, name) {
  const url = `https://dundam.xyz/search?server=${encodeURIComponent(server)}&name=${encodeURIComponent(name)}`;
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  );

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('span.val', { timeout: 10000 });

  const values = await page.$$eval('span.val', elements => elements.map(el => el.textContent.trim()));

  await browser.close();

  const value1 = values[1] || 'X';
  const value2 = values[2] || 'X';

  const fileName = `./data_${server}_${name}.json`;
  await fs.writeFile(fileName, JSON.stringify({ value1, value2, updated: new Date() }, null, 2));
  console.log(`크롤링 완료: server=${server}, name=${name}`);
}

module.exports = { crawlData };
