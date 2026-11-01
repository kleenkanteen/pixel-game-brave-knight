# Birdsong API research

Ticket: [001 — Which free API supplies the birdsong?](../../001-birdsong-api.md)
Researched: 2026-10-31. CORS results come from live `curl` runs that day with `Origin: http://localhost:5173`.

## Recommendation

**Use Wikimedia Commons (MediaWiki Action API).**

- It needs no key and no account.
- The JSON responses and the audio files (on `upload.wikimedia.org`) both send `Access-Control-Allow-Origin: *`.
- MP3 search works, and each response carries licence and author metadata.
- Commons has many clips of calm woodland birdsong, all CC BY-SA 4.0.

**Runner-up: Internet Archive.** It also needs no key and has open CORS on both the search JSON and the audio. Its birdsong results are noisy, though (radio shows, music), and many items have no licence metadata. You would have to hand-pick items.

**Ruled out for a client-only game: xeno-canto and Freesound.** Both need a key in every request, and both sets of terms say not to publish that key. A browser-only game would have to ship the key in its JS.

| | Key needed | CORS (JSON) | CORS (audio) | Licence | Fit |
|---|---|---|---|---|---|
| **Wikimedia Commons** | No | `*` (with `origin=*`) | `*` | Per file, mostly CC BY-SA / CC0 | **Best** |
| Internet Archive | No | `*` | `*` (after a 302 redirect) | Per item, often missing | Runner-up |
| Freesound | Yes (token) | `*` | `*` | Per sound, CC0 / BY / BY-NC | Key would be exposed |
| xeno-canto v3 | Yes (`key=`) | Reflects the origin | `*` | Per recording, mostly CC BY-NC-SA | Key would be exposed. v2 is gone |

## Wikimedia Commons (recommended)

### Access and CORS
- **Access:** anonymous read requests need no key. Add `origin=*` so MediaWiki answers as a logged-out user with CORS headers. Source: [API:Cross-site requests](https://www.mediawiki.org/wiki/API:Cross-site_requests). That page says anonymous requests get `Access-Control-Allow-Credentials: false` and are "processed as if logged out".
- **Tested CORS on the JSON:** `api.php?...&origin=*` returned `HTTP/2 200`, `access-control-allow-origin: *` and `cache-control: max-age=3600, public`.
- **Tested CORS on the audio:** `https://upload.wikimedia.org/wikipedia/commons/c/cb/Birdsong_Bourne_Woods_2020-04-27_0722.mp3` returned `200`, `content-type: audio/mpeg`, `access-control-allow-origin: *`, and `access-control-expose-headers` including `Content-Range`. This means the file works in a plain `<audio>` element and also in Web Audio (`fetch` → `decodeAudioData`, or `crossOrigin="anonymous"` + `MediaElementSource`).

### Rate limits and reliability
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette) says: "There is no hard speed limit on read requests". It asks clients to send requests in series and to set an informative User-Agent.
- Browsers can't set `User-Agent`. The workaround header `Api-User-Agent` would trigger a CORS preflight, so it is optional and can be skipped.
- The game makes one request per Play click, which is far below any concern.

### Licence
- Licences are set per file. They are exposed as `extmetadata.LicenseShortName`, `LicenseUrl` and `Artist`.
- [Commons:Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) says no permission is needed, but some licences require you to credit the author and name the licence.
- For CC BY-SA 4.0 playback, show a credit such as: "Birdsong: *<title>* by *<Artist>*, CC BY-SA 4.0, via Wikimedia Commons", linked to `descriptionurl`. A small credits line on the title screen or dialogue screen is enough.
- The game only plays the audio and does not modify it, so ShareAlike should not affect the game's own code. This is the usual reading of CC BY-SA for unmodified media.

### Format and length
- Search with `filemime:audio/mpeg` so you only get MP3s, which play in every browser. Commons also hosts `.oga` (Ogg) and `.wav` files.
- `iiprop=size` returns `duration` in seconds.
- A test search for `birdsong` returned 50 MP3 hits, mostly 30–105 s woodland recordings. A few are dawn-chorus files of 20 min to 2 h. Filter those out by duration.

### Example request (live-tested, returns 50 results)
```
https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&generator=search&gsrnamespace=6&gsrsearch=birdsong%20filemime%3Aaudio%2Fmpeg&gsrlimit=50&prop=imageinfo&iiprop=url%7Cmime%7Csize%7Cextmetadata&iiextmetadatafilter=LicenseShortName%7CArtist%7CLicenseUrl
```
Each element of `query.pages[]` has `title` plus `imageinfo[0].{url, descriptionurl, mime, duration, extmetadata}`.

### Picking a calm, birdsong-only clip
Commons has no quality rating, so filter on the client:
1. Use `filemime:audio/mpeg` and keep `30 ≤ duration ≤ 180` s. This drops the very short species clips and the hour-long dawn choruses.
2. Allow only these licences: `CC0`, `Public domain`, `CC BY*`.
3. Reject titles that match `/call|alarm|rain|traffic|crow|gull|owl|parrot|footpath/i`. With step 1, 39 of the 50 results passed.
4. Pick one at random and loop it with `audio.loop = true` while the dialogue is on screen.

