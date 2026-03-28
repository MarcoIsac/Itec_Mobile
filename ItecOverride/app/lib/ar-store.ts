import * as FileSystem from 'expo-file-system/legacy';

import type { PosterContent, PosterId, StickerRecord } from './ar-types';

const SERVER_URL = process.env.EXPO_PUBLIC_OVERRIDE_SERVER_URL?.replace(/\/$/, '') ?? '';
const DATA_DIR = `${FileSystem.documentDirectory ?? ''}override`;
const POSTERS_DIR = `${DATA_DIR}/posters`;
const STICKERS_DIR = `${DATA_DIR}/stickers`;
const DEVICE_FILE = `${DATA_DIR}/device.json`;

type PersistedDevice = {
  id: string;
};

const ensureDir = async (path: string) => {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
};

const ensureBaseDirs = async () => {
  await ensureDir(DATA_DIR);
  await ensureDir(POSTERS_DIR);
  await ensureDir(STICKERS_DIR);
};

const buildEmptyPosterContent = (posterId: PosterId): PosterContent => ({
  posterId,
  updatedAt: new Date(0).toISOString(),
  strokes: [],
  stickers: [],
});

const posterFilePath = (posterId: PosterId) => `${POSTERS_DIR}/${posterId}.json`;

const readLocalPoster = async (posterId: PosterId): Promise<PosterContent> => {
  await ensureBaseDirs();
  const filePath = posterFilePath(posterId);
  const info = await FileSystem.getInfoAsync(filePath);

  if (!info.exists) {
    return buildEmptyPosterContent(posterId);
  }

  const raw = await FileSystem.readAsStringAsync(filePath);
  return JSON.parse(raw) as PosterContent;
};

const writeLocalPoster = async (content: PosterContent) => {
  await ensureBaseDirs();
  await FileSystem.writeAsStringAsync(posterFilePath(content.posterId), JSON.stringify(content, null, 2));
};

const mergePosterContent = (base: PosterContent, incoming: PosterContent): PosterContent => {
  const strokeMap = new Map(base.strokes.map((stroke) => [stroke.id, stroke]));
  const stickerMap = new Map(base.stickers.map((sticker) => [sticker.id, sticker]));

  for (const stroke of incoming.strokes) {
    strokeMap.set(stroke.id, stroke);
  }

  for (const sticker of incoming.stickers) {
    stickerMap.set(sticker.id, sticker);
  }

  return {
    posterId: base.posterId,
    updatedAt: [base.updatedAt, incoming.updatedAt].sort().at(-1) ?? new Date().toISOString(),
    strokes: [...strokeMap.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    stickers: [...stickerMap.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  };
};

const persistStickerImage = async (sticker: StickerRecord): Promise<StickerRecord> => {
  if (!sticker.imageData) {
    return sticker;
  }

  await ensureBaseDirs();
  const extension = sticker.mimeType.includes('png') ? 'png' : 'jpg';
  const fileUri = `${STICKERS_DIR}/${sticker.id}.${extension}`;
  const info = await FileSystem.getInfoAsync(fileUri);

  if (!info.exists) {
    await FileSystem.writeAsStringAsync(fileUri, sticker.imageData, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return {
    ...sticker,
    imageUri: fileUri,
  };
};

const hydrateStickerImages = async (content: PosterContent): Promise<PosterContent> => {
  const stickers = await Promise.all(content.stickers.map((sticker) => persistStickerImage(sticker)));

  return {
    ...content,
    stickers,
  };
};

const serverFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${SERVER_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Server request failed with ${response.status}`);
  }

  return (await response.json()) as T;
};

export const getServerUrl = () => SERVER_URL;

export const getDeviceId = async (): Promise<string> => {
  await ensureBaseDirs();
  const deviceInfo = await FileSystem.getInfoAsync(DEVICE_FILE);

  if (deviceInfo.exists) {
    const raw = await FileSystem.readAsStringAsync(DEVICE_FILE);
    return (JSON.parse(raw) as PersistedDevice).id;
  }

  const id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await FileSystem.writeAsStringAsync(DEVICE_FILE, JSON.stringify({ id }, null, 2));
  return id;
};

export const loadPosterContent = async (posterId: PosterId): Promise<PosterContent> => {
  const localContent = await readLocalPoster(posterId);

  if (!SERVER_URL) {
    return hydrateStickerImages(localContent);
  }

  try {
    const remoteContent = await serverFetch<PosterContent>(`/api/posters/${posterId}`);
    const merged = mergePosterContent(localContent, remoteContent);
    await writeLocalPoster(merged);
    return hydrateStickerImages(merged);
  } catch {
    return hydrateStickerImages(localContent);
  }
};

export const savePosterContent = async (content: PosterContent): Promise<PosterContent> => {
  const hydrated = await hydrateStickerImages(content);
  await writeLocalPoster(hydrated);

  if (!SERVER_URL) {
    return hydrated;
  }

  try {
    const remoteContent = await serverFetch<PosterContent>(`/api/posters/${content.posterId}/sync`, {
      method: 'POST',
      body: JSON.stringify(content),
    });
    const merged = mergePosterContent(hydrated, remoteContent);
    await writeLocalPoster(merged);
    return hydrateStickerImages(merged);
  } catch {
    return hydrated;
  }
};
