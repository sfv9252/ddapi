// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const INTERVAL = 1000 * 60 * 5; // 5분마다 크롤링

let results = {}; // 크롤링 데이터 저장소

// ===== 크롤링 함수 =====
async function crawlData() {
  console.log('크롤링 시작...');

  let list = [];
  try {
    list = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
  } catch {
    console.warn('⚠ config.json 파일이 없어 목록이 비어있습니다.');
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const { server, name } of list) {
      try {
        const url = `https://dundam.xyz/search?server=${encodeURIComponent(server)}&name=${encodeURIComponent(name)}`;
        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        );

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
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
  } catch (err) {
    console.error('🚨 브라우저 실행 실패:', err.message);
  } finally {
    if (browser) await browser.close();
    console.log('크롤링 완료.');
  }
}

// ===== API 엔드포인트 =====

// 전체 결과 조회
app.get('/', (req, res) => {
  res.json(results);
});

// 개별 조회
app.get('/check', (req, res) => {
  const { server, name } = req.query;

  if (!server || !name) {
    return res.status(400).json({ error: 'server와 name 파라미터가 필요합니다.' });
  }

  const key = `${server}-${name}`;
  if (results[key]) {
    return res.json({ server, name, ...results[key] });
  } else {
    return res.status(404).json({ error: '해당 데이터가 없습니다. (아직 크롤링 전일 수 있음)' });
  }
});

// ===== 서버 실행 =====
app.listen(PORT, () => {
  console.log(`서버 실행중: http://localhost:${PORT}`);
  
  // 서버 켜지고 나서 백그라운드 크롤링 시작
  crawlData();
  setInterval(crawlData, INTERVAL);
});
