# Hôtel El Mehri — Hotel Website

Website for [Hôtel El Mehri](https://maps.app.goo.gl/wCKqxn5gUQ3RMKhR9), Ouargla — a
three-star property of the El Aurassi chain, designed by Fernand Pouillon and classified
national heritage. Built as a decoupled stack: a **Django + Django REST Framework**
backend and a **Next.js (App Router, TypeScript)** frontend.

Sections: home, presentation, rooms, services, gallery, events, contact — plus
**online reservations** and **guest reviews**.

> **All property content is driven by [`hotel.config.json`](hotel.config.json)** at the
> repository root. Both stacks read that one file: the frontend through
> `frontend/src/config/index.ts`, Django through `backend/config/hotel_config.py`.
> Change the hotel's name, address, phone, email, coordinates or social links there and
> it propagates to every page, meta tag, email subject and admin screen.
>
> Its `_needsConfirmation` array lists every value that is **not** verified — read it
> before launch.
>
> Photography is not final. `media.usePlaceholders` is `true`, which routes every image
> through `placehold.co`; see [`docs/image-manifest.md`](docs/image-manifest.md) for the
> 24 files to supply and where each one lands.

---

## Repository layout

```
Hotel-El-Mehri/
├── hotel.config.json   ★ single source of truth for all property content
├── backend/            Django 5 + DRF API and back-office
├── frontend/           Next.js 15 App Router site
├── docs/               architecture notes + image manifest
├── docker-compose.yml  postgres + backend + frontend
├── netlify.toml
├── .editorconfig
└── README.md
```

---

## Configuration — `hotel.config.json`

One file at the repository root holds every property-specific fact. Both stacks read it,
so there is no second place to keep in sync.

```
hotel.config.json
├── frontend/src/config/index.ts      import raw from '../../../hotel.config.json'
│   └── consumed by src/content/*, Logo, Footer, MobileMenu, admin chrome, site/contact constants
└── backend/config/hotel_config.py    json.load, cached
    └── consumed by config/settings/base.py, apps/contact/services.py
```

| Section | Drives |
|---|---|
| `brand` | wordmark, `<title>`, aria-labels, star rating, admin console header |
| `tagline` / `intro` / `about*` | homepage, about page, footer strapline (fr + ar) |
| `address` / `coordinates` / `googleMapsUrl` | contact page, map embed, footer |
| `proximity` | "getting here" landmarks |
| `contact` | phone/email/fax links, social icons, `tel:` hrefs |
| `rates` | price display — `showPrices: false` renders "Tarif sur demande" |
| `capacity` / `stats` | about-page figures |
| `media` | hero and about imagery, video tour, placeholder mode |
| `seo` | canonical origin, `next/image` remote host |
| `infrastructure` | Postgres name/user, refresh-cookie name, API schema title, email addresses and subject prefix |

Every `infrastructure` value stays environment-overridable — `POSTGRES_DB`,
`DEFAULT_FROM_EMAIL` and friends still win when set. The JSON only supplies the default.

Reading a value in Python:

```python
from config import hotel_config

hotel_config.HOTEL_NAME                      # "Hôtel El Mehri"
hotel_config.get("contact.email")            # "hotelelmehri@yahoo.com"
hotel_config.get("rates.currency", "DZD")    # dotted path with a fallback
```

Set `HOTEL_CONFIG_PATH` if only `backend/` is shipped to the Python host and the JSON
is not one directory up.

---

## Backend — `backend/`

```
backend/
├── manage.py
├── Dockerfile
├── pyproject.toml            ruff + mypy config
├── pytest.ini
├── .env.example              copy to .env
├── requirements/
│   ├── base.txt              Django, DRF, filters, CORS, spectacular, psycopg, Pillow
│   ├── dev.txt               pytest, factory-boy, ruff, mypy
│   └── prod.txt              gunicorn, whitenoise, sentry
├── config/                   project package (no app code here)
│   ├── settings/
│   │   ├── base.py           shared settings
│   │   ├── dev.py            DEBUG, console email, open CORS
│   │   ├── prod.py           HSTS, secure cookies, SMTP, whitenoise
│   │   └── test.py           sqlite in-memory, fast hashers
│   ├── urls.py               /admin, /api/v1/*, /api/schema, /api/docs
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── common/               abstract models + shared plumbing
│   │   ├── models.py         TimeStampedModel, TranslationModel, PublishableModel
│   │   ├── pagination.py     DefaultPagination (page_size 12)
│   │   ├── permissions.py    mixins.py  utils.py  exceptions.py
│   │   └── tests/
│   ├── rooms/                Room, RoomTranslation, RoomSpecification, RoomImage
│   ├── gallery/              MediaCategory (+translation), MediaAsset
│   ├── services/             Service (+translation), EventHall (+translation)
│   ├── reservations/         Reservation, ReservationRoom
│   ├── reviews/              Review (moderated)
│   ├── blog/                 Article, ArticleTranslation
│   └── contact/              ContactMessage
├── locale/{fr,ar,en}/        gettext catalogues for API-side strings
├── templates/emails/         reservation / contact / review notifications
├── static/  media/           collected static, uploaded media
└── scripts/seed_demo_data.py
```

### Every app has the same shape

| File | Responsibility |
|---|---|
| `models.py` | database schema |
| `serializers.py` | request/response shaping and validation |
| `views.py` | thin viewsets |
| `selectors.py` | read queries (keeps views free of ORM chains) |
| `services.py` | write logic and side effects (emails, reference codes) |
| `filters.py` | django-filter query params |
| `urls.py` | DRF router |
| `admin.py` | back-office |
| `tests/` | `test_models.py`, `test_api.py` |

### API surface

```
GET  /api/v1/rooms/                 list room types
GET  /api/v1/rooms/{slug}/          one room + specs, images, video
GET  /api/v1/gallery/media/         paginated images, ?category=
GET  /api/v1/gallery/categories/    filter tabs
GET  /api/v1/services/              restaurants, tea lounge, wellness, events
GET  /api/v1/services/halls/        event halls with capacity
POST /api/v1/reservations/          reservation request (throttled 10/h)
GET  /api/v1/reviews/               approved reviews, ?room=
POST /api/v1/reviews/               submit a review, moderated (throttled 3/h)
GET  /api/v1/blog/articles/         news and events
GET  /api/v1/blog/articles/{slug}/
POST /api/v1/contact/messages/      contact form (throttled 5/h)
GET  /api/schema/  /api/docs/       OpenAPI + Swagger UI
```

### Translation strategy

Content is translated with **one child row per language** (`RoomTranslation`,
`ServiceTranslation`, `ArticleTranslation`, …), the same shape the current site uses, so
editors can translate fr and ar independently. The active language comes from the
`Accept-Language` header via `LocaleMiddleware` — the frontend forwards the locale of the
current route, so URLs stay a frontend concern.

---

## Frontend — `frontend/`

```
frontend/
├── package.json
├── next.config.mjs           next-intl plugin, remote image patterns
├── tsconfig.json             @/* -> ./src/*
├── postcss.config.mjs        Tailwind v4
├── eslint.config.mjs  .prettierrc  .env.example  Dockerfile
├── public/
│   ├── icons/  fonts/
│   └── images/{rooms,gallery,blog}/
└── src/
    ├── middleware.ts                 next-intl locale routing
    ├── app/
    │   ├── [locale]/
    │   │   ├── layout.tsx            <html lang dir>, Header/Footer, i18n provider
    │   │   ├── page.tsx              Accueil
    │   │   ├── about/                Présentation
    │   │   ├── rooms/                Hébergement
    │   │   │   └── [slug]/           room detail
    │   │   ├── services/             Services
    │   │   ├── gallery/              Galerie
    │   │   ├── blog/                 Événements
    │   │   │   └── [slug]/
    │   │   ├── contact/              Contact
    │   │   ├── reservation/          booking request flow (new)
    │   │   ├── loading.tsx  error.tsx  not-found.tsx
    │   ├── api/revalidate/route.ts   ISR webhook called by the Django admin
    │   ├── sitemap.ts                per-locale sitemap
    │   └── robots.ts
    ├── components/
    │   ├── layout/       Header, Navbar, MobileMenu, LanguageSwitcher, Footer,
    │   │                 ContactBlock, SocialLinks, Logo
    │   ├── ui/           Button, Input, Textarea, Select, Checkbox, Card, Badge,
    │   │                 Container, SectionTitle, Spinner, Skeleton, Modal, Rating
    │   ├── sections/     Hero, VideoTour, RoomsPreview, DiningSection,
    │   │                 WellnessSection, EventsSection, GalleryPreview,
    │   │                 ReviewsSection, ArticlesPreview, LocationMap
    │   ├── rooms/        RoomCard, RoomGrid, RoomGallery, RoomSpecs, RoomVideo, RoomPrice
    │   ├── gallery/      GalleryFilters, GalleryGrid, Lightbox
    │   ├── reservation/  ReservationForm, DateRangePicker, RoomSelector, GuestCounter,
    │   │                 BoardSelector, ReservationSummary, ReservationSuccess
    │   ├── reviews/      ReviewList, ReviewCard, ReviewForm
    │   ├── contact/      ContactForm, ContactInfo, MapEmbed
    │   ├── blog/         ArticleCard, ArticleList, ArticleBody
    │   └── services/     ServiceSection, EventHallCard
    ├── lib/
    │   ├── api/          client.ts (typed fetch + ApiError), endpoints.ts,
    │   │                 rooms.ts, gallery.ts, services.ts, reviews.ts,
    │   │                 reservations.ts, contact.ts, blog.ts
    │   ├── i18n/         config.ts (locales, direction), navigation.ts, request.ts
    │   ├── validation/   contact.ts, reservation.ts, review.ts (zod, shared client+server)
    │   ├── utils/        cn.ts, format.ts, dates.ts, seo.ts, structured-data.ts
    │   └── constants/    site.ts, contact.ts, navigation.ts
    ├── hooks/            useMediaQuery, useLockBodyScroll, useInfiniteScroll,
    │                     useLightbox, useIsRtl
    ├── types/            room, media, service, reservation, review, article, api
    ├── messages/         fr.json, ar.json
    └── styles/           globals.css, tokens.css
```

### Conventions

- **Server Components by default.** Only files that need state or browser APIs start with
  `'use client'` — forms, the lightbox, the mobile menu, the carousels.
- **Routing is locale-first**: `/fr/...` and `/ar/...` are generated by `next-intl`.
  `LanguageSwitcher` swaps the locale on the *current* pathname instead of rewriting the URL
  string by hand.
- **Arabic is RTL**: `dir` is set on `<html>` from `getDirection(locale)`.
- **One API entry point**: every request goes through `lib/api/client.ts`, which attaches
  `Accept-Language`, applies ISR tags and throws a typed `ApiError`.
- **Dates are exchanged as plain `YYYY-MM-DD`** — no timezone arithmetic on the client.

### Improvements over the current site, wired into this structure

| Current site | Here |
|---|---|
| No booking path; a full booking bundle shipped but never mounted | `/[locale]/reservation` + `POST /reservations/` |
| Reviews component present, API returns nothing | moderated `Review` model + admin workflow |
| No price, capacity or inventory on rooms | `base_price`, `max_adults`, `total_units` |
| Contact info duplicated in 4 templates | `lib/constants/contact.ts` |
| Empty `alt=""` everywhere | `alt_text` stored per image |
| No canonical, hreflang, OpenGraph or JSON-LD | `lib/utils/seo.ts`, `structured-data.ts`, `sitemap.ts` |
| `<il>` instead of `<li>` in room specs | `RoomSpecs` renders a real list |
| Hero image marked `loading="lazy"` | `Hero` uses `priority` |

---

## Getting started

Backend:

```bash
cd backend && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements/dev.txt
```

```bash
cd backend && cp .env.example .env && python manage.py makemigrations && python manage.py migrate && python manage.py runserver
```

Frontend:

```bash
cd frontend && npm install && cp .env.example .env && npm run dev
```

Or both at once:

```bash
docker compose up --build
```

API docs: http://127.0.0.1:8000/api/docs · Site: http://localhost:3000/fr

### End-to-end tests

`frontend/e2e/` holds a Playwright suite covering the mobile navigation's
accessibility contract — `inert` on the closed panel, the focus trap, focus
restoration, and 44px touch targets — run against an iPhone 13 profile in both
locales. These only reproduce below the `lg` breakpoint: at desktop widths the
panel is `display: none` and every focus assertion passes vacuously.

The device profile runs on WebKit, which must be downloaded once:

```bash
cd frontend && npx playwright install webkit
```

```bash
cd frontend && npm run test:e2e        # npm run test:e2e:ui for the inspector
```

The suite starts a dev server itself, or reuses one already on port 3000.

---

## Deployment

The two halves of the stack deploy to two different places, because Netlify runs
JavaScript and Go serverless functions — there is no Python runtime for a WSGI app,
no managed Postgres, and no persistent disk for uploaded media.

| | Host | Why |
|---|---|---|
| `frontend/` | Netlify | SSR, middleware and ISR run on the Next.js runtime |
| `backend/` | Render / Railway / Fly | needs Python, Postgres and a media volume |

### Frontend — Netlify

`netlify.toml` at the repository root builds `frontend/` and loads
`@netlify/plugin-nextjs`. The plugin is what makes the App Router work: without it
the deploy is a static shell that 404s on `/fr`, `/ar` and every dynamic route,
because the `next-intl` locale middleware never runs.

Project: not yet created. Once linked, set `seo.siteUrl` in `hotel.config.json` and
`NEXT_PUBLIC_SITE_URL` on Netlify to the deployed origin.

Deploys are triggered manually from a working copy:

```bash
npx netlify deploy --build --prod
```

To deploy on every push instead, link the GitHub repository under
*Project configuration > Build & deploy > Continuous deployment*. The build settings
already live in `netlify.toml`, so nothing needs to be re-entered in the UI.

### Environment variables

Set on the Netlify project, not in the repository — `frontend/.env` is gitignored
and never uploaded.

| Variable | Value | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | the deployed origin | `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<api-host>/api/v1` | browser calls: reservation form, contact form, `/admin` |
| `API_BASE_URL` | `https://<api-host>/api/v1` | server-side fetches |
| `REVALIDATE_SECRET` | shared secret | the `/api/revalidate` webhook the Django admin calls |

Only `NEXT_PUBLIC_SITE_URL` is set today. Until the API is deployed and the other
three point at it, the site serves every page from `src/content/` as normal, and the
two forms plus the admin console fail on submit — they are the only things that talk
to Django at runtime.

**The `NEXT_PUBLIC_API_BASE_URL` host must share a site with the frontend** for the
admin console to hold a session: its refresh cookie is `SameSite=Lax`, so a
cross-site fetch drops it silently and the session dies at the first token refresh.
A subdomain of the frontend's domain (`api.hotelelmehri.dz` alongside
`www.hotelelmehri.dz`) satisfies this; a `*.onrender.com` host calling a
`*.netlify.app` frontend does not.

### Backend — not yet deployed

`backend/Dockerfile` and `config/settings/prod.py` (HSTS, secure cookies, SMTP,
whitenoise) are ready. Deploying it needs a Postgres instance, `DJANGO_SETTINGS_MODULE`
pointed at `config.settings.prod`, `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` widened
to the frontend origin, and object storage for `media/` — a container filesystem is
ephemeral, so guest-uploaded images vanish on redeploy.

---

## Status

Scaffolding only. Models, settings, routing, the API client and the i18n setup are written;
serializers, views, admin, components and styles are stubs marked with `TODO`. No migrations
have been generated yet, and package versions in `package.json` / `requirements/` should be
confirmed against the latest releases before the first install.
