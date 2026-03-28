const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'posters.json');

const ensureStorage = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ posters: {} }, null, 2));
  }
};

const readStore = () => {
  ensureStorage();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

const writeStore = (store) => {
  ensureStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
};

const createEmptyPoster = (posterId) => ({
  posterId,
  stickers: [],
  strokes: [],
  updatedAt: new Date(0).toISOString(),
});

const mergePosterContent = (base, incoming) => {
  const strokeMap = new Map(base.strokes.map((stroke) => [stroke.id, stroke]));
  const stickerMap = new Map(base.stickers.map((sticker) => [sticker.id, sticker]));

  for (const stroke of incoming.strokes || []) {
    strokeMap.set(stroke.id, stroke);
  }

  for (const sticker of incoming.stickers || []) {
    stickerMap.set(sticker.id, sticker);
  }

  return {
    posterId: incoming.posterId || base.posterId,
    stickers: [...stickerMap.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    strokes: [...strokeMap.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    updatedAt: [base.updatedAt, incoming.updatedAt].filter(Boolean).sort().at(-1) || new Date().toISOString(),
  };
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(payload));
};

const parseBody = (request) =>
  new Promise((resolve, reject) => {
    let raw = '';

    request.on('data', (chunk) => {
      raw += chunk;
    });

    request.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'Missing URL.' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Origin': '*',
    });
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true, port: PORT });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posters' && pathParts[2]) {
    const posterId = pathParts[2];
    const store = readStore();
    const current = store.posters[posterId] || createEmptyPoster(posterId);

    if (request.method === 'GET' && pathParts.length === 3) {
      sendJson(response, 200, current);
      return;
    }

    if (request.method === 'POST' && pathParts[3] === 'sync') {
      try {
        const incoming = await parseBody(request);
        const merged = mergePosterContent(current, incoming);
        store.posters[posterId] = merged;
        writeStore(store);
        sendJson(response, 200, merged);
        return;
      } catch (error) {
        sendJson(response, 400, { error: 'Invalid JSON body.', details: String(error) });
        return;
      }
    }
  }

  sendJson(response, 404, { error: 'Route not found.' });
});

server.listen(PORT, () => {
  ensureStorage();
  console.log(`Override server listening on http://0.0.0.0:${PORT}`);
});
