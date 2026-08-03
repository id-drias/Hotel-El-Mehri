import type { MediaAsset } from './media';

export type RoomSpecification = {
  label: string;
  icon: string | null;
};

export type Room = {
  slug: string;
  name: string;
  description: string;
  surfaceM2: number | null;
  maxAdults: number;
  maxChildren: number;
  basePrice: string | null; // DZD, null means "on request"
  videoUrl: string | null;
  specifications: RoomSpecification[];
  images: MediaAsset[];
};
