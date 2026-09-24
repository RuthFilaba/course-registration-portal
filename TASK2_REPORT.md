# Task 2 — Implement and Test the HTTP Contract

## The six routes

The API contract for all six routes is in `README.md`. This report
covers the additional work required by Task 2: the `/inspect`
diagnostic route, the Accept vs Content-Type comparison, URL anatomy,
fragments, and idempotency.

## The `/inspect` diagnostic route

`GET/POST /inspect` echoes `method`, `path`, `query`, `headers` and
`body`. It exists so the difference between parsing rules can be
demonstrated with real requests rather than asserted.

### JSON body

Request:

    POST /inspect
    Content-Type: application/json
    Accept: application/json
    {"name":"Ruth","id":"STU001"}

Response body (trimmed):

    {
      "method": "POST",
      "path": "/inspect",
      "headers": {
        "content-type": "application/json",
        "accept": "application/json"
      },
      "body": { "name": "Ruth", "id": "STU001" }
    }

The body arrived as a raw string and was parsed into an object by
`express.json()`.

Evidence: `evidence/curl/08-inspect-json.txt`

### Form-encoded body

Request:

    POST /inspect
    Content-Type: application/x-www-form-urlencoded
    name=Ruth&id=STU001

Response body (trimmed):

    {
      "headers": {
        "content-type": "application/x-www-form-urlencoded"
      },
      "body": { "name": "Ruth", "id": "STU001" }
    }

The body was parsed by `express.urlencoded()` instead. Both parsers
are mounted in `server.js` so the same route can handle either type.

Evidence: `evidence/curl/09-inspect-form.txt`

## Accept vs Content-Type

These are two different HTTP headers doing two different jobs.

| Header | Meaning | Direction |
|---|---|---|
| `Content-Type` | The media type of the body the client is sending | request |
| `Accept` | The media type(s) the client would like to receive | request |

They can disagree. A client can send JSON and ask for HTML. In the
test at `10-inspect-accept.txt`, the request used
`Content-Type: application/json` and `Accept: text/html`. The server
still returned `Content-Type: application/json` in the response
because the route hard-codes JSON output. The `Accept` header was
recorded in the echoed headers but did not influence the response.

That is a correct — if minimal — implementation. A server that
supported content negotiation would inspect `Accept` and return the
requested format. This prototype does not need that.

Evidence: `evidence/curl/10-inspect-accept.txt`

## URL anatomy

Take the request URL:

    http://localhost:3000/inspect?term=2026&semester=1#section-two

| Component | Value |
|---|---|
| Scheme | `http` |
| Host | `localhost` |
| Port | `3000` |
| Path | `/inspect` |
| Query | `term=2026&semester=1` |
| Fragment | `section-two` |

### Fragments are not sent to the server

The `#section-two` part is a fragment. Fragments are handled entirely
by the client — usually by the browser to scroll to an element — and
are stripped from the URL before the request leaves the client.

Proof: in `11-inspect-url.txt`, the response body contains the path
and query, but **no fragment appears anywhere**. The server did not
receive it and cannot see it.

Evidence: `evidence/curl/11-inspect-url.txt`