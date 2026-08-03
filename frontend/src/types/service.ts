export type ServiceCategory = 'restaurant' | 'tea_room' | 'wellness' | 'events';

export type Service = {
  slug: string;
  category: ServiceCategory;
  name: string;
  /** Short eyebrow label above the name, e.g. "Restaurant central". */
  kicker: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
};

export type EventHall = {
  slug: string;
  name: string;
  description: string;
  seatingCapacity: number;
  surfaceM2: number | null;
  imageUrl: string | null;
};
