# Image manifest — Hôtel El Mehri

Every `<Image>` on the site resolves its `src` through `img()` in
[`frontend/src/content/hotel.ts`](../frontend/src/content/hotel.ts). All 26 slots
are filled; nothing renders a placeholder.

**16 are the hotel's own photographs. 10 are Unsplash stand-ins showing other
properties**, listed in `media.stockPhotos` in
[`hotel.config.json`](../hotel.config.json).

> **Read this before launch.** The Unsplash licence permits commercial use, but a
> stand-in does not show this hotel. A guest booking a Suite Senior at 12 420 DA is
> looking at someone else's room. Replace the ten before the site takes real
> bookings, or add a visible *photo non contractuelle* note. They are deliberately
> kept out of the gallery, which shows genuine photography only.

## Replacing a stand-in

Drop the real file at the same path and delete that path from `media.stockPhotos`.
No content edits, no component edits, no rebuild config.

## The hotel's own photography (16)

| Path | What it is | Source |
| --- | --- | --- |
| `banners/hero.jpg` | Elevated pool panorama, date palms, evening light | Google Maps |
| `banners/about.jpg` | Facade with the `HOTEL EL MEHRI / فندق المهري` signage | Google Maps |
| `hotel/hotel-1.jpg` | White vaulted corridor, chequerboard floor | Google Maps |
| `hotel/hotel-2.jpg` | Reception desk under the vault | Facebook |
| `hotel/hotel-3.jpg` | The vaulted salon, symmetrical view | Facebook |
| `rooms/chambre-1.jpg` | Twin room — Chambre card thumbnail | Google Maps |
| `rooms/chambre-2.jpg` | In-room welcome tray, fruit and tea | Google Maps |
| `dining/restaurant-1.jpg` | Dining hall under the dome | Google Maps |
| `dining/cafeteria-1.jpg` | The salon, wide | Facebook |
| `dining/cafeteria-2.jpg` | Salon with the garden doors | Facebook |
| `dining/cafeteria-3.jpg` | Salon with the pierced chandelier | Facebook |
| `dining/cafeteria-4.jpg` | Coffee cup and flowers, close | Facebook |
| `dining/cafeteria-5.jpg` | Teapot and red curtains | Facebook |
| `wellness/piscine-1.jpg` | Pool with the domed arcade behind | Google Maps |
| `blog/rehabilitation.jpg` | Facade (reuse of `banners/about.jpg`) | Google Maps |
| `blog/patrimoine.jpg` | Vaulted corridor (reuse of `hotel/hotel-1.jpg`) | Google Maps |

`hotel/hotel-1.jpg` and `blog/rehabilitation.jpg` had a phone-camera watermark
cropped off the bottom edge. Maps photos can be visitor-contributed — confirm the
hotel owns or has cleared them.

## Unsplash stand-ins (10) — replace these

Each is `https://images.unsplash.com/<id>`. Chosen for warm sand, terracotta, wood
and white-vault tones so they sit inside the site's palette rather than fighting it.

| Path | Stand-in shows | Unsplash id |
| --- | --- | --- |
| `rooms/suite-junior-1.jpg` | Red headboard wall, white bed | `photo-1777170191230-3f357b815483` |
| `rooms/suite-junior-2.jpg` | Neutral sofa sitting area | `photo-1643913590859-c81793b54649` |
| `rooms/suite-senior-1.jpg` | Sculptural gold headboard, white bed | `photo-1731336478850-6bce7235e320` |
| `rooms/suite-senior-2.jpg` | Sitting area with bedroom beyond | `photo-1631049307290-bb947b114627` |
| `dining/restaurant-2.jpg` | Plated dish, dark warm tones | `photo-1543826173-cfe2ca17577d` |
| `dining/kheima-1.jpg` | Desert camp, white domes and palms | `photo-1666593198392-202ad9578bb4` |
| `dining/kheima-2.jpg` | Desert camp with campfire at dusk | `photo-1762970913723-21d3c7f5846c` |
| `wellness/sauna-1.jpg` | Wooden sauna interior | `photo-1678988227223-45112511eca2` |
| `events/salle-conference-1.jpg` | Wooden boardroom table and chairs | `photo-1431540015161-0bf868a2d407` |
| `events/salle-conference-2.jpg` | Boardroom, brick and wood | `photo-1697059361461-b81d0e98c3af` |

Two were cropped to remove things that did not belong on a Saharan property:
`suite-junior-1` had an East Asian wall medallion above the bed (top third
removed), and an earlier candidate for `suite-senior-1` was dropped for showing a
guest's luggage on the bed.

**Priority to replace:** the four `rooms/suite-*` files. Those cards carry the
hotel's real 2026 rates (10 400 DA and 12 420 DA) beside an image of a different
hotel, which is the weakest pairing on the site.

## Processing

The hero is cropped 16:9 from a 6000x2693 master (Google serves `lh3.googleusercontent.com` images at any requested size — ask for `=w6000-h6000-k-no`), then resized to 2400x1350. It has to survive both a desktop landscape viewport and a mobile portrait one, since `.lyn-hero` is `min-height: 100svh` full-bleed; the pool and the palm cluster stay in frame in both.

Every other file: downloaded at maximum available resolution, resized to an 1800 px long
edge, saved as progressive JPEG at quality 82. **26 files, 5.5 MB total.** Aspect
ratios are mixed — the Facebook uploads are square, several Maps shots portrait —
and every component uses `fill` + `object-cover`, so they crop cleanly without
pre-processing.

## Specs for new files

| Property | Value |
| --- | --- |
| Format | `.jpg`, progressive |
| Long edge | 1800 px (2400 px for banners) |
| Aspect | Any — `object-cover` handles it. 3:2 landscape crops most predictably |
| Weight | ≤ 400 KB each; Next.js re-encodes to AVIF/WebP on delivery |

## Where each path is declared

| Content file | Paths it owns |
| --- | --- |
| [`hotel.config.json`](../hotel.config.json) → `media` | `banners/*`, `hotel/*`, plus `stockPhotos` and `pendingPhotos` |
| [`content/rooms.ts`](../frontend/src/content/rooms.ts) | `rooms/*` |
| [`content/services.ts`](../frontend/src/content/services.ts) | `dining/*`, `wellness/*`, `events/*` |
| [`content/gallery.ts`](../frontend/src/content/gallery.ts) | the hotel's own photographs only |
| [`content/articles.ts`](../frontend/src/content/articles.ts) | `blog/*` |

`pendingPhotos` is empty now that every slot has a file. It stays in the config as
the mechanism for declaring a slot in content before its photograph exists — a path
listed there renders a labelled placeholder instead of a broken image.

## Video

`media.tourVideoUrl` is empty, so the video-tour section renders nothing. The
hotel's Facebook page has a 22-second clip; upload it to YouTube and paste the
watch URL into the config to switch the section on. Same for `videoUrl` on any
room in `content/rooms.ts`.
