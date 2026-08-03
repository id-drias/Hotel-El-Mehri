# Image manifest — Hôtel El Mehri

Every `<Image>` on the site resolves its `src` through `img()` in
[`frontend/src/content/hotel.ts`](../frontend/src/content/hotel.ts). A path listed
in `media.pendingPhotos` in [`hotel.config.json`](../hotel.config.json) renders a
palette-matched placeholder; every other path is served from
`frontend/public/images/`.

**16 slots hold the hotel's real photography. 10 are still pending.**

To fill a pending slot: drop the file at the exact path, then delete that path from
`media.pendingPhotos`. No content edits, no component edits.

## Where the real photos came from

| Source | Count | Notes |
| --- | --- | --- |
| The hotel's Facebook page | 7 | Its own uploads — the vaulted salon, reception, tea service |
| Its Google Maps listing | 8 | Facade, twin room, pool, corridor, dining hall, welcome tray |

Two of the Maps images carried a phone-camera watermark along the bottom edge; that
strip was cropped off. Maps photos can be visitor-contributed, so confirm the hotel
owns or has cleared them before launch — this is also flagged in
`_needsConfirmation`.

Sources were downloaded at their maximum available resolution, resized to a
1800 px long edge, and saved as progressive JPEG at quality 82. Total weight of all
16: **3.2 MB**. Aspect ratios are mixed (the Facebook uploads are square, several
Maps shots are portrait); every component uses `fill` + `object-cover`, so they
crop cleanly without pre-processing.

## In place

| Path | What it is |
| --- | --- |
| `banners/hero.jpg` | Pool with the domed arcade behind — the homepage hero |
| `banners/about.jpg` | Facade with the `HOTEL EL MEHRI / فندق المهري` signage |
| `hotel/hotel-1.jpg` | White vaulted corridor, chequerboard floor |
| `hotel/hotel-2.jpg` | Reception desk under the vault |
| `hotel/hotel-3.jpg` | The vaulted salon, symmetrical view |
| `rooms/chambre-1.jpg` | Twin room — the Chambre card thumbnail |
| `rooms/chambre-2.jpg` | In-room welcome tray, fruit and tea |
| `dining/restaurant-1.jpg` | Dining hall under the dome |
| `dining/cafeteria-1.jpg` | The salon, wide |
| `dining/cafeteria-2.jpg` | Salon with the garden doors |
| `dining/cafeteria-3.jpg` | Salon with the pierced chandelier |
| `dining/cafeteria-4.jpg` | Coffee cup and flowers, close |
| `dining/cafeteria-5.jpg` | Teapot and red curtains |
| `wellness/piscine-1.jpg` | Pool panorama with the palms |
| `blog/rehabilitation.jpg` | Facade (reuse) — rehabilitation article cover |
| `blog/patrimoine.jpg` | Vaulted corridor (reuse) — heritage article cover |

## Still pending

These are the 10 paths in `media.pendingPhotos`. Shooting them would complete the
site; until then each renders a labelled placeholder.

| Path | Shot needed |
| --- | --- |
| `rooms/suite-junior-1.jpg` | Suite Junior bedroom — **card thumbnail**, highest priority |
| `rooms/suite-junior-2.jpg` | Its salon area |
| `rooms/suite-senior-1.jpg` | Suite Senior bedroom — **card thumbnail**, highest priority |
| `rooms/suite-senior-2.jpg` | Its separate salon |
| `dining/restaurant-2.jpg` | A plated dish, local speciality |
| `dining/kheima-1.jpg` | The kheima dressed in the garden — also an event-hall card |
| `dining/kheima-2.jpg` | Inside the tent, evening |
| `wellness/sauna-1.jpg` | Sauna interior |
| `events/salle-conference-1.jpg` | Conference room I, seated for 60 |
| `events/salle-conference-2.jpg` | Conference room II |

The two suite thumbnails matter most: those cards carry real 2026 rates
(10 400 DA and 12 420 DA) against a placeholder image, which is the weakest pairing
on the site.

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
| [`hotel.config.json`](../hotel.config.json) → `media` | `banners/*`, `hotel/*`, and the `pendingPhotos` list |
| [`content/rooms.ts`](../frontend/src/content/rooms.ts) | `rooms/*` |
| [`content/services.ts`](../frontend/src/content/services.ts) | `dining/*`, `wellness/*`, `events/*` |
| [`content/gallery.ts`](../frontend/src/content/gallery.ts) | re-lists the real photos for the gallery tabs |
| [`content/articles.ts`](../frontend/src/content/articles.ts) | `blog/*` |

`gallery.ts` deliberately lists **only paths that have real photographs** — a room
card can carry a placeholder because its copy does the work, but a gallery is
nothing but its images. The `events` tab is absent for that reason; add it back
once the conference rooms are shot.

## Video

`media.tourVideoUrl` is empty, so the video-tour section renders nothing. The
hotel's Facebook page has a 22-second clip; upload it to YouTube and paste the
watch URL into the config to switch the section on. Same for `videoUrl` on any
room in `content/rooms.ts`.
