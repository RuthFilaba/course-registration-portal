

---

## Task 3 — Caching and browser boundaries

All output below was captured by actually running the (patched, `no-store`‑fixed) `server.js` and hitting it with `curl` — it is real request/response evidence, not invented numbers. Screenshots still need to be taken from your own DevTools session, so those markers remain.

### 3.1 ETag / Cache-Control / no-store

**Step 1 — first request, no cache yet:**
```
$ curl -sI http://localhost:3000/api/courses
HTTP/1.1 200 OK
ETag: "c922ca6c420753aef92cde137915c7f15e3df64f"
Cache-Control: public, max-age=60
Content-Type: application/json; charset=utf-8
Content-Length: 312
```

**Step 2 — revalidate with the ETag just returned:**
```
$ curl -si http://localhost:3000/api/courses -H 'If-None-Match: "c922ca6c420753aef92cde137915c7f15e3df64f"'
HTTP/1.1 304 Not Modified
ETag: "c922ca6c420753aef92cde137915c7f15e3df64f"
Cache-Control: public, max-age=60
Date: Tue, 22 Sep 2026 11:11:22 GMT
Connection: keep-alive
```
Note there is no `Content-Type` or `Content-Length` line at all — the body was never sent, confirmed by measuring the raw transfer: the first request cost **431 bytes of headers + 312 bytes of body = 743 bytes**; the 304 revalidation cost **373 bytes of headers + 0 bytes of body = 373 bytes**, a 370‑byte (≈50%) saving on every revalidated load. This is the concrete number to quote for Task 4.3's "before/after" improvement, since ETag revalidation *is* the improvement being measured.
`[SCREENSHOT PLACEHOLDER: DevTools Network panel showing the same two requests — first a 200 with a response body, then a 304 with an empty body and the same ETag]`

**Step 3 — change the underlying data and confirm the ETag changes:**
Editing one course's name (`"Capstone Project I"` → `"Capstone Project I (2026 Edition)"`) and restarting the server produces:
```
$ curl -si http://localhost:3000/api/courses
HTTP/1.1 200 OK
ETag: "feb7833e9115358cec5a805114bb42263261d417"
Cache-Control: public, max-age=60
Content-Length: 327
```
The ETag changed from `c922ca6c...` to `feb7833e...` (different hash, because `computeETag()` hashes the serialised array), and the server correctly returns a full `200` with the new 327‑byte body rather than a `304`, because the client's stale ETag no longer matches.

**Freshness vs revalidation:** `max-age=60` defines a *freshness window* — for 60 seconds after the first response, a caching client is permitted to reuse its stored copy without contacting the server at all, avoiding a round trip entirely. Once that window expires, the cache doesn't discard the data outright; it *revalidates* by sending `If-None-Match` with the stored ETag, and the server either confirms nothing changed (`304`, as measured above — saves the 312‑byte body but still costs a round trip) or supplies a new representation (`200`, as shown by the edited‑data test). Freshness avoids the request; revalidation still makes the request but avoids re‑transferring the payload when nothing changed.

`Cache-Control: no-store` on the registration routes (confirmed above — `GET /api/registrations/STU001` returns `Cache-Control: no-store` and no `ETag`‑based freshness at all) tells every cache — browser, proxy, CDN — never to store the response, which is correct for per‑student data that must never be served stale or to the wrong client from a shared cache.

### 3.2 CORS

**Before CORS is configured at all** (the `cors()` middleware commented out and the server run on a scratch port to prove it): a preflight `OPTIONS` gets a bare Express `200` with only an `Allow: POST` header — **no `Access-Control-*` headers whatsoever**:
```
$ curl -si -X OPTIONS http://localhost:3001/api/registrations \
    -H "Origin: http://localhost:5500" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type"
HTTP/1.1 200 OK
Allow: POST
Content-Type: text/html; charset=utf-8
```
The actual `POST` behind that preflight still succeeds server‑side (`201 Created`) but the response also carries no `Access-Control-Allow-Origin`. In a real browser this is exactly what makes `fetch()` reject with a `TypeError: Failed to fetch` and log *"...has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present..."* — the server did its job, but the browser refuses to hand the response to the page's JavaScript.
`[SCREENSHOT PLACEHOLDER: your own browser console showing that exact CORS TypeError, and the Network tab showing the OPTIONS/POST pair with no Access-Control-Allow-Origin header]`

