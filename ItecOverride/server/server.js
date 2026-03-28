const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'posters.json');

const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'override';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'posters';

let mongoCollectionPromise = null;
let mongoClient = null;
let mongoUnavailableLogged = false;

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

const normalizePosterContent = (posterId, payload) => {
  const base = payload || createEmptyPoster(posterId);

  return {
    posterId,
    stickers: Array.isArray(base.stickers) ? base.stickers : [],
    strokes: Array.isArray(base.strokes) ? base.strokes : [],
    updatedAt: typeof base.updatedAt === 'string' ? base.updatedAt : new Date().toISOString(),
  };
};

const mergePosterContent = (base, incoming) => {
  const safeBase = normalizePosterContent(base.posterId, base);
  const safeIncoming = normalizePosterContent(base.posterId, incoming);

  const strokeMap = new Map(safeBase.strokes.map((stroke) => [stroke.id, stroke]));
  const stickerMap = new Map(safeBase.stickers.map((sticker) => [sticker.id, sticker]));

  for (const stroke of safeIncoming.strokes) {
    strokeMap.set(stroke.id, stroke);
  }

  for (const sticker of safeIncoming.stickers) {
    stickerMap.set(sticker.id, sticker);
  }

  return {
    posterId: safeBase.posterId,
    stickers: [...stickerMap.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    strokes: [...strokeMap.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    updatedAt: [safeBase.updatedAt, safeIncoming.updatedAt].filter(Boolean).sort().at(-1) || new Date().toISOString(),
  };
};

const logMongoUnavailableOnce = (reason) => {
  if (mongoUnavailableLogged) return;
  mongoUnavailableLogged = true;
  console.error('[storage] MongoDB indisponibil, fallback pe JSON local.', reason);
};

const getMongoCollection = async () => {
  if (!MONGODB_URI) {
    return null;
  }

  if (mongoCollectionPromise) {
    return mongoCollectionPromise;
  }

  mongoCollectionPromise = (async () => {
    let MongoClient;
    try {
      ({ MongoClient } = require('mongodb'));
    } catch (error) {
      logMongoUnavailableOnce('Lipseste dependinta "mongodb". Ruleaza npm install.');
      return null;
    }

    try {
      mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      await mongoClient.connect();
      const collection = mongoClient.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION);
      await collection.createIndex({ posterId: 1 }, { unique: true });
      console.log(`[storage] MongoDB activ: ${MONGODB_DB_NAME}.${MONGODB_COLLECTION}`);
      return collection;
    } catch (error) {
      logMongoUnavailableOnce(error);
      return null;
    }
  })();

  return mongoCollectionPromise;
};

const readPosterFromFile = (posterId) => {
  const store = readStore();
  return normalizePosterContent(posterId, store.posters[posterId]);
};

const writePosterToFile = (poster) => {
  const normalized = normalizePosterContent(poster.posterId, poster);
  const store = readStore();
  store.posters[normalized.posterId] = normalized;
  writeStore(store);
  return normalized;
};

const readPoster = async (posterId) => {
  const collection = await getMongoCollection();
  if (!collection) {
    return readPosterFromFile(posterId);
  }

  try {
    const document = await collection.findOne({ posterId });
    return normalizePosterContent(posterId, document);
  } catch (error) {
    logMongoUnavailableOnce(error);
    return readPosterFromFile(posterId);
  }
};

const writePoster = async (poster) => {
  const normalized = normalizePosterContent(poster.posterId, poster);
  const collection = await getMongoCollection();
  if (!collection) {
    return writePosterToFile(normalized);
  }

  try {
    await collection.updateOne({ posterId: normalized.posterId }, { $set: normalized }, { upsert: true });
    return normalized;
  } catch (error) {
    logMongoUnavailableOnce(error);
    return writePosterToFile(normalized);
  }
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
    sendJson(response, 200, {
      ok: true,
      port: PORT,
      storage: MONGODB_URI ? 'mongodb-or-fallback' : 'file',
    });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posters' && pathParts[2]) {
    const posterId = pathParts[2];
    const current = await readPoster(posterId);

    if (request.method === 'GET' && pathParts.length === 3) {
      sendJson(response, 200, current);
      return;
    }

    if (request.method === 'POST' && pathParts[3] === 'sync') {
      try {
        const incomingBody = await parseBody(request);
        const incoming = normalizePosterContent(posterId, {
          ...incomingBody,
          posterId,
        });
        const merged = mergePosterContent(current, incoming);
        const saved = await writePoster(merged);
        sendJson(response, 200, saved);
        return;
      } catch (error) {
        sendJson(response, 400, { error: 'Invalid JSON body.', details: String(error) });
        return;
      }
    }
  }

  sendJson(response, 404, { error: 'Route not found.' });
});

const closeMongoClient = async () => {
  if (!mongoClient) return;
  try {
    await mongoClient.close();
  } catch {
    // Ignore shutdown errors
  }
};

process.on('SIGINT', async () => {
  await closeMongoClient();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongoClient();
  process.exit(0);
});

server.listen(PORT, async () => {
  ensureStorage();
  if (!MONGODB_URI) {
    console.log('[storage] MONGODB_URI nu este setat. Se foloseste storage local JSON.');
  } else {
    await getMongoCollection();
  }
  console.log(`Override server listening on http://0.0.0.0:${PORT}`);
});
