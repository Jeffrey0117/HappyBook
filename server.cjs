'use strict';
// HappyBook production server：靜態 dist/（SPA fallback）+ 閱讀資料庫 API（OCR / AI 討論）
// 零依賴。API 需要 LetMeUse token（ES256/JWKS 驗章）；AI 檢索只讀「該使用者自己的」閱讀紀錄。
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 自帶 .env loader（PM2 不注入檔案）
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch (err) { /* no .env */ }

const PORT = process.env.PORT || 4048;
const DIST = path.join(__dirname, 'dist');
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const SELFIZE_TOKEN = process.env.SELFIZE_TOKEN || '';
const LMU_APP_ID = process.env.LMU_APP_ID || 'app_HB2026swap';
const SELFIZE_URL = (process.env.SELFIZE_URL || 'https://selfize.isnowfriend.com').replace(/\/$/, '');
const LMU_URL = (process.env.LETMEUSE_URL || 'https://letmeuse.isnowfriend.com').replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

/* ---------- LetMeUse ES256 驗章（JWKS 快取 10 分鐘） ---------- */
let jwks = { keys: null, at: 0 };
async function getJwks() {
  if (jwks.keys && Date.now() - jwks.at < 10 * 60 * 1000) return jwks.keys;
  const res = await fetch(LMU_URL + '/api/jwks');
  const data = await res.json();
  jwks = { keys: data.keys || [], at: Date.now() };
  return jwks.keys;
}
async function verifyLmu(req) {
  try {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    const [h, p, s] = token.split('.');
    if (!s) return null;
    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    if (header.alg !== 'ES256') return null;
    const keys = await getJwks();
    const jwk = keys.find((k) => k.kid === header.kid) || keys[0];
    if (!jwk) return null;
    const pub = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const ok = crypto.verify('sha256', Buffer.from(h + '.' + p), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    payload.sub = payload.sub || payload.userId;
    if (!payload.sub || !payload.exp || payload.exp * 1000 < Date.now()) return null;
    return { payload, token };
  } catch (err) {
    return null;
  }
}

/* ---------- helpers ---------- */
const sendJson = (res, code, obj) =>
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(obj));

const readBody = (req, max = 2 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > max) {
        req.destroy();
        reject(new Error('too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

async function openai(messages, maxTokens) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OPENAI_KEY },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens || 1200, temperature: 0.4 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || 'openai error');
  return data.choices[0].message.content;
}

/* ---------- /api/ocr：書頁照片 → 文字（gpt-4o-mini vision） ---------- */
async function handleOcr(req, res) {
  const auth = await verifyLmu(req);
  if (!auth) return sendJson(res, 401, { error: '請先登入' });
  if (!OPENAI_KEY) return sendJson(res, 503, { error: 'OCR 尚未設定' });
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, { error: '資料格式不對' });
  }
  const images = Array.isArray(body.images) ? body.images.filter((u) => /^https:\/\//.test(String(u))).slice(0, 8) : [];
  if (!images.length) return sendJson(res, 400, { error: '沒有圖片' });
  try {
    const content = [
      { type: 'text', text: '這些是書頁照片（依序）。請把頁面上的文字完整辨識出來，保持段落，不要翻譯、不要摘要、不要加任何評論。無法辨識的字用〔?〕標示。' },
      ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    const text = await openai([{ role: 'user', content }], 3000);
    sendJson(res, 200, { text });
  } catch (err) {
    console.error('ocr error:', err.message);
    sendJson(res, 502, { error: '辨識失敗，再試一次' });
  }
}

/* ---------- /api/summarize：原文 → 重點整理（存進 ai_summary，與原文分離） ---------- */
async function handleSummarize(req, res) {
  const auth = await verifyLmu(req);
  if (!auth) return sendJson(res, 401, { error: '請先登入' });
  if (!OPENAI_KEY) return sendJson(res, 503, { error: 'AI 尚未設定' });
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, { error: '資料格式不對' });
  }
  const text = String(body.text || '').slice(0, 20000);
  if (!text.trim()) return sendJson(res, 400, { error: '沒有內容' });
  try {
    const out = await openai(
      [
        { role: 'system', content: '你是閱讀筆記助手。把使用者給的書籍段落整理成 3-6 條重點，繁體中文，只根據given文字，不要補充書裡沒有的內容。' },
        { role: 'user', content: text },
      ],
      800
    );
    sendJson(res, 200, { summary: out });
  } catch (err) {
    sendJson(res, 502, { error: 'AI 整理失敗' });
  }
}