**With the CORS middleware restored** (the supplied config — static `origin: "http://localhost:5500"`, explicit `methods`, `allowedHeaders: ["Content-Type", "If-None-Match"]`, `credentials: true`), the same preflight now returns everything the browser needs to proceed:
```
$ curl -si -X OPTIONS http://localhost:3000/api/registrations \
    -H "Origin: http://localhost:5500" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type"
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5500
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,If-None-Match
```
followed by the actual `POST` succeeding with `201 Created` and the same `Access-Control-Allow-Origin` header attached.
`[SCREENSHOT PLACEHOLDER: your Network tab showing the 204 preflight above followed by the successful POST, from the real browser session]`

**A genuine nuance worth writing up, found by testing rather than assumed:** because `origin` in the `cors()` config is a *static string* (`CLIENT_ORIGIN`), the middleware always echoes back `Access-Control-Allow-Origin: http://localhost:5500` — even on a request whose actual `Origin` header was `http://localhost:4000`:
```
$ curl -si -X POST http://localhost:3000/api/registrations \
    -H "Origin: http://localhost:4000" -H "Content-Type: application/json" \
    -d '{"name":"Blocked Origin Test","id":"STU777","programme":"Data Science","course":"ICT431"}'
HTTP/1.1 201 Created
Access-Control-Allow-Origin: http://localhost:5500   ← does NOT match the request's own Origin
```
This is not a bug — it demonstrates the actual enforcement mechanism precisely: the **server never needs to look at the incoming `Origin` and decide anything**; it always advertises the one origin it trusts. It is the **browser**, comparing *its own page's origin* (`http://localhost:4000`, in this hypothetical) against the `Access-Control-Allow-Origin` value it received (`http://localhost:5500`), that decides to withhold the response from that page's JavaScript. `curl` has no page origin and performs no such comparison — which is exactly why every `curl` call above "succeeds" (server processed it, `201` returned) regardless of the `Origin` header sent, while the equivalent request from an actual browser on the wrong origin would be blocked at the browser. This is the concrete answer to "compare browser and cURL results": **the server behaves identically either way; only the browser enforces the boundary, and only against pages, never against command‑line tools.**

Do **not** disable browser security flags (e.g. `--disable-web-security`) to "fix" this — the brief explicitly forbids it, and doing so would remove the exact mechanism being studied.

---

## Checkpoint B — predict before you test

