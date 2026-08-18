# Reel — a movie & TV diary

A cinematic, animation-rich diary for logging every film and show you watch — built to replace a Notion movie database. React + Vite, no backend required.

![Reel](public/clapper.svg)

## Features

- **Poster-forward diary** — a responsive grid of everything you've watched, with 3D tilt-on-hover cards, ratings and first-time markers.
- **Cinematic hero** — a rotating spotlight on your top-rated title, with an animated backdrop.
- **Rich add flow** — search real films & TV via TMDB (posters, synopsis, genres auto-filled), or add anything by hand. Precise 10-point ratings, watched date and first-time status.
- **Detail view** — expand any entry to read/edit your rating and metadata inline.
- **Stats dashboard** — animated count-ups, rating distribution, top genres, a 12-month activity chart, a films-vs-TV donut and your highest-rated list.
- **Satisfying touches** — spring animations everywhere, a confetti burst when you log something, view transitions and toasts.
- **Your data stays yours** — everything is saved in your browser (localStorage). Export/restore a JSON backup, or import your existing **Notion** database from a CSV export.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (default http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## Connect TMDB (optional but recommended)

1. Make a free account at [themoviedb.org](https://www.themoviedb.org/).
2. Go to **Settings → API** and copy your **API Read Access (v3)** key.
3. In the app, open **Settings** and paste it under *TMDB*. Search goes live in **Add watch**.

The key is stored only in your browser and is never sent anywhere but TMDB.

## Import from Notion

In Notion: open your movie database → **••• → Export → Markdown & CSV**, unzip, then in the app go to **Settings → Import from Notion** and choose the CSV. It maps columns like *Name/Title, Year, Type, Rating, Date, Notes, Genre, Favorite*, converts ratings (★★★★, 9/10, 4.5 all work) to a 0–10 scale, and skips duplicates.

## Tech

- React 18 + Vite 6
- framer-motion for animation
- No backend — localStorage persistence with JSON + CSV import/export

## Project layout

```
src/
  App.jsx              app shell, nav, view transitions, toasts, confetti
  index.css            the whole design system (cinematic dark theme)
  lib/
    store.js           localStorage-backed diary state (useDiary hook)
    tmdb.js            TMDB search client
    csv.js             tolerant Notion CSV parser
    sample.js          first-run seed entries
    icons.jsx          inline icon set
  components/
    Library.jsx        hero + stat strip + toolbar + poster grid
    PosterCard.jsx     tilt card with graceful image fallback
    DetailModal.jsx    expanded entry view/editor
    AddModal.jsx       TMDB search + manual add flow
    Stats.jsx          animated stats dashboard
    Settings.jsx       TMDB key, backup, Notion import
    Rating.jsx         10-point slider rating control
    AnimatedNumber.jsx spring count-up
    Toast.jsx          toast notifications
```
