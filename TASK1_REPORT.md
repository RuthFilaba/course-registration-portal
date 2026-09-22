# Task 1 — Accessible Interface

## 1.1 Semantic structure and form

| Requirement | Where it is implemented |
|---|---|
| `header`, `nav`, `main`, `footer` | `index.html` |
| Logical heading order | `h1` → `h2` (Course Registration) |
| Form fields | `name`, `id`, `programme`, `course` |
| Linked labels | `label[for]` matches each `input[id]` / `select[id]` |
| Required fields | `required` on all four controls |
| Real submit button | `<button type="submit">` inside `<form>` |
| Visible feedback | `<p id="status" role="status" aria-live="polite">` |

User input is never inserted with `innerHTML`. Course options are built with
`document.createElement` and `option.textContent`, so a malicious course name
would render as text rather than markup.

## 1.2 Responsive layout and keyboard test

### Layout

- Grid is used for the form (`display: grid`).
- Flexbox is used for the header, the nav and the `.actions` row.
- Two media queries: `@media (max-width: 640px)` and `@media (min-width: 900px)`.
- `overflow-x` is controlled by `min-width: 0` on flex children and
  `overflow-wrap: break-word` on the brand text.

### Test at 360 px

- `document.documentElement.scrollWidth` = 360
- No horizontal scrollbar
- Screenshot: `evidence/screenshots/task1-2-360.png`

### Test at 1366 px

- Content column is centered, no horizontal scrollbar
- Header brand aligns left, Register aligns right
- Screenshot: `evidence/screenshots/task1-2-1366.png`

### Keyboard-only test

Tab order observed:

1. Skip to main content
2. Register (header nav)
3. Full name
4. Student ID
5. Programme
6. Course
7. Submit registration

- Every control showed a 3 px navy focus outline (`:focus-visible`).
- Shift+Tab returned through the same order in reverse.
- Enter on the submit button triggered form submission.

Fixes applied:

| Problem found | Fix |
|---|---|
| Faint focus ring on navy header | Added `:focus-visible` with `outline-offset: 2px` |
| Overflow at 360 px from the two-line brand | `min-width: 0` and `overflow-wrap: break-word` |
| Skip link focusable but invisible | Positioned off-screen, revealed on `:focus` |

## 1.3 Module script, events and storage

### Module import

`app.js` is loaded with `<script type="module" src="app.js"></script>`.
At the top of `app.js`:

    import { fetchCourses, submitRegistration } from "./api.js";

`api.js` exports both functions, which wrap `fetch` with shared headers,
`credentials: "include"` and structured error handling.

### Submit event and loading state

`handleSubmit` is attached with `addEventListener("submit", …)`. It calls
`event.preventDefault()` so the browser does not perform a native form
submission. It then disables the submit button and sets the status to
"Submitting registration…" before awaiting the API response.

### Error state

The response is handled in three branches:

- `result.ok` → green success message
- `result.status === 409` → red duplicate message
- anything else → red fallback error

The status element has `role="status"` and `aria-live="polite"`, so screen
readers announce each change without interrupting the user.

### Safe DOM updates

All text is set via `textContent`, never `innerHTML`. Course options are
appended with `createElement` and `appendChild`.

### localStorage persistence

Only one key is stored:

    localStorage.setItem("programme", data.programme);

After a page reload, `restoreProgrammePreference` reads the value and
applies it to the programme dropdown, but only if the saved value is one of
the available `<option>` values. Verified in DevTools → Application →
Local Storage → `http://localhost:5500`:

    programme    Data Science

Screenshot: `evidence/screenshots/task1-3-localstorage.png`

### sessionStorage vs localStorage

| Aspect | `localStorage` | `sessionStorage` |
|---|---|---|
| Lifetime | Until explicitly cleared | Until the tab is closed |
| Scope | All tabs on the same origin | One tab only |
| Survives reload | Yes | Yes |
| Survives tab close | Yes | No |
| Suitable for | Non-sensitive, long-lived preferences | Short-lived, per-tab data |
| Used here for | Programme preference | Not used |

Neither should hold tokens or personal data because JavaScript can read
both. In this lab the programme preference is a UI convenience, not a
security decision, so `localStorage` is appropriate. If the preference were
meant to last only for one registration session, `sessionStorage` would be
the correct choice.

## Checkpoint A

### Data flow

See `evidence/sketches/flow.png`.

    Browser → Web Server (Express) → Application (validation) → Data Store (in-memory Map)

### Where validation belongs

| Layer | Purpose | Reason |
|---|---|---|
| Browser | Immediate feedback for the user | Improves UX, but can be bypassed with DevTools |
| Web server | Enforce rules before logic runs | Trust boundary — cannot be bypassed by the client |
| Application logic | Business rules (duplicate, valid course code) | Central place for rules that must always hold |
| Data store | Last line of defence | Not exercised in this lab (in-memory only) |

### Standards bodies

| Standard | Body | Reference |
|---|---|---|
| HTML | WHATWG | HTML Living Standard |
| ECMAScript | ECMA International (TC39) | ECMA-262 |
| HTTP | IETF | RFC 9110–9114 |