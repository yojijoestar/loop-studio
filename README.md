# Loop Studio

Practice K-pop line by line with playback controls, timed lyrics, and Hangul pronunciation.

## Run locally

```sh
python3 -m http.server 8080 --directory public
```

Open http://localhost:8080. Add lyrics using **Lyrics & timing tools**. Korean speech uses your browser's available voices.

## Deploy

Upload the contents of `public/` to a static host. No build command, secrets, or server are needed. For Cloudflare Pages Direct Upload, upload the ZIP of the contents of `public/`. If using Git integration, set the output directory to `public`.

This distribution does not bundle the full song lyrics or translations. The studio recording is played through YouTube's official embed. Lyric imports and timing edits are stored in the browser.
