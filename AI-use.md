# AI Use Log

## First attempt — before any AI input

I sketched the browser → Express → in-memory Map → response flow and
marked validation on both the client form and inside the POST handler.
I attempted Task 1 items 1–2 by hand and got stuck on:

- Making the header register link stay on the right at all viewport widths.
- Getting the submit button to be small, rounded and left-aligned.

## Prompts and outcomes

### Prompt 1
**Question:** how to make a two-line brand and a nav link sit on the same
baseline in a flex header.
**Suggestion used:** `align-items: flex-start` combined with `margin-left:
auto` on the nav.
**My test:** resized to 360 px and 1366 px, confirmed alignment held.
**Learned:** `align-items` controls cross-axis alignment for all children
at once, so it affects both brand and nav.


### Prompt 2
**Question:** CORS failure when the client was at `127.0.0.1:5500` but the
server allowed `localhost:5500`.
**Suggestion used:** served the client at `http://localhost:5500` so the
origins match. Rejected the alternative of allowing both origins because
the single origin is a stricter policy and easier to defend.
**My test:** reloaded at localhost, confirmed 200 status in Network tab.
**Learned:** browsers treat `localhost` and `127.0.0.1` as different
origins even though they resolve to the same host.

## No AI-generated screenshots or invented results were submitted.