export type MediaCategory = {
  slug: string;
  tag: 'room' | 'service' | 'event' | 'other';
  name: string;
};

export type MediaAsset = {
  id: number;
  url: string;
  altText: string;
  category: string | null;
};
