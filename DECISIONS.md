# Design Decisions

A short note explaining the choices that were not forced by the brief,
and the reasoning behind each one.

## Client and server are separate origins

The client is served at `http://localhost:5500` and the API at
`http://localhost:3000`. They are different origins, so the browser
enforces CORS between them.

**Decision:** allow only `http://localhost:5500` on the server.

**Reason:** the brief asks to "allow only the interface origin plus
required methods and Content-Type." A single exact origin is the
strictest reading of that instruction. If the client were served from
more than one place, listing all origins would be reasonable, but for
this lab a single origin is easier to defend and leaves no wildcards in
the configuration.

**Consequence:** the client must always be opened at `localhost:5500`.
Opening it at `127.0.0.1:5500` is a different origin to the browser and
will be blocked.

## Records are held in memory

Registrations are stored in a `Map` inside `server.js`, with an array of
course registrations for each student ID.

**Decision:** no database.

**Reason:** the brief states "a database and real authentication are
outside this lab." A `Map` gives constant-time lookup by student ID while
the per-student array preserves separate course registrations. The API
rejects a repeated student ID and course combination. It also has no
installation cost and no setup beyond `npm install`.

**Consequence:** restarting the server resets all registrations, and the
student-ID routes operate on the first record when a student has multiple
course registrations. That is acceptable for this demonstration API.

## Validation is server-side only at runtime

The form has `required` attributes on every field, so the browser stops
an empty submission. But the API validates every field again.

**Decision:** duplicate validation in both places.

**Reason:** the client form is a convenience, not a security boundary.
Anyone can bypass it with DevTools or cURL. The server is the only place
where a rule can be guaranteed to hold. The brief expects this — Task 2
step 2 says "Bypass the form to prove server validation still works."

**Consequence:** every route handler calls `validateRegistration()` or
its own equivalent before touching the data store.

## Only the programme preference is stored on the client

`localStorage` holds a single key: `programme`.

**Decision:** store nothing else.

**Reason:** the brief says "Store only a programme preference in
localStorage." Name, student ID and course are not persisted because
they are personal data and are not needed after a reload. The programme
is a UI convenience only.

**Consequence:** after a reload the name, student ID and course fields
reset. Only the programme dropdown stays on the last value.

## Native form controls, no CSS framework

Every control is a native HTML `<input>`, `<select>` or `<button>`.

**Decision:** no Bootstrap, no Tailwind, no component library.

**Reason:** three reasons. Native controls are accessible by default,
they respond to Tab and Enter the way the brief expects, and they avoid
a build step. A framework would add a dependency, a stylesheet and a
class name for every element, and would not change the API contract
being assessed.

**Consequence:** the CSS is written by hand. It is around 300 lines and
is committed with the client.

## Single accent colour, no shadows

The interface uses one navy accent (`#14213d`) on white.

**Decision:** no cards with shadows, no gradients, no rounded excess.

**Reason:** the brief asks for a form on a page, not a product landing
page. Every visual element maps to a requirement — no decoration to
defend at Checkpoint A. A small gold accent (`#c89b3c`) is used only on
hover states and the header border, so the interface still has a
recognisable palette without competing for attention.

## Git workflow

The lab asks for "an issue, feature branch and peer review."

**Decision:** work solo but keep the discipline of a real workflow.

- One issue is opened to describe the lab.
- Work is done on a feature branch and merged into `main`.
- The "peer review" is a written self-review note, honest about being
  a solo submission.

**Reason:** the workflow requirement exists to show that the code
changed in a controlled way, not to test whether the marker will notice
a missing reviewer. Being explicit about the solo case is more honest
than inventing a second contributor.

## What was deliberately not done

- No authentication. Out of scope.
- No database. Out of scope.
- No build step. Not needed.
- No `innerHTML` anywhere in the client. Prevents XSS.
- No wildcard CORS. Would undermine the exact-origin policy.
- No session cookies. The demo cookie route exists only to show how
  `HttpOnly` and `SameSite` behave.