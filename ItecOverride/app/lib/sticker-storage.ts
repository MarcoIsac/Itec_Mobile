import AsyncStorage from '@react-native-async-storage/async-storage';

export const STICKERS_STORAGE_KEY = '@saved_stickers_paths';

type PersistedSticker = string | { uri?: unknown };

const parseStoredStickers = (rawValue: string | null): string[] => {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as PersistedSticker[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.uri === 'string') return item.uri;
        return '';
      })
      .filter((uri): uri is string => Boolean(uri));
  } catch {
    return [];
  }
};

export const loadSavedStickerUris = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(STICKERS_STORAGE_KEY);
  return parseStoredStickers(raw);
};

export const saveStickerUri = async (uri: string): Promise<string[]> => {
  const saved = await loadSavedStickerUris();
  saved.push(uri);
  await AsyncStorage.setItem(STICKERS_STORAGE_KEY, JSON.stringify(saved));
  return saved;
};
