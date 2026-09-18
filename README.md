# Stremio / Nuvio Addon — Wrestling & UFC (Events)

A **catalog and metadata** addon for Stremio and Nuvio covering the events of the major
wrestling promotions (WWE, AEW, TNA) and every UFC event.
**All information comes from [TMDB](https://www.themoviedb.org/), in pt-PT wherever a
translation exists.**

> A Portuguese version of this document is kept in [README.pt.md](README.pt.md).

## TMDB key: everyone uses their own

Whoever installs the addon enters their **own TMDB key** on the configuration page
(`/configure`). The key is validated on the spot and stored inside the install link, so each
user spends their own quota instead of the server's.

To get a key:

1. Create an account at <https://www.themoviedb.org/> and go to *Settings → API*.
2. Request a key (personal use is approved instantly) and copy the **API Key (v3)**.
   A *read access token (v4)* works too.

> The key travels inside the manifest link. Do not share that link publicly — anyone who has
> it uses your key. If needed, generate a new one on TMDB and reinstall.

Without a key, Stremio asks you to configure the addon before installing. Catalogs still show
the data stored in `data/`, but the pages with seasons and episodes need the key.

Optional for whoever hosts it: setting `TMDB_API_KEY` (or `TMDB_ACCESS_TOKEN`) on the server
makes that key the default for installations without one of their own, and it is also the key
used by `npm run refresh-data`.

## How TMDB organises these events

On TMDB the weekly shows are series, but **each PPV is a separate movie** ("WWE Royal Rumble
2025", "AEW All Out 2024", "UFC 300: Pereira vs. Hill"). That is why each promotion's catalog
brings three kinds of item together:

| Item | Type | What it is |
|---|---|---|
| Shows | series | Raw, SmackDown, NXT, Dynamite, Impact… with seasons and episodes |
| Year collections | series | A recurring event grouped by the addon: *WWE WrestleMania*, *AEW All Out*, *TNA Slammiversary*… season = year, episode = that year's edition |
| Individual events | movie | Each PPV as its own item, with its poster, synopsis and date |

Year collections are built from the TMDB movies (see `lib/franchises.js`); an event only becomes
a collection once it has two editions — below that it stays an individual event.

## The «Fight» tab under Discover

The addon declares every catalog twice:

- **Home screen:** the usual catalogs, with full names (*WWE — Eventos e Programas*,
  *UFC — Eventos Numerados*…), under Movies and Series.
- **Discover → Fight:** a copy with short names (*WWE*, *WWE · Últimos 7 dias*, *AEW*, *TNA*,
  *UFC*, *UFC · Fight Night*). These carry a required genre filter, defaulting to «Todos» — that
  is what stops Stremio from repeating them on the home screen.

The items are still movies and series, so the detail pages and stream addons work as before.
Because the home-screen catalogs are Movies and Series, they also show up under those Discover
tabs.

The «Fight» type is not one of the four types documented by Stremio (movie, series, channel,
tv). Stremio apps do in practice show the types an addon declares, but if some app (e.g. Nuvio)
does not show the tab, pick **«Inside Movies and Series»** on the configuration page and
reinstall.

## Catalogs

| Token | Catalog | Type | Contents |
|---|---|---|---|
| `wwe` | WWE — Eventos e Programas | series | Shows + year collections + individual events (includes the WWF/WCW/ECW archive) |
| `wwe7` | WWE — Últimos 7 Dias | series | Episodes that aired **and** events released in the past week |
| `aew` | AEW — Eventos e Programas | series | Same, for All Elite Wrestling |
| `aew7` | AEW — Últimos 7 Dias | series | Same |
| `tna` | TNA — Eventos e Programas | series | Same, for TNA / Impact Wrestling |
| `tna7` | TNA — Últimos 7 Dias | series | Same |
| `ufc` | UFC — Eventos Numerados | movie | Numbered events only (*UFC 330: Makhachev vs. Machado Garry*), newest first (scheduled ones at the end). These are the ones that usually have streams: 92% have an IMDb id |
| `ufcfn` | UFC — Fight Night e Outros Eventos | movie | UFC Fight Night, UFC on ESPN/ABC and the like. Few have an IMDb id (22%), so they rarely have streams (off by default) |
| `ufcshows` | UFC — Programas e Documentários | series | The Ultimate Fighter, Embedded, documentaries (off by default) |

Filters:

- **Search** (`search`) on every catalog.
- **Genre** on the promotion catalogs: `Eventos PPV / PLE`, `Programas semanais`,
  `Coleções por ano`, `Eventos individuais`, `Em exibição`, `Arquivo`.
- **Genre** on the numbered UFC catalog: `Agendados`. On the Fight Night one: `Fight Night`,
  `UFC on ESPN / ABC / Fox`, `The Ultimate Fighter`, `Agendados`.
- The data collection searches one by one for the UFC numbers the generic search misses
  ("UFC 325") and keeps a single entry per number when TMDB has duplicates.

## Install

1. Open `http://127.0.0.1:7100/configure` (or wherever you host it). The page has a
   **PT / EN** switch in the top corner; the choice is remembered in the browser and, on the
   first visit, follows the browser's language.
2. Paste your TMDB key (validated on the spot) and pick the catalogs.
3. **Stremio**: click *Install on Stremio*.
   **Nuvio**: copy the manifest link and paste it under *Settings → Addons → Add addon*.

The page builds a link with the configuration encoded in it (catalogs + key):

```
https://your-domain/eyJjIjpbIndXZSIs.../manifest.json
```

If you host it with `TMDB_API_KEY` on the server, the simple format still works, with catalogs
only:

```
https://your-domain/wwe,wwe7,ufc/manifest.json     # WWE + past 7 days + UFC
https://your-domain/all/manifest.json              # everything
```

## Running it

```bash
npm install
npm run dev                          # http://127.0.0.1:7100 -> /configure to enter the key
```

Production (single bundle):

```bash
npm run build
npm start
```

Endpoints: `/manifest.json`, `/catalog/{type}/{id}.json`, `/meta/{type}/{id}.json`,
`/configure`, `/art/poster.svg` (a poster generated when there is no image) and `/health`.

## Data source

Catalogs, events, posters and descriptions come from TMDB: `/search/movie`, `/search/tv`,
`/movie/{id}`, `/tv/{id}` and `/tv/{id}/season/{n}`. Images are served directly by
`image.tmdb.org`.

**One exception, and only for wrestling (WWE, AEW, TNA): the numbers inside the stream ids.**
Those come from the IMDb register, served by [Cinemeta](https://v3-cinemeta.strem.io/manifest.json)
(`lib/cinemeta.js`, no key needed), because that is the numbering stream addons resolve
`tt…:season:episode` with. Nothing that you see changes: titles, dates, images, synopses and even
the season/episode shown on the page are still TMDB's. UFC shows keep TMDB's numbering.

### Episodes of the weekly shows

Episodes (Raw, SmackDown, NXT, Dynamite, Impact…) come from TMDB: titles, images, dates and
synopses in pt-PT. Without a key there are no episodes, and the page opens with a notice to
reinstall the addon with a key.

In wrestling, each episode also gets the season/episode of the IMDb episode broadcast on the same
day (one-day tolerance, for time zones), and those are the numbers that go into the stream id.
So the page may show *T20E37* while the id is `tt1601141:20:41` — the number the stream addon
expects.

**TVmaze** remains available as a manual link for shows TMDB does not cover, configurable in
`tvmazeFallback` (`lib/promotions.js`). None is wired up at the moment.

> **Measured.** Ids paired against the IMDb register on the air date (one-day tolerance),
> before and after that correction:
>
> | Show | Ids compared | Wrong before | Wrong now |
> |---|---|---|---|
> | WWE NXT | 894 | 344 (38%) | **8 (1%)** |
> | Raw | 1739 | 19 (1%) | **2 (0%)** |
> | WWE SmackDown | 1416 | 26 (2%) | **0** |
> | TNA iMPACT! | 1150 | 44 (4%) | **1 (0%)** |
> | AEW Dynamite | 370 | 15 (4%) | **0** |
> | WWE Main Event | 664 | 0 | **0** |
> | The Ultimate Fighter (UFC) | 444 | 38 (9%) | 38 (9%), by design |
>
> The 11 that remain are weeks where two TMDB episodes fall on the same IMDb date, so the pairing
> leaves one of them alone. Episodes filed under season 0 (specials) are never used for numbering.

For YouTube videos of weekly-show episodes (with or without their own title), the video must
carry the air date (day and month) or the words of the episode title, and it is always rejected
if it mentions another year, if it was uploaded before the episode aired, or if it belongs to a
show with a similar name (*WWE Main Event* vs. *Saturday Night's Main Event*). This keeps out
older videos of the same show ("Full SmackDown highlights: Aug. 14") that used to get through
just for carrying the show's name.

### Past 7 days

Counted in calendar days: today plus the 7 whole days before it (it used to be 7×24 h from the
time of the request, which left out events from the first day). It brings together the most
recent aired episode of each running show and the individual events released in that period.

Every episode in this catalog has its own page (`wwrs-ep-show-season-episode`) holding just that
episode, plus `behaviorHints.defaultVideoId`, so it opens straight into that date's streams
instead of the show's season list. In the other catalogs the show opens as usual, with every
season.

### Top 10

The **Fight** tab has a *Top 10* per promotion (WWE, AEW, TNA and UFC — numbered only). It picks
the events with **the most TMDB votes among those held in the past 12 months** (widening to 24
months, then to all of them, if there are fewer than 10). Having an IMDb id earns a bonus,
because those are the ones stream addons can find; rating and popularity only break ties (TMDB's
popularity for these events ranges from 1 to 7 and on its own gave nonsensical results). It does
not appear on the home screen.

Events dated before the promotion was founded (WWE 1963, AEW 2019, TNA 2002, UFC 1993) are
discarded: they are unrelated movies that slipped through the name filter (e.g. *"Backlash"*,
1947).
Synopses are requested in pt-PT and, when TMDB has no translation yet, the addon falls back to
the English text rather than leaving the description empty.

Environment variables:

```
TMDB_API_KEY=...           # optional: the server's default key (or TMDB_ACCESS_TOKEN)
TMDB_LANGUAGE=pt-PT        # language of the synopses
PORT=7100                  # server port
ADDON_DEBUG=1              # prints network failures to the console
```

## Data shipped in the repository

The `data/` folder holds the result of the last collection, so catalogs answer immediately on
cold starts (which matters on Vercel):

- `data/shows.json` — shows and events of each promotion
- `data/ufc-events.json` — UFC events
- `data/meta.json` — date of the last collection

A full collection is thousands of TMDB requests. Because of that, at runtime the addon only
redoes it in the background when the stored data is more than 24 h old, one at a time, and
**never on Vercel** (every cold start would repeat it and burn the installing user's quota). On
Vercel, run `npm run refresh-data` every so often and publish again. To turn it off on another
host: `ADDON_NO_REFRESH=1`.

At runtime the addon updates itself in the background; seasons and episodes are fetched from
TMDB on demand (with caching). To refresh the files:

```bash
npm run refresh-data                  # promotions + UFC events
node scripts/refresh-data.js --shows  # promotions only
node scripts/refresh-data.js --ufc    # UFC events only
```

## Hosting on Vercel

```bash
npm i -g vercel
vercel
```

`vercel.json` uses Vercel's current format: the function is detected at `api/index.js` and a
`rewrites` rule sends every request to it. **Do not use `builds`/`routes`** (the old format):
with it Vercel warns *"Build output contains no functions, static or services directory"* and
publishes an empty deployment that answers 404 to everything (and the manifest validator fails
with "custom · root"). The `vercel-build` script deliberately does nothing — Vercel does not need
the `npm run build` bundle. The data (`data/`), the configuration page and the logo make it into
the deployment automatically, because they are read through paths Vercel's bundler recognises.
No environment variable is required: each installation brings its own key. If you want a default
key, set `TMDB_API_KEY` in the project's environment variables.

## Notes

- **Streams — two routes:**
  1. **Stream addons you have installed.** Stremio only sends them the id, never the title, and
     they only know IMDb ids. That is why events with an IMDb id appear in the catalogs under
     that very `tt…` id, and episodes of shows with an IMDb id use `tt…:season:episode`. The
     collection (`npm run refresh-data`) fetches each event's IMDb id from TMDB. Current
     coverage: WWE 793/976, AEW 66/86, TNA 195/299, UFC 401/775 (301/326 among the numbered
     events). For the wrestling events TMDB has no `imdb_id` for, `node scripts/resolve-imdb.js`
     looks the id up by name on Cinemeta — but it only found 1 of 308, because IMDb genuinely has
     no entry for the rest. It refuses anything it cannot confirm: the title must carry the
     promotion's name, the words must match exactly (a bare "Bad Blood" event must not grab the
     1987 film of that name), and the release date must be within a week of the event's.
  2. **YouTube videos, played in the app's own player.** The addon searches YouTube by the event
     title (with the year) or, for episodes without their own title, by the show plus the air
     date. It then picks up to 8 videos that genuinely match the request:
     - it rejects videos of another event ("UFC 313" when you asked for "UFC 300"), of another
       year, or, in an "A vs B" fight, that do not carry both names;
     - it lowers the priority of reactions, previews, reviews, pre-shows and shorts;
     - it puts verified official channels (✔) first.
     Each video comes through as a `ytId` stream, which Stremio plays in its internal player.
     The search uses no key: it reads the public results page. If YouTube changes its format or
     takes more than 7 s, the list goes out without videos and the other options remain.
  3. **Search by title, done by this addon.** Every event and episode also offers options that
     open a search by name (or by show name + air date) on official sources: YouTube, Netflix
     (WWE), Triller TV, AEW+, TNA+, UFC Fight Pass, and "Onde ver em PT" with the TMDB/JustWatch
     list when there is one. It is the only route for events without an IMDb id (e.g. a third of
     the TNA events).
- For stream addons, open the **individual event** (e.g. *UFC 300*). Inside the year collections
  the page is a series, and those addons usually do not answer for a movie requested as an
  episode; searching by title works in both places.
- In the year collections, the season is the edition's **year** (e.g. season 2024, episode 1 =
  *WrestleMania XL Saturday*).
- Pre-shows and satellite programmes (*Zero Hour*, *Kickoff*, *Prelims*, *Countdown*…) are
  filtered out, so the catalogs show only the events themselves.
- The ratings shown are TMDB's.
- Events that have not happened yet appear at the end of the UFC catalog, with `(agendado)` in
  the description.

## Layout

```
index.js                 HTTP server, manifest, catalogs and meta
lib/catalogs.js          catalog definitions and reading the configuration from the URL
lib/promotions.js        promotions, TMDB searches and title filters
lib/tmdb.js              TMDB API client
lib/cinemeta.js          Cinemeta (IMDb) — used for ids only, never for data
lib/imdbids.js           finds missing tt… ids by name, conservatively
lib/franchises.js        grouping PPVs into year collections
lib/store.js             joins the repository data with background updates
lib/meta.js              building Stremio's metadata objects
lib/cache.js             in-memory cache with revalidation
lib/httpx.js             HTTP requests with retries and a concurrency limit
scripts/refresh-data.js  updates the files in data/
scripts/resolve-imdb.js  fills missing tt… ids for wrestling events
public/configure.html    configuration page
```