**More predictable option (recommended for "pleasant"):** hard-code 3–5 file titles you have listened to, and resolve them at runtime with `titles=`. This is still a runtime API fetch, but the result is always calm. Live-tested:
```
https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&titles=File%3ABirdsong_Bourne_Woods_2020-04-27_0722.mp3%7CFile%3ABourne_woods_Birdsong_2020-06-25_0745.mp3&prop=imageinfo&iiprop=url%7Cmime%7Csize%7Cextmetadata&iiextmetadatafilter=LicenseShortName%7CArtist%7CLicenseUrl
```
That request returned 31 s and 80 s MP3s, both CC BY-SA 4.0 by Robert EA Harvey, with direct `upload.wikimedia.org` URLs.

Good candidates from the same recordist, all tagged "Birdsong", 31–105 s:
- `File:Birdsong Bourne Woods 2020-04-27 0722.mp3`
- `File:Bourne Woods Birdsong 2020-04-27 0751.mp3`
- `File:Bourne woods Birdsong 2020-06-25 0745.mp3`
- `File:Bourne woods Birdsong 2020-06-30 0811.mp3`

Listen to these before pinning them. The other source in this space, `incategory:"Dawn_chorus"` (also live-tested), returns long files.

### Sketch
```js
const API = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
  action: 'query', format: 'json', formatversion: '2', origin: '*',
  titles: PINNED_TITLES.join('|'), prop: 'imageinfo',
  iiprop: 'url|mime|size|extmetadata', iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl',
});
const pages = (await (await fetch(API)).json()).query.pages.filter(p => p.imageinfo);
const pick = pages[Math.floor(Math.random() * pages.length)].imageinfo[0];
const audio = new Audio(pick.url); audio.loop = true; audio.volume = 0.4;
await audio.play(); // call inside the Play click handler (or after it) so autoplay policy allows it
```
`Artist` is HTML, so strip the tags before showing it.

## Internet Archive (runner-up)
- **Tested CORS on search:** `https://archive.org/advancedsearch.php?q=birdsong+AND+mediatype%3Aaudio&fl[]=identifier&fl[]=title&fl[]=licenseurl&rows=8&output=json` returned `200` with `access-control-allow-origin: *`.
- **Tested CORS on metadata and files:** `https://archive.org/metadata/the-lily-pond` lists the files. `https://archive.org/download/the-lily-pond/The%20Lily%20Pond.mp3` returns a `302` to `dnXXXX.ca.archive.org` (which has `ACAO: *`) and then a `200` `audio/mpeg` (also `ACAO: *`). A browser follows that redirect fine.
- **Downsides:**
  - Search relevance for "birdsong" is poor. Results included a 2009 concert, a radio show and an ad, alongside a CC0 nature recording, "The Lily Pond".
  - `licenseurl` is usually empty.
  - Files are often long (226 s and up) and the metadata has no quality signal.
- **Fit:** works if you pin specific item identifiers, but Commons does that job with better metadata.

## Freesound (rejected for client-only)
- **Key required:** without a token, `/apiv2/search/text/` returned `401` with "Authentication credentials were not provided."
- **CORS is open:** the API sends `ACAO: *`, and preflight allows the `authorization` header. Previews at `cdn.freesound.org/previews/...-hq.mp3` return `ACAO: *` and `audio/mpeg`.
- **Auth:** [Authentication docs](https://freesound.org/docs/api/authentication.html) describe token auth, which needs an account and an API key, sent as `token=` or `Authorization: Token`.
- **Throttling:** [Overview → Throttling](https://freesound.org/docs/api/overview.html) gives "60 requests per minute and 2000 requests per day" per key. That daily cap would be shared by every player of a public game.
- **Terms:** the [API Terms](https://freesound.org/help/tos_api/) say keys "may be revoked if you share them with any third party … if they are compromised", and "You must keep these credentials safe".
- **Conclusion:** shipping the key in Vite client JS breaks the terms. Freesound has the best search and quality data of the four (ratings, `duration`, licence filters), so it would be the pick if a tiny proxy or serverless function were ever allowed.

## xeno-canto (rejected for client-only)
- **v2 is gone:** `api/2/recordings` returned `404` with "Xeno-canto API v2 is no longer available".
- **v3 needs a key:** without `key=` it returned `401` with "Missing or invalid 'key' parameter". The `key=demo` used in the docs' examples also returned `401`, so it is a placeholder.
- **Docs on the key:** [xeno-canto API v3 docs](https://xeno-canto.org/explore/api) say "The API now requires an API key"; "Do not share your key with others and take care not to publish it in any git repositories"; and "prolonged abuse … may result in … revocation of your key". The same page says the strict rate limit was lifted once keys were introduced.
- **CORS:** the JSON reflects the request's origin, with credentials allowed. Audio at `https://xeno-canto.org/<id>/download` returned `200` `audio/mpeg` with `ACAO: *`.
- **Content:** recordings are mostly CC BY-NC-SA and often several minutes long (the docs' example is 4:08). They are single-species field recordings, which are often harsh calls and not ambience. Useful filters exist (`q:A`, `len:`, `type:song`), but the key problem rules it out.
- **Workaround:** some xeno-canto soundscapes are mirrored on Commons (e.g. `File:Sonus naturalis - Soundscape XC178043.mp3`, CC BY-SA 4.0), so they are reachable through the recommended path.

## Blockers
None for the recommendation: Commons needs no key, account or proxy.
