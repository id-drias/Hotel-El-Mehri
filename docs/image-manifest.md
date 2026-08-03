# Image manifest — Hôtel El Mehri

Every `<Image>` on the site resolves its `src` through `img()` in
[`frontend/src/content/hotel.ts`](../frontend/src/content/hotel.ts). While
`media.usePlaceholders` is `true` in [`hotel.config.json`](../hotel.config.json),
that helper rewrites each path to a `placehold.co` URL, so no page ships the
previous property's photography and nothing 404s before the real files land.

**To go live with real photos:** drop the files at the exact paths below, then set
`media.usePlaceholders` to `false`. No content edits, no component edits.

## Specs

| Property | Value |
| --- | --- |
| Format | `.jpg` (except `blog/*` → `.jpg`) |
| Aspect | 3:2 landscape |
| Minimum | 1600 × 1067 px |
| Banners | 2400 × 1350 px (16:9 crop-safe — text sits centred) |
| Target weight | ≤ 400 KB each after compression; Next.js re-encodes to AVIF/WebP |

## The 24 files

### Banners — full-bleed page headers

| Path | Shot |
| --- | --- |
| `frontend/public/images/banners/hero.jpg` | The Pouillon facade at golden hour, wide. This is the first thing every visitor sees. |
| `frontend/public/images/banners/about.jpg` | Architectural detail — arcade, patio or brise-soleil. |

### Hotel — the building itself

| Path | Shot |
| --- | --- |
| `frontend/public/images/hotel/hotel-1.jpg` | Facade, straight on. |
| `frontend/public/images/hotel/hotel-2.jpg` | The new reception area. |
| `frontend/public/images/hotel/hotel-3.jpg` | Garden / exterior grounds. |

### Rooms

| Path | Shot |
| --- | --- |
| `frontend/public/images/rooms/chambre-double-1.jpg` | Double room, bed centred — **the card thumbnail**, make it the strongest. |
| `frontend/public/images/rooms/chambre-double-2.jpg` | Alternate angle or twin-bed configuration. |
| `frontend/public/images/rooms/chambre-double-3.jpg` | Bathroom. |
| `frontend/public/images/rooms/chambre-double-4.jpg` | Window / view detail. |
| `frontend/public/images/rooms/suite-1.jpg` | Suite bedroom — **card thumbnail**. |
| `frontend/public/images/rooms/suite-2.jpg` | Suite salon. |
| `frontend/public/images/rooms/suite-3.jpg` | Suite bathroom or detail. |

### Dining

| Path | Shot |
| --- | --- |
| `frontend/public/images/dining/restaurant-1.jpg` | Restaurant room, tables dressed — **card thumbnail**. |
| `frontend/public/images/dining/restaurant-2.jpg` | Plated dish, local speciality. |
| `frontend/public/images/dining/restaurant-3.jpg` | Buffet or show-cooking station. |
| `frontend/public/images/dining/restaurant-4.jpg` | Detail — table setting, service. |
| `frontend/public/images/dining/cafeteria-1.jpg` | Cafeteria seating — **card thumbnail**. |
| `frontend/public/images/dining/cafeteria-2.jpg` | Tea / pastry detail. |
| `frontend/public/images/dining/kheima-1.jpg` | The kheima in the garden, dressed — **card thumbnail**, also used as an event-hall card. |
| `frontend/public/images/dining/kheima-2.jpg` | Interior of the tent, evening. |

### Wellness

| Path | Shot |
| --- | --- |
| `frontend/public/images/wellness/piscine-1.jpg` | The renovated pool, wide — **card thumbnail**. |
| `frontend/public/images/wellness/piscine-2.jpg` | Poolside / loungers. |
| `frontend/public/images/wellness/piscine-3.jpg` | Pool detail or evening lighting. |
| `frontend/public/images/wellness/sauna-1.jpg` | Sauna interior. |
| `frontend/public/images/wellness/sauna-2.jpg` | Sauna detail / relaxation area. |

### Events

| Path | Shot |
| --- | --- |
| `frontend/public/images/events/salle-conference-1.jpg` | Conference room I, seated for 60 — **card thumbnail**. |
| `frontend/public/images/events/salle-conference-2.jpg` | Conference room II. |
| `frontend/public/images/events/salle-conference-3.jpg` | AV / room set in workshop layout. |

### Blog covers

| Path | Shot |
| --- | --- |
| `frontend/public/images/blog/rehabilitation.jpg` | Renovation / reopening image. |
| `frontend/public/images/blog/patrimoine.jpg` | Heritage-angle shot of the Pouillon architecture. |

## Where each path is declared

| Content file | Paths it owns |
| --- | --- |
| [`hotel.config.json`](../hotel.config.json) → `media` | `banners/*`, `hotel/*` |
| [`content/rooms.ts`](../frontend/src/content/rooms.ts) | `rooms/*` |
| [`content/services.ts`](../frontend/src/content/services.ts) | `dining/*`, `wellness/*`, `events/*` |
| [`content/gallery.ts`](../frontend/src/content/gallery.ts) | re-lists all of the above for the gallery tabs |
| [`content/articles.ts`](../frontend/src/content/articles.ts) | `blog/*` |

`gallery.ts` duplicates paths by design — the gallery tabs decide their own
ordering. If you add a photo, add it in both its section file and `gallery.ts`.

## Video

`media.tourVideoUrl` is empty, so the video-tour section renders nothing. The
hotel's Facebook page has a 22-second clip; upload it to YouTube and paste the
watch URL into the config to switch the section on. Same for `videoUrl` on any
room in `content/rooms.ts`.

## Sourcing stand-ins

If you want something better than flat placeholders before the shoot, Unsplash
search terms that match the property (Saharan modernist, warm stone, palm):

- Facade / architecture — `saharan architecture`, `desert hotel courtyard`, `brutalist stone facade`
- Rooms — `minimal hotel room warm`, `hotel twin room daylight`
- Dining — `north african restaurant interior`, `moroccan tea service`
- Kheima — `desert tent interior`, `bedouin tent night`
- Pool — `hotel pool palm trees`, `desert pool evening`
- Conference — `hotel conference room`, `seminar room seated`

Download at ≥1600 px wide, rename to the exact path above, and keep the
attribution list somewhere — Unsplash's licence does not require it, but the
hotel will want to know which images are not theirs.
