export type PosterId =
  | 'poster_1'
  | 'poster_2'
  | 'poster_3'
  | 'poster_4'
  | 'poster_5'
  | 'poster_6'
  | 'poster_7'
  | 'poster_8'
  | 'poster_9'
  | 'poster_10';

export type NormalizedPoint = {
  x: number;
  y: number;
};

export type StrokeRecord = {
  id: string;
  authorId: string;
  color: string;
  size: number;
  points: NormalizedPoint[];
  createdAt: string;
};

export type StickerRecord = {
  id: string;
  authorId: string;
  createdAt: string;
  position: NormalizedPoint;
  scale: number;
  width: number;
  height: number;
  mimeType: string;
  imageData?: string;
  imageUri?: string;
  uri?: string;
};

export type PosterContent = {
  posterId: PosterId;
  updatedAt: string;
  strokes: StrokeRecord[];
  stickers: StickerRecord[];
};
