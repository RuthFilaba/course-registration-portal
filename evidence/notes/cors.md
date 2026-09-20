# CORS Investigation

## First attempt — failure

Client served at http://127.0.0.1:5500 but the API only allowed
http://localhost:5500. The browser blocked the request with:

    Access to fetch at 'http://localhost:3000/api/courses' from origin
    'http://127.0.0.1:5500' has been blocked by CORS policy: Response to
    preflight request doesn't pass access control check: The
    'Access-Control-Allow-Origin' header has a value
    'http://localhost:5500' that is not equal to the supplied origin.

## Root cause

Browsers treat localhost and 127.0.0.1 as different origins even though
they resolve to the same host.

## Fix

Changed the Live Server host setting from 127.0.0.1 to localhost. Now the
client is served at http://localhost:5500, matching the server's CORS
policy exactly.

## Result

The GET request succeeded with status 200 and the course dropdown was
populated from the API.