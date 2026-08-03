/** Every backend path in one place, so a route rename is a one-line change. */
export const endpoints = {
  rooms: '/rooms/',
  room: (slug: string) => `/rooms/${slug}/`,
  gallery: '/gallery/media/',
  galleryCategories: '/gallery/categories/',
  services: '/services/',
  eventHalls: '/services/halls/',
  reservations: '/reservations/',
  reviews: '/reviews/',
  articles: '/blog/articles/',
  article: (slug: string) => `/blog/articles/${slug}/`,
  contactMessages: '/contact/messages/',
} as const;