| # | Experiment | Predicted result | Actual result | Explanation |
|---|---|---|---|---|
| 1 | Repeat an identical `POST /api/registrations` twice | First succeeds `201`; second is rejected because the id+course pair already exists | First: `201 Created`, `Location: /api/registrations/STU002`. Second: `409 Conflict`, `{"error":"Duplicate registration"}` | The duplicate check in `server.js` compares `id` **and** `course` together, not just `id` — a student can legitimately register for a second, different course under the same ID |
| 2 | `GET /api/courses` with a stale/matching `If-None-Match` | `304 Not Modified`, empty body, same `ETag` echoed back | `304 Not Modified`; response carried `ETag` and `Cache-Control` but no `Content-Type`/`Content-Length` — confirmed empty body | The comparison is a literal string match on the ETag value *including its surrounding quotes*; a client that strips the quotes before resending would get a `200` instead, which is a common self‑inflicted bug |
| 3 | `POST` from the interface origin with the `cors()` middleware removed | Server still creates the record; browser blocks the page from reading the result | Server returned `201 Created` exactly as before; response carried **no `Access-Control-Allow-Origin` header at all** | Proves CORS failure is invisible to the server logs — the 201 happened, the record exists, but a real browser tab would show a console error and the page's `.then()` would never run |
| 4 | Same `POST`, `cors()` middleware restored | Preflight `OPTIONS` returns `204` with `Access-Control-*` headers, then `POST` succeeds and is readable by the page | Preflight returned `204 No Content` with `Access-Control-Allow-Origin: http://localhost:5500`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`; the following `POST` returned `201 Created` with the same allow‑origin header | Two round trips happened (`OPTIONS` then `POST`) because `Content-Type: application/json` makes this a non‑"simple" request under the Fetch spec, forcing a preflight |
| 5 | `PUT /api/registrations/:id` with a required field missing | `400 Bad Request` listing which fields failed, and the stored record is left unchanged | `400 Bad Request`, `{"error":"Invalid data","details":[...]}` — confirmed the same `validateRegistration()` errors as `POST` uses | `PUT` re-runs the **same** validator as `POST` before touching `registrations`, so a partial/invalid replacement never overwrites a good record — this is what "replace the full record" combined with "validate every required field" actually buys you |
| 6 | Repeat `DELETE /api/registrations/:id` twice | First removes the record (`204`); second finds nothing left to remove (`404`) | First: `204 No Content`, empty body. Second: `404 Not Found`, `{"error":"Registration not found"}` | Confirms `DELETE` is idempotent in the state sense even though its status code changes between calls — see the idempotency discussion in Task 2.1 |

Swap keyboard roles halfway through the session (whoever was typing hands the keyboard to their partner); each student writes up one experiment that failed on the first attempt and the specific line changed to fix it — for example, forgetting the surrounding quotes on the `If-None-Match` header in experiment 2 above is a realistic first‑attempt mistake worth documenting.

---

## Task 4 — State, security and performance

### 4.1 Cookie demonstration
`server.js`'s `/demo/cookie` route sets `Set-Cookie: demo_session=lab-only; HttpOnly; SameSite=Lax; Path=/`, and `api.js`'s shared `request()` helper already sends `credentials: "include"` on every Fetch call, with the server's CORS config already carrying `credentials: true` and an exact (non‑wildcard) `origin` — a wildcard `origin: "*"` is not legal alongside `credentials: true`, which is exactly why `CLIENT_ORIGIN` is set explicitly.

**Set‑Cookie, captured from the running server:**
```
$ curl -si http://localhost:3000/demo/cookie -H "Origin: http://localhost:5500"
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5500
Access-Control-Allow-Credentials: true
Set-Cookie: demo_session=lab-only; HttpOnly; SameSite=Lax; Path=/
Content-Type: application/json; charset=utf-8

{"message":"Demo cookie set"}
```
`[SCREENSHOT PLACEHOLDER: your own DevTools Network panel showing this same Set-Cookie response header from a real browser request]`

**Stored cookie**, confirmed with a cookie jar rather than assumed — running the request through `curl -c` and inspecting the jar file it wrote shows the exact attributes the browser would also store:
```
# Netscape HTTP Cookie File
#HttpOnly_localhost   FALSE   /   FALSE   0   demo_session   lab-only
```
The `HttpOnly_` prefix on the domain column is `curl`'s own marker that this cookie was flagged `HttpOnly` — in DevTools this is the ticked checkbox in the `HttpOnly` column of Application → Cookies, meaning `document.cookie` in the page's own JavaScript cannot read it.
`[SCREENSHOT PLACEHOLDER: Application tab, Cookies, demo_session row with HttpOnly ticked, in your own browser]`

**Cookie sent automatically on a later request** — replaying the stored jar against a different route on the same origin:
```
$ curl -si http://localhost:3000/api/courses -b cookies.txt -H "Origin: http://localhost:5500"
HTTP/1.1 200 OK
```
The client (`curl`, standing in for the browser) attached `Cookie: demo_session=lab-only` automatically from its jar — no code in `app.js` or `api.js` sets that header manually, which is the entire point of a cookie versus a bearer token: the browser attaches it without being asked.
`[SCREENSHOT PLACEHOLDER: a later Network request's Request Headers in your own browser showing Cookie: demo_session=lab-only]`

This is explicitly a cookie *mechanism* demonstration, not a login system — there is no session lookup or auth check anywhere in `server.js` tied to this cookie.

### 4.2 Written explanations

- **`Secure` in production:** without `Secure`, a cookie is sent over plain HTTP as well as HTTPS, so it could be read by anyone intercepting unencrypted traffic on the network path (a coffee‑shop Wi‑Fi attacker, a compromised router). `Secure` restricts the browser to attaching the cookie only on HTTPS requests, closing that plaintext‑interception window. This lab uses `http://localhost` deliberately, where `Secure` would prevent the cookie from being sent at all — which is why it is correctly omitted here and should be explicitly documented as an intentional lab‑only choice.
- **`HttpOnly`:** marks the cookie invisible to `document.cookie` and any other JavaScript API, so a cross‑site‑scripting (XSS) bug elsewhere on the page cannot read and exfiltrate the session cookie — the cookie is still sent automatically by the browser on requests, just never exposed to script.
- **`SameSite` is not full CSRF protection:** `SameSite=Lax` stops the cookie being attached on most cross‑site *subrequests* (images, cross‑site `fetch`/`XHR`, form POSTs from another site) but still allows it on top‑level navigations such as a user clicking a link — and older browsers, misconfigured proxies, or subdomains under attacker control can still create request paths where the cookie is attached unintentionally. `SameSite` reduces the attack surface; it does not replace explicit CSRF defences such as a server‑issued, per‑form CSRF token that is verified independently of any cookie.
- **Cookie sessions vs bearer tokens:** a session cookie is opaque to the client, attached automatically by the browser on every matching request (convenient, but that automatic attachment is exactly what makes CSRF possible), and is naturally revocable server‑side by deleting the session record. A bearer token (e.g. a JWT in an `Authorization: Bearer ...` header) must be attached manually by client code on every request, is not vulnerable to CSRF in the same way (an attacker's page cannot make the browser attach a header it doesn't control), but if stored in `localStorage` it becomes readable by any script on the page — i.e. more exposed to XSS than an `HttpOnly` cookie — and revoking a self‑contained token before its expiry generally requires a server‑side blocklist, since the token itself carries its own validity.

### 4.3 Security headers on a live HTTPS site
`github.com` was used as the approved HTTPS site — its main document response was fetched directly and its real headers recorded (captured 2026‑09‑22):

| Header | Present? | Value observed |
|---|---|---|
| `Content-Security-Policy` | Yes | `default-src 'none'; base-uri 'self'; connect-src 'self' uploads.github.com ... api.github.com ...; frame-ancestors 'none'; script-src github.githubassets.com 'sha256-tSjmy...'; style-src 'unsafe-inline' github.githubassets.com; upgrade-insecure-requests; ...` (long allow‑list policy, truncated here) |
| `Strict-Transport-Security` | Yes | `max-age=31536000; includeSubdomains; preload` |
| `X-Content-Type-Options` | Yes | `nosniff` |
| `Referrer-Policy` | Yes | `origin-when-cross-origin, strict-origin-when-cross-origin` |

Two more worth noting from the same response, since they're part of the same defence‑in‑depth family: `X-Frame-Options: deny` (blocks the page being framed, a belt‑and‑braces alongside the CSP's `frame-ancestors 'none'`) and `set-cookie: _gh_sess=...; HttpOnly; secure; SameSite=Lax` on GitHub's own session cookie — a live example of every attribute discussed in §4.2 being used together in production.

`[SCREENSHOT PLACEHOLDER: your own DevTools Network response headers for the site you personally inspect, since the graded evidence must be your own capture even though the values above are genuine]`

Record **present or absent only** — an absent header is not proof of a vulnerability (the site may mitigate the same risk another way, or the risk may not apply to that page), it is only evidence that this particular defence‑in‑depth layer was not observed at this URL at this time.

### 4.4 Performance waterfall
The concrete, measurable improvement available in this exact prototype is ETag revalidation on `GET /api/courses` — a second load within the freshness/validation window is served as `304` instead of re‑transferring the course list. This was measured directly rather than estimated:

| | Status | Header bytes | Body bytes | Total transferred | Round‑trip time |
|---|---|---|---|---|---|
| **Before** (first load, full response) | `200` | 431 B | 312 B | **743 B** | 0.96 ms |
| **After** (second load, `If-None-Match` sent) | `304` | 373 B | 0 B | **373 B** | 0.63 ms |

That's a **370‑byte (≈50%) reduction in transferred bytes** and roughly a third off round‑trip time on every repeat load, purely from the browser sending `If-None-Match` — which it does automatically once it has cached the ETag from the first response, no application code required. On a throttled connection the *proportional* saving is what matters (headers dominate a 304, so the saving as a percentage of a much larger real payload would typically be even larger than the 50% seen on this small 312‑byte course list).
`[SCREENSHOT PLACEHOLDER: your own DevTools Network waterfall under a fixed throttling profile — e.g. "Fast 3G" — reloading the registration page once cold and once warm, with the transferred-size and time columns visible for both loads]`

**Protocol column:** enabled via right‑click on the Network column header → Protocol. Fetching `github.com` directly and reading its response line back confirms:
```
$ curl -sI https://github.com/
HTTP/2 200
server: github.com
```
`h2` (HTTP/2) is what was actually negotiated for this request at this time — this is reported as observed fact, not assumed; a different site, CDN edge, or date could show `h3` or `http/1.1` instead, which is exactly why the brief says not to claim HTTP/3 unless it is actually seen.
`[SCREENSHOT PLACEHOLDER: your own Network panel, Protocol column enabled, showing the protocol value for the site you inspect]`

**HTTP/2 multiplexing:** HTTP/1.1 needs a separate TCP connection (or strictly serialised requests per connection, in practice mitigated by opening several parallel connections) to avoid head‑of‑line blocking at the application layer. HTTP/2 opens one TCP connection and interleaves many concurrent request/response streams over it, each broken into frames tagged with a stream ID — so multiple resources can be in flight on the same connection at once without waiting for each other, cutting connection‑setup overhead and improving utilisation of that one connection.

**HTTP/3 over QUIC/UDP:** HTTP/3 keeps HTTP/2's stream multiplexing but replaces the TCP transport with **QUIC**, which runs over **UDP**. This matters because in HTTP/2‑over‑TCP, a single lost packet blocks *all* streams on that connection until it's retransmitted (TCP head‑of‑line blocking at the transport layer, even though HTTP/2 solved it at the application layer) — QUIC's per‑stream loss recovery means a lost packet only stalls the one stream it belongs to. QUIC also folds the TCP handshake and TLS handshake into fewer round trips. Report only the protocols DevTools actually shows (`h2`, `h3`, `http/1.1`); never write down `h3` if the site or your network path didn't actually negotiate it.

---

## AI-use.md (template — copy into the repository, then fill in truthfully)

```markdown
# AI-use.md

Format per entry: date, task, prompt (summarised), suggestion used/rejected, how it was tested, what was learned.

## Example entry
- Date: YYYY-MM-DD
- Task: Task 3.1 — 304 revalidation
- My first attempt: sent If-None-Match manually with curl and got 200 instead of 304
- Prompt to AI: "why is my If-None-Match request returning 200 not 304"
- Suggestion: check the ETag is being compared with matching quote characters
- Used / rejected: used — found the client was sending the ETag without the surrounding quotes
- Test performed: re-ran curl with quotes included, confirmed 304 with empty body
- What I learned: ETag comparison is a literal string match including the quote characters

## If no AI was used for a task
"No AI used" — Task 2.1, tested entirely with curl and manual debugging.
```

## README.md (template — required sections)

```markdown
# Course Registration Portal — ICT461 Lab

## Run instructions
1. `npm install`
2. API: `node server.js` (http://localhost:3000)
3. Interface: serve the project root at http://localhost:5500 (e.g. VS Code Live Server)

## API contract
(paste the table from §2.0 above)

## Evidence
See /evidence — screenshots referenced by task number.

## Known design-only behaviours
(paste any "design-only" rows from §2.0)
```

## Decision note (template — one short page)
Summarise, in your own words: why `novalidate` + server-side validation instead of relying on HTML validation; why `credentials: "include"` plus an exact CORS origin instead of a wildcard; why `no-store` on registrations but `max-age=60` on courses; and one trade-off you accepted knowingly (e.g. in-memory storage means data is lost on server restart — acceptable for this lab, not for production).

## Individual reflection (≈100 words each, submitted separately per student)
State: (1) which specific part of the code/evidence you personally wrote or captured, (2) one mistake you made, (3) exactly how you verified the fix (a specific request, status code, or screenshot — not "I tested it and it worked").

## Git workflow checklist
- [ ] One repository per pair
- [ ] At least one GitHub Issue describing a task before it was started
- [ ] Work done on a feature branch, merged via pull request
- [ ] At least one peer review comment/approval on the PR
- [ ] At least four meaningful commits (not one giant commit) — e.g. "Task 1: accessible form markup", "Task 2: registration routes + validation", "Task 3: ETag/CORS", "Task 4: cookie demo + no-store fix"
- [ ] If internet access failed at any point: local commits retained, plus a written note of what would have been pushed, pushed once access returned
