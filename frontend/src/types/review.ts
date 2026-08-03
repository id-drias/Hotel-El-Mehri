export type Review = {
  id: number;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  content: string;
  publishedAt: string;
  room: string | null;
};

export type ReviewInput = {
  authorName: string;
  email?: string;
  rating: number;
  title?: string;
  content: string;
  room?: string;
};
