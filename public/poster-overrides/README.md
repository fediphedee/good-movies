# Poster overrides

Correct poster images for films/shows whose TMDB poster is wrong.

To add one:
1. Put the image here (e.g. `eight-and-a-half.jpg`) — jpg/png/webp, portrait ~2:3.
2. Add a line to `src/lib/poster.ts` keyed by the film's Letterboxd id:
   `'2aqm': 'eight-and-a-half.jpg',`

The Letterboxd id is the code in the film's `boxd.it/<id>` link (the poster in
the app links there), and it's the `id` field in `public/movies.json`.
