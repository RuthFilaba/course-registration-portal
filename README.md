# Mulungushi University — Course Registration Portal

A small course registration portal built for the ICT461 lab. It has an
accessible form on the client and an Express API on the server. Records
are held in memory because a database is outside this lab's scope.

## Project structure

    course-registration-portal/
    ├── client/
    │   ├── index.html      accessible form and page structure
    │   ├── styles.css      responsive styling
    │   ├── app.js          form handling and DOM updates
    │   └── api.js          fetch helper for API calls
    ├── server/
    │   └── server.js       Express API with six routes
    ├── evidence/
    │   ├── curl/           raw HTTP responses for every route
    │   ├── notes/          keyboard, overflow and CORS investigations
    │   ├── screenshots/    responsive and state screenshots
    │   └── sketches/       browser to data store flow sketch
    ├── package.json
    ├── package-lock.json
    ├── README.md
    ├── TASK1_REPORT.md
    └── AI-use.md

## Requirements

- Node.js 18 or later
- A browser with DevTools (Chrome, Edge or Firefox)
- Two terminals — one for the API, one for the client

## Install

From the project root:

    npm install

That installs Express and CORS.

## Run

### Terminal 1 — start the API

    cd server
    node server.js

Expected output:

    API listening on http://localhost:3000

Leave this terminal open. Closing it stops the API.

### Terminal 2 — serve the client

From the project root:

    npx serve client -l 5500

Or use the VS Code Live Server extension. If you use Live Server, change
its host setting from `127.0.0.1` to `localhost` so the client origin
matches the API's CORS policy.

Open the client at:

    http://localhost:5500/client/index.html

**Do not open the client at `127.0.0.1:5500`.** The API allows only
`http://localhost:5500`. The two forms of the same host are different
origins to the browser.

## Using the form

1. Enter a full name.
2. Enter a student ID.
3. Choose a programme from the dropdown.
4. Choose a course from the dropdown.
5. Click **Submit registration**.

The status paragraph below the form reports the outcome:

- Green — registration succeeded (HTTP 201).
- Red — duplicate registration (HTTP 409) or invalid data (HTTP 400).
- Red — network error if the API is not running.

Only the programme preference is saved in `localStorage`. Reloading the
page restores it.

## API contract

Base URL: `http://localhost:3000`

All requests and responses use `application/json`.

### GET /api/courses

Returns the assigned courses for Year 4 Semester 1.

| | |
|---|---|
| Method and route | `GET /api/courses` |
| Request body | none |
| Success | `200 OK` — JSON array of course objects |
| Failure 1 | `304 Not Modified` — when `If-None-Match` matches the current ETag |
| Failure 2 | `500 Internal Server Error` — design only, not triggered in this lab |
| Headers | `ETag`, `Cache-Control: public, max-age=60` |

### GET /api/registrations/:id

Returns a single registration by student ID.

| | |
|---|---|
| Method and route | `GET /api/registrations/:id` |
| Request body | none |
| Success | `200 OK` — the registration record |
| Failure 1 | `404 Not Found` — unknown student ID |
| Failure 2 | `400 Bad Request` — malformed ID, design only |

### POST /api/registrations

Creates a new registration.

| | |
|---|---|
| Method and route | `POST /api/registrations` |
| Request body | `{ name, id, programme, course }` |
| Success | `201 Created` — record created, `Location` header set |
| Failure 1 | `400 Bad Request` — missing or invalid field, unknown course code |
| Failure 2 | `409 Conflict` — student already registered for this course |

### PUT /api/registrations/:id

Replaces the full registration record.

| | |
|---|---|
| Method and route | `PUT /api/registrations/:id` |
| Request body | `{ name, id, programme, course }` |
| Success | `200 OK` — the replaced record |
| Failure 1 | `400 Bad Request` — any required field missing |
| Failure 2 | `404 Not Found` — design only, this route creates the record if it does not exist |

### PATCH /api/registrations/:id

Changes the programme only.

| | |
|---|---|
| Method and route | `PATCH /api/registrations/:id` |
| Request body | `{ programme }` |
| Success | `200 OK` — the updated record |
| Failure 1 | `400 Bad Request` — missing or invalid programme value |
| Failure 2 | `404 Not Found` — unknown student ID |

### DELETE /api/registrations/:id

Removes a registration.

| | |
|---|---|
| Method and route | `DELETE /api/registrations/:id` |
| Request body | none |
| Success | `204 No Content` — no response body |
| Failure 1 | `404 Not Found` — unknown student ID |
| Failure 2 | `500 Internal Server Error` — design only |

### GET /inspect

Diagnostic route. Echoes the request method, path, query, headers and
parsed body. Used to compare `Accept` with `Content-Type` and to show how
the JSON and URL-encoded parsers handle different content types.

### GET /demo/cookie

Sets a non-sensitive cookie with `HttpOnly`, `SameSite=Lax` and `Path=/`.
This is a demonstration only — it is not a login system.

## HTTP status codes used

| Code | Meaning | Where it is used |
|---|---|---|
| 200 | OK | successful GET, PUT, PATCH |
| 201 | Created | successful POST |
| 204 | No Content | successful DELETE |
| 304 | Not Modified | conditional GET with matching ETag |
| 400 | Bad Request | validation failure |
| 404 | Not Found | unknown record |
| 409 | Conflict | duplicate registration |

## Standards

| Standard | Body | Reference |
|---|---|---|
| HTML | WHATWG | HTML Living Standard |
| ECMAScript | ECMA International (TC39) | ECMA-262 |
| HTTP | IETF | RFC 9110 – 9114 |
| CSS | W3C | CSS Snapshot |

## Evidence

All HTTP evidence is in `evidence/curl/`. All browser evidence is in
`evidence/screenshots/`. All written investigations are in `evidence/notes/`.

The hand-drawn data flow sketch for Checkpoint A is at
`evidence/sketches/flow.png`.

## AI use

See `AI-use.md`.

## Task 1 report

See `TASK1_REPORT.md`.
