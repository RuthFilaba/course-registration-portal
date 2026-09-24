# Task 2 — Network Tab Evidence

Four requests were captured in the browser with DevTools → Network open.
Each one shows the request side (method, URL, headers, body) and the
response side (status, headers, body). One of them was reproduced
outside the browser using Copy as cURL.

All screenshots referenced below are in `evidence/screenshots/`.

## Capture 1 — Successful POST

| Field | Value |
|---|---|
| Method | POST |
| URL | http://localhost:3000/api/registrations |
| Status | 201 Created |
| Request body | `{"name":"Edward","id":"STU500","programme":"Information Technology","course":"ICT461"}` |
| Response body | `{"id":"STU500","name":"Edward","programme":"Information Technology","course":"ICT461"}` |

### Explanation

The form submitted valid data. The browser first ran a CORS preflight
request (`OPTIONS`, shown with status 204 in the Network list), then sent
the POST. The server created the record, returned **201 Created**, and
included a `Location` header pointing to the new resource. The response
body echoed the stored record.

### Evidence

- `evidence/screenshots/task2-post-201-network.png`
- `evidence/screenshots/task2-post-201-headers.png`
- `evidence/screenshots/task2-post-201-payload.png`
- `evidence/screenshots/task2-post-201-response.png`
- `evidence/screenshots/task2-post-201-response-headers.png`

## Capture 2 — Invalid POST

| Field | Value |
|---|---|
| Method | POST |
| URL | http://localhost:3000/api/registrations |
| Status | 400 Bad Request |
| Request body | `{"name":"","id":"STU900","programme":"","course":"NOTACOURSE"}` |
| Response body | `{"error":"Invalid data","details":["name is required","programme is required","course is not in the assigned list"]}` |

### Explanation

The request was sent directly from the DevTools Console using `fetch`,
bypassing the form entirely. The server rejected it because two required
fields were empty and the course code is not in the assigned list. This
is the proof required by the brief that **server-side validation runs
independently of the client form** and cannot be bypassed by skipping
the browser UI. The `details` array names each specific rule that failed.

### Evidence

- `evidence/screenshots/task2-post-400-headers.png`
- `evidence/screenshots/task2-post-400-payload.png`
- `evidence/screenshots/task2-post-400-response.png`

## Capture 3 — Duplicate POST

| Field | Value |
|---|---|
| Method | POST |
| URL | http://localhost:3000/api/registrations |
| Status | 409 Conflict |
| Request body | `{"name":"Edward","id":"STU500","programme":"Information Technology","course":"ICT461"}` |
| Response body | `{"error":"Duplicate registration"}` |

### Explanation

The same student ID and course combination was submitted a second time
through the form. The server checked the in-memory store, found an
existing record with the same `id` and `course`, and returned **409
Conflict**. The client detected the 409 and displayed the duplicate
message in red below the form:

> Registration could not be completed.
> This student is already registered for ICT461.

This satisfies the brief's requirement to **reject duplicate
registrations**.

### Evidence

- `evidence/screenshots/task2-post-409-headers.png`
- `evidence/screenshots/task2-post-409-payload.png`
- `evidence/screenshots/task2-post-409-response.png`
- `evidence/screenshots/task2-post-409-status.png`

## Capture 4 — Missing Record

| Field | Value |
|---|---|
| Method | GET |
| URL | http://localhost:3000/api/registrations/NOPE |
| Status | 404 Not Found |
| Request body | none |
| Response body | `{"error":"Registration not found"}` |

### Explanation

A GET was sent for a student ID that does not exist in the store. The
server returned **404 Not Found** with an error object in the body. A
second request using a valid-looking ID (`STU999999`) returned the same
404, which confirms the route checks the data store rather than the URL
format.

### Evidence

- `evidence/screenshots/task2-get-404-headers.png`
- `evidence/screenshots/task2-get-404-response.png`

## Copy as cURL — Reproduce a Browser Request

The successful POST from Capture 1 was copied out of DevTools using
**Copy as cURL (bash)** and run in PowerShell.

### The browser's original request

Saved at `evidence/curl/18-copy-as-curl-command.txt`:

    curl --url 'http://localhost:3000/api/registrations' \
      -H 'Accept: */*' \
      -H 'Content-Type: application/json' \
      -H 'Origin: http://localhost:5500' \
      -H 'Referer: http://localhost:5500/' \
      --data-raw '{"name":"Lama","id":"STU600","programme":"Information Technology","course":"ICT481"}'

### The equivalent request run in PowerShell

Result saved at `evidence/curl/19-copy-as-curl-result.txt`:

    {"id":"STU602","name":"Lama","programme":"Information Technology","course":"ICT481"}

### Comparison

| Field | Browser | Terminal |
|---|---|---|
| Method | POST | POST |
| URL | same | same |
| Content-Type | `application/json` | `application/json` |
| Body | JSON with four fields | JSON with four fields |
| Status | 201 | 201 |
| Response | the created record | the created record |

### Explanation

The two requests carry the same method, URL, Content-Type and body. The
server returned the same status and the same JSON body in both cases.
The terminal request omitted browser-only headers such as
`User-Agent`, `Accept-Language` and `Sec-Fetch-*`, which the server
does not use for this route. The JSON body was written to a file and
sent with `--data-binary @body-copy.txt` because PowerShell strips
backslash-escaped quotes from command-line arguments — the request
itself is the same.

This confirms that the browser is only one client of the API and that
the same request works identically outside the browser.

## Summary

| Requirement | Evidence |
|---|---|
| Successful POST inspected in Network | Capture 1 |
| Invalid POST inspected in Network | Capture 2 |
| Duplicate POST inspected in Network | Capture 3 |
| Missing record inspected in Network | Capture 4 |
| Request/response headers and body saved for each | Screenshots + this document |
| Server-side validation cannot be bypassed | Capture 2 (Console) + Capture 3 (form) |
| Copy as cURL reproduces a request | Copy as cURL section |
| Browser and cURL results compared | Comparison table above |