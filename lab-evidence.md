# ICT461 Lab — Evidence Document



## Task 1 — Accessible Interface

### 1.2 Responsive layouts

**360px width**

![enter image description here](evidence/screenshot/responsive360.png)

Result: `.wrap` has no fixed width below 640px, `form` stays in a single-column grid, and the `@media (max-width: 640px)` block reduces heading size and spacing. 

**1366px width**

[SCREENSHOT: DevTools device toolbar set to 1366px width, full page visible]

Result: `.wrap` caps at `max-width: 840px` (via the `@media (min-width: 900px)` rule) and is centered with `margin: 0 auto`
### 1.2 Keyboard-only completion

[SCREENSHOT: form mid-completion, focus ring visible on the currently focused field, captured after tabbing through Name → Student ID → Programme → Course → Submit using only Tab/Shift+Tab/Enter]

`a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible` draws a `3px solid var(--navy)` outline, so each control should show a clearly visible dark blue ring as you tab through. Pressing Enter on the submit button  triggers `handleSubmit` the same as a mouse click, since it's a real `<button type="submit">` inside a `<form>`.

### 1.3 localStorage persistence

[SCREENSHOT: DevTools → Application → Local Storage → http://localhost:5500, showing a `programme` key with a saved value, taken after submitting the form once and reloading the page]

 `handleSubmit` calls `localStorage.setItem("programme", data.programme)` before the request is even sent, so the key will exist regardless of whether the POST succeeds. After a reload, `restoreProgrammePreference()` reads it back and pre-selects the matching `<option>` 

**sessionStorage vs localStorage**

`localStorage` persists indefinitely (survives closing the tab and the browser, until explicitly cleared), which is why it's the right choice here for a preference the student expects to see on their next visit. `sessionStorage` is scoped to a single tab and is cleared as soon as that tab closes — useful for state that shouldn't outlive the current visit, but wrong for this use case since the whole point is that the preference is still there after a reload.

----------

## Task 2 — HTTP Contract

### 2.1 cURL tests



```bash
# GET /api/courses
curl -i http://localhost:3000/api/courses

```

Expected: `200`, `Content-Type: application/json`, an `ETag` header, `Cache-Control: public, max-age=60`, and a JSON array of the five seeded courses (ICT411, ICT461, ICS441, ICT481, ICT431).

```bash
# GET /api/registrations/:id — known record
curl -i http://localhost:3000/api/registrations/STU001

```

Expected: `200` with `{"id":"STU001","name":"Demo Student","programme":"BSc Computer Science","course":"ICT461"}`, plus `Cache-Control: no-store` from the registrations middleware.

```bash
# GET /api/registrations/:id — unknown record
curl -i http://localhost:3000/api/registrations/STU999

```

Expected: `404` with `{"error":"Registration not found"}`.

```bash
# POST /api/registrations — success
curl -i -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","id":"STU002","programme":"Cybersecurity","course":"ICS441"}'

```

Expected: `201`, `Location: /api/registrations/STU002`, body echoes the four fields back.

```bash
# POST /api/registrations — invalid data
curl -i -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"","id":"STU003","programme":"Not A Real Programme","course":"ICT461"}'

```

Expected: `400`, `{"error":"Invalid data","details":["name is required","programme is not valid"]}` (exact `details` array depends on which fields fail `validateRegistration`).

```bash
# POST /api/registrations — duplicate
curl -i -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Student","id":"STU001","programme":"BSc Computer Science","course":"ICT461"}'

```

Expected: `409`, `{"error":"Duplicate registration"}` — because STU001 is already seeded against ICT461 and the duplicate check matches on the `id` + `course` pair, not `id` alone.

```bash
# PUT /api/registrations/:id
curl -i -X PUT http://localhost:3000/api/registrations/STU001 \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Student","id":"STU001","programme":"Data Science","course":"ICT461"}'

```

Expected: `200`, full record returned with the updated programme. Omitting any of the four required fields should instead return `400` before any state changes.

```bash
# PATCH /api/registrations/:id
curl -i -X PATCH http://localhost:3000/api/registrations/STU001 \
  -H "Content-Type: application/json" \
  -d '{"programme":"Information Technology"}'

```

Expected: `200` with the record showing the new programme. Sending an invalid programme value returns `400 {"error":"programme is invalid"}`; sending it for an unknown ID returns `404`.

```bash
# DELETE /api/registrations/:id
curl -i -X DELETE http://localhost:3000/api/registrations/STU001

```

Expected: `204` with an empty body — do not try to parse this as JSON. A second identical DELETE call returns `404 {"error":"Registration not found"}` since the record no longer exists.

[SCREENSHOT: terminal output of all eight cURL calls above, showing status lines and bodies]

### 2.2 Repeating POST, PUT, DELETE — idempotency

[SCREENSHOT: terminal showing the same POST run twice in a row]

 the first POST returns `201`; the identical second POST returns `409`, because the server _state_ changed after the first call (the id+course pair now exists) even though  the exact same request was sent. This is why POST is **not idempotent** — repeating it does not guarantee the same server effect.

[SCREENSHOT: terminal showing the same PUT run twice in a row]

 both PUT calls return `200` with an identical body, and the stored record is the same after either call — repeating PUT with the same payload leaves the server in the same state each time, which is what idempotent means here. (Two different status codes are not required for idempotency; what matters is that the _resulting resource state_ doesn't change on repetition.)

[SCREENSHOT: terminal showing the same DELETE run twice in a row]

 first call `204`, second call `404` — the status code differs, but the _end state_ (no record with that ID exists) is the same after either call, so DELETE is still idempotent by the "same eventual server effect" definition, even though the response code changes.

### 2.3 Network tab captures

**Successful POST**

[SCREENSHOT: Network tab — Headers, Payload, Response and Timing sub-tabs for a successful POST /api/registrations, submitted through the actual form]

 Request headers include `Content-Type: application/json`; request payload is the `Object.fromEntries(new FormData(form))` result as JSON — so keys are `name`, `id`, `programme`, `course` exactly as the form's `name` attributes. Response status `201`, `Location` header present, response body matches the submitted record.

**Invalid POST**

[SCREENSHOT: Network tab for a POST where server-side validation fails]

 `400`, response body has an `error` field and a `details` array. Note this can only be produced through the browser by bypassing the HTML5 `required` attributes (see 2.4) or by an invalid `<select>` value, since the form's own constraints normally block submission first.

**Duplicate POST**

[SCREENSHOT: Network tab for submitting the same student ID + course combination twice]

 `409`, `{"error":"Duplicate registration"}`. In the UI, `app.js`'s `handleSubmit` catches `result.status === 409` specifically and shows "This student is already registered for <course>."

**Missing record**

[SCREENSHOT: Network tab for a request to /api/registrations/:id with an ID that was never created]

 `404`, `{"error":"Registration not found"}`.

### 2.4 Copy as cURL

[SCREENSHOT: terminal output after right-clicking one of the captured requests above → Copy → Copy as cURL, pasting it into the terminal, and re-running it]

reproduces the same status code and body as the original browser request, since the server has no session-specific state beyond the `Cookie` header (only relevant after Task 4) 

### 2.5 Bypassing the form to prove server validation

[SCREENSHOT: either DevTools Elements panel showing a `required` attribute removed from an input, or a raw cURL/fetch call sending incomplete data directly to the API, followed by the resulting 400 response]

even with the browser's own validation disabled or skipped, `validateRegistration` in `server.js` still runs on every POST/PUT and still returns `400` with a `details` array — this is the evidence that client-side `required` attributes are a UX convenience, not the actual security boundary.

### 2.6 `/inspect` — form data vs JSON

[SCREENSHOT: response body from POST /inspect sent with Content-Type: application/x-www-form-urlencoded]

[SCREENSHOT: response body from POST /inspect sent with Content-Type: application/json]

Expected result: in both cases the `body` field in the echoed JSON should contain your submitted fields correctly parsed — `express.urlencoded({ extended: true })` handles the first, `express.json()` handles the second, and both are mounted so `/inspect` works either way. Compare the `Accept` header your client sent against the `Content-Type` header it sent; for a typical `fetch` call these are usually different (`Accept` often defaults to `*/*` unless set explicitly, while `Content-Type` reflects the body format).

### 2.7 Request URL anatomy

[SCREENSHOT: Network tab request with the full URL visible, e.g. `http://localhost:3000/api/registrations/STU001?debug=1#section`]

Label on the screenshot (or in a caption below it):

-   Scheme: `http`
-   Host: `localhost`
-   Port: `3000`
-   Path: `/api/registrations/STU001`
-   Query: `?debug=1`

 the `#section` fragment does **not** appear anywhere in the Network tab's request — fragments are resolved entirely client-side and are never sent to the server, which is exactly what the absence of `#section` in the captured request proves.

----------

## Task 3 — Caching and Browser Boundaries

### 3.1 ETag / conditional requests

[SCREENSHOT: first GET /api/courses response showing the ETag response header]

[SCREENSHOT: second GET /api/courses sent with If-None-Match set to that same ETag value, showing a 304 status with an empty response body]

Expected result: `computeETag` hashes the `courses` array with SHA-1, and the route compares `req.headers["if-none-match"]` against that hash. If they match, the server returns bare `304` with `.end()` 

[SCREENSHOT: after editing the `courses` array in server.js and restarting the server, a GET /api/courses response showing 200 with the updated data and a different ETag]

changing the array changes its SHA-1 hash, so the old `If-None-Match` value no longer matches and the server falls through to `res.status(200).json(courses)`, returning the new data with a new ETag.

**Freshness vs revalidation:** `Cache-Control: public, max-age=60` governs _freshness_ — for 60 seconds after a response, the browser can reuse its cached copy without contacting the server at all. Once that window expires, the browser _revalidates_ by sending `If-None-Match`, and the server decides whether to confirm the cache (`304`) or supply fresh data (`200`).

**no-store on registrations**

[SCREENSHOT: Network tab response headers for any /api/registrations/* request, showing Cache-Control: no-store]

: because the middleware added in this session sets `Cache-Control: no-store` on every `/api/registrations` route, the browser should never serve a cached registration response.

### 3.2 CORS

[SCREENSHOT: Network/Console showing a blocked CORS request — captured either by temporarily changing `CLIENT_ORIGIN` in server.js to a value that doesn't match where the page is served from, or by opening the page from an unexpected origin]

the browser console shows a CORS policy error (something like "No 'Access-Control-Allow-Origin' header..."), and the Network tab shows the request as failed even though the server may have processed it. An `OPTIONS` preflight request should appear immediately before the blocked `POST`, sent automatically by the browser because the actual request uses `Content-Type: application/json`, which triggers preflighting.

[SCREENSHOT: the same POST succeeding after CLIENT_ORIGIN is restored to http://localhost:5500]

`200`/`201` as normal, with `Access-Control-Allow-Origin: http://localhost:5500` present in the response headers, because the origin now matches the `cors()` configuration in `server.js` exactly.

**Browser vs cURL comparison:** the identical request sent via cURL in section 2.1 succeeded even before any CORS configuration existed. CORS is a browser-enforced restriction on cross-origin _JavaScript_, not a server-side access control — cURL has no origin concept and is never blocked by it, which is the concrete evidence that CORS protects browsers reading responses, not the server's data itself.

----------

## Task 4 — State, Security and Performance

### 4.1 Cookie demonstration

[SCREENSHOT: clicking "Set demo cookie" on the page, then Network tab showing the Set-Cookie response header on the /demo/cookie response]

 `Set-Cookie: demo_session=lab-only; HttpOnly; SameSite=Lax; Path=/`.

[SCREENSHOT: DevTools → Application → Cookies → http://localhost:3000, showing the stored demo_session cookie with HttpOnly and SameSite=Lax flags checked]

[SCREENSHOT: Network tab on a subsequent request to the API, showing the Cookie header being sent back automatically]

 because `credentials: "include"` is set on the fetch in `fetchDemoCookie()` (and on every call through `api.js`'s `request()` helper), the browser stores the cookie and automatically resends it as a `Cookie` header on later requests to the same origin.

### 4.2 Written explanations

-   **Secure requires HTTPS:** the `Secure` flag tells the browser to only ever send the cookie over an encrypted connection. Without it, the same cookie could be sent in plaintext over HTTP and intercepted on the network; it's not enabled here because this demo intentionally runs over plain HTTP on localhost.
-   **HttpOnly blocks JavaScript access:** a cookie marked `HttpOnly` is excluded from `document.cookie` entirely — confirm this by opening the console after setting the demo cookie and running `document.cookie`; the `demo_session` value should not appear. This is a defence against theft via cross-site scripting (XSS): even if malicious JS runs on the page, it cannot read the cookie.
-   **SameSite doesn't replace CSRF protection:** `SameSite=Lax` blocks the cookie from being sent on most cross-site _subrequests_ (like an `<img>` or background fetch from another site), but it still allows the cookie on top-level navigation (e.g. clicking a link) and doesn't protect against every attack vector — a malicious site could still trigger a same-site-safe top-level GET that performs a state change if the server isn't also checking a CSRF token for that action.
-   **Cookie sessions vs bearer tokens:** a session cookie is automatically attached by the browser to every matching request, which is convenient but makes it a CSRF target unless mitigated; a bearer token (e.g. in an `Authorization` header) must be attached explicitly by client code, which avoids CSRF by default but means the client is responsible for storing it safely (and it's vulnerable to theft via XSS if kept somewhere JavaScript can read, like `localStorage`).

### 4.3 External HTTPS site header check

[SCREENSHOT: Network tab response headers for the main document request on a real HTTPS site of your choice, with Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options and Referrer-Policy highlighted or annotated as present/absent]

Record simply: which of the four headers were present, which were absent. Absence does not by itself prove the site is vulnerable — these headers are defence-in-depth measures, and their absence only means that particular layer isn't in use, not that no protection exists at all.

### 4.4 Performance waterfall

[SCREENSHOT: Network waterfall, throttling set to the same profile (e.g. "Fast 3G"), captured before your improvement — note total transferred bytes and load time]

[SCREENSHOT: Network waterfall under the same throttling, captured after your improvement]

Expected result: whatever asset or request you removed/reduced should show a measurable drop in total transferred bytes and/or total load time between the two captures. Name the specific change you made (e.g. "removed the unused Google Fonts import" or "reduced an image's dimensions") and quote the two numbers side by side.

[SCREENSHOT: Network tab with the Protocol column enabled, on the same external HTTPS site used in 4.3]

Record the actual protocol shown (e.g. `h2`, `h3`, `http/1.1`) — don't assume; report what DevTools actually displays.

----------


