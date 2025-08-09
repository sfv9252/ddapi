const express = require('express');
const fs = require('fs').promises;
const cron = require('node-cron');
const { crawlData } = require('./crawler');

const app = express();

let targets = [];

// 크롤링 대상 목록 로드 함수
async function loadTargets() {
  try {
    const data = await fs.readFile('./targets.json', 'utf-8');
    targets = JSON.parse(data);
    console.log('크롤링 대상 목록 로드 완료:', targets);
  } catch (err) {
    console.error('targets.json 로드 실패:', err);
    targets = [];
  }
}

// 시작 시 목록 로드
loadTargets();

// 10분마다 크롤링 스케줄러 실행
cron.schedule('*/10 * * * *', async () => {
  if (targets.length === 0) {
    console.log('크롤링 대상이 없습니다.');
    return;
  }
  console.log('크롤링 시작', new Date().toLocaleString());
  for (const target of targets) {
    try {
      await crawlData(target.server, target.name);
    } catch (err) {
      console.error(`크롤링 실패: server=${target.server}, name=${target.name}`, err);
    }
  }
  console.log('크롤링 완료', new Date().toLocaleString());
});

app.get('/', async (req, res) => {
  const server = req.query.server;
  const name = req.query.name;

  if (!server || !name) {
    return res.status(400).send('server와 name 파라미터가 필요합니다.');
  }

  const fileName = `./data_${server}_${name}.json`;
  try {
    const data = await fs.readFile(fileName, 'utf-8');
    const parsed = JSON.parse(data);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`${parsed.value1},${parsed.value2}`);
  } catch {
    res.status(500).send('데이터가 없습니다. 잠시 후 다시 시도하세요.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행중: http://localhost:${PORT}`);
});
