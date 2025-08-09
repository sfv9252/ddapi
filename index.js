const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const INTERVAL = 1000 * 60 * 5; // 5분마다 크롤링

let results = {}; // 크롤링 데이터 저장소

async function crawlData() {
  console.log('크롤링 시작...');

  const list = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
  const browser = await puppeteer.launch({
    headless: true, // 최신 Puppeteer에서는 true/false로 지정
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const { server, name } of list) {
    try {
      const url = `https://dundam.xyz/search?server=${encodeURIComponent(server)}&name=${encodeURIComponent(name)}`;
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      );
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
      await page.waitForSelector('span.val', { timeout: 10000 });

      const [value1, value2] = await page.$$eval('span.val', elements => {
        return [
          elements[1] ? elements[1].textContent.trim() : 'X',
          elements[2] ? elements[2].textContent.trim() : 'X'
        ];
      });

      results[`${server}-${name}`] = { value1, value2, time: new Date().toISOString() };
      console.log(`✅ ${server}-${name}: ${value1}, ${value2}`);
    } catch (err) {
      console.error(`❌ ${server}-${name} 크롤링 실패:`, err.message);
      results[`${server}-${name}`] = { value1: 'X', value2: 'X', time: new Date().toISOString() };
    }
  }

  await browser.close();
  console.log('크롤링 완료.');
}

// 첫 실행 & 주기 실행
crawlData();
setInterval(crawlData, INTERVAL);

// API 엔드포인트
app.get('/', (req, res) => {
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`서버 실행중: http://localhost:${PORT}`);
});
