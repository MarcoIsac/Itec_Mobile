import { Image, ImageSourcePropType } from 'react-native';

import type { PosterId } from './ar-types';

type PosterDefinition = {
  id: PosterId;
  label: string;
  target: PosterId;
  source: ImageSourcePropType;
  physicalWidth: number;
  aspectRatio: number;
};

const physicalWidth = 0.3;

const definitions = [
  { id: 'poster_1', label: 'Poster 1', source: require('../../assets/posters/afis1.jpeg') },
  { id: 'poster_2', label: 'Poster 2', source: require('../../assets/posters/afis2.jpeg') },
  { id: 'poster_3', label: 'Poster 3', source: require('../../assets/posters/afis3.jpeg') },
  { id: 'poster_4', label: 'Poster 4', source: require('../../assets/posters/afis4.jpeg') },
  { id: 'poster_5', label: 'Poster 5', source: require('../../assets/posters/afis5.jpeg') },
  { id: 'poster_6', label: 'Poster 6', source: require('../../assets/posters/afis6.jpeg') },
  { id: 'poster_7', label: 'Poster 7', source: require('../../assets/posters/afis7.jpeg') },
  { id: 'poster_8', label: 'Poster 8', source: require('../../assets/posters/afis8.jpeg') },
  { id: 'poster_9', label: 'Poster 9', source: require('../../assets/posters/afis9.jpeg') },
  { id: 'poster_10', label: 'Poster 10', source: require('../../assets/posters/afis10.jpeg') },
] as const;

export const POSTERS: PosterDefinition[] = definitions.map((item) => {
  const asset = Image.resolveAssetSource(item.source);
  const aspectRatio = asset.width && asset.height ? asset.height / asset.width : 1.414;

  return {
    ...item,
    target: item.id,
    physicalWidth,
    aspectRatio,
  };
});

export const POSTER_MAP = Object.fromEntries(POSTERS.map((poster) => [poster.id, poster])) as Record<
  PosterId,
  PosterDefinition
>;

export const VIRO_TARGETS = Object.fromEntries(
  POSTERS.map((poster) => [
    poster.target,
    {
      source: poster.source,
      orientation: 'Up' as const,
      physicalWidth: poster.physicalWidth,
    },
  ])
);

export const isPosterId = (value: unknown): value is PosterId =>
  typeof value === 'string' && value in POSTER_MAP;