/* ---------- /api/ask：AI 討論室（檢索本人閱讀紀錄 → 附來源回答） ---------- */
function scoreRecord(rec, question) {
  // 簡易關鍵詞相關性：v1 不上 embedding，字詞重疊打分
  const hay = [rec.source_text, rec.my_note, rec.ai_summary, rec.chapter, (rec.topic_tags || []).join(' ')].join(' ').toLowerCase();
  const terms = question.toLowerCase().split(/[\s，。、？！?!,.]+/).filter((t) => t.length >= 2);
  let score = 0;
  for (const t of terms) if (hay.includes(t)) score += t.length;
  return score;
}

async function handleAsk(req, res) {
  const auth = await verifyLmu(req);
  if (!auth) return sendJson(res, 401, { error: '請先登入' });
  if (!OPENAI_KEY) return sendJson(res, 503, { error: 'AI 尚未設定' });
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, { error: '資料格式不對' });
  }
  const question = String(body.question || '').slice(0, 1000);
  if (!question.trim()) return sendJson(res, 400, { error: '問題呢？' });
  try {
    // 用「使用者自己的 token」去 selfize 拿紀錄 → 隔離由 selfize 強制，這裡拿不到別人的
    const r = await fetch(SELFIZE_URL + '/api/collections/reading_records/records?perPage=200', {
      headers: { Authorization: 'Bearer ' + auth.token },
    });
    const data = await r.json();
    if (!r.ok) return sendJson(res, 502, { error: '讀取閱讀紀錄失敗' });
    const records = (data.items || []).map((rec) => ({
      ...rec,
      topic_tags: typeof rec.topic_tags === 'string' ? JSON.parse(rec.topic_tags || '[]') : rec.topic_tags,
    }));
    if (!records.length) return sendJson(res, 200, { answer: '你的閱讀資料庫還是空的——先去「書架 → 新增閱讀紀錄」收錄幾段內容，我才有東西可以引用。', sources: [] });

    // 撈書名做來源標示
    const booksRes = await fetch(SELFIZE_URL + '/api/collections/books/records?perPage=200');
    const booksData = await booksRes.json().catch(() => ({ items: [] }));
    const bookTitle = {};
    for (const b of booksData.items || []) bookTitle[b.id] = b.title;

    const ranked = records
      .map((rec) => ({ rec, score: scoreRecord(rec, question) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    const picked = ranked.filter((x) => x.score > 0).map((x) => x.rec);
    const pool = picked.length ? picked : records.slice(0, 4); // 沒命中就給最近幾筆

    const context = pool
      .map((rec, i) => {
        const title = bookTitle[rec.book_id] || rec.book_id;
        return `【來源 ${i + 1}】《${title}》${rec.chapter ? ' ' + rec.chapter : ''}${rec.pages ? ' p.' + rec.pages : ''}
原文摘錄：${(rec.source_text || '（未收錄原文）').slice(0, 1500)}
讀者心得：${(rec.my_note || '（無）').slice(0, 500)}`;
      })
      .join('\n\n');

    const answer = await openai(
      [
        {
          role: 'system',
          content:
            '你是使用者的私人閱讀顧問。只根據提供的「來源」回答問題，引用時標明【來源 N】。嚴格區分三種情況：(1)書中明確提到——有來源原文支持；(2)依書中觀點推論——是你把觀念套用到情境，要講明是推論；(3)目前資料不足——來源沒有相關內容就直說「你的資料庫還沒收錄相關內容」，絕對不要編造書裡沒有的內容。使用者自己的心得與作者原文要分開對待，不可混為一談。繁體中文回答，務實、對話式。',
        },
        { role: 'user', content: `我的問題：${question}\n\n我的閱讀資料庫相關內容：\n\n${context}` },
      ],
      1400
    );

    sendJson(res, 200, {
      answer,
      sources: pool.map((rec) => ({
        id: rec.id,
        book: bookTitle[rec.book_id] || rec.book_id,
        chapter: rec.chapter || '',
        pages: rec.pages || '',
        excerpt: (rec.source_text || '').slice(0, 200),
        images: typeof rec.images === 'string' ? JSON.parse(rec.images || '[]') : rec.images || [],
      })),
    });
  } catch (err) {
    console.error('ask error:', err.message);
    sendJson(res, 502, { error: 'AI 回答失敗，再試一次' });
  }
}

/* ---------- /api/public/records：公開書牆（引句＋批註模式；全文只在伺服器端，絕不回傳） ---------- */
async function handlePublicRecords(req, res, searchParams) {
  const user = String(searchParams.get('user') || '');
  if (!/^usr_[A-Za-z0-9]+$/.test(user)) return sendJson(res, 400, { error: 'user 參數不對' });
  if (!SELFIZE_TOKEN) return sendJson(res, 503, { error: '公開書牆尚未設定' });
  try {
    const owner = LMU_APP_ID + ':' + user;
    const r = await fetch(SELFIZE_URL + '/api/collections/reading_records/records?perPage=200&sort=-created_at', {
      headers: { Authorization: 'Bearer ' + SELFIZE_TOKEN },
    });
    const data = await r.json();
    if (!r.ok) return sendJson(res, 502, { error: '讀取失敗' });
    const parse = (v, fb) => {
      try { return typeof v === 'string' ? JSON.parse(v) : (v == null ? fb : v); } catch (e) { return fb; }
    };
    const records = (data.items || [])
      .filter((rec) => rec._owner === owner && rec.visibility === 'public')
      .map((rec) => {
        const text = rec.source_text || '';
        const hls = parse(rec.highlights, []) || [];
        const slice = (h) => text.slice(Math.max(0, h.s || 0), Math.min(text.length, h.e || 0));
        return {
          id: rec.id,
          book_id: rec.book_id,
          chapter: rec.chapter || '',
          pages: rec.pages || '',
          ai_summary: rec.ai_summary || '',
          my_note: rec.my_note || '',
          topic_tags: parse(rec.topic_tags, []) || [],
          created_at: rec.created_at,
          quotes: hls
            .filter((h) => h.k === 'hl' || h.k === 'ul')
            .map((h) => ({ k: h.k, c: h.c || 'y', text: slice(h) }))
            .filter((q) => q.text.trim()),
          notes: hls
            .filter((h) => h.k === 'note')
            .map((h) => ({ text: slice(h), note: h.t || '' }))
            .filter((n) => n.note.trim()),
        };
      });
    sendJson(res, 200, { records });
  } catch (err) {
    console.error('public records error:', err.message);
    sendJson(res, 502, { error: '讀取失敗' });
  }
}

/* ---------- server ---------- */
http
  .createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, 'http://x');
      const p = decodeURIComponent(reqUrl.pathname);
      if (req.method === 'POST' && p === '/api/ocr') return await handleOcr(req, res);
      if (req.method === 'POST' && p === '/api/summarize') return await handleSummarize(req, res);
      if (req.method === 'POST' && p === '/api/ask') return await handleAsk(req, res);
      if (req.method === 'GET' && p === '/api/public/records') return await handlePublicRecords(req, res, reqUrl.searchParams);

      let file = path.normalize(path.join(DIST, p));
      if (file !== DIST && !file.startsWith(DIST + path.sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(DIST, 'index.html'); // SPA fallback
      }
      const ext = path.extname(file).toLowerCase();
      const cache = /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache';
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      console.error('request error:', err);
      if (!res.headersSent) res.writeHead(500).end('error');
    }
  })
  .listen(PORT, () => process.stdout.write(`happybook on :${PORT}\n`));

process.on('uncaughtException', (err) => console.error('uncaught:', err));
process.on('unhandledRejection', (err) => console.error('unhandled:', err));
