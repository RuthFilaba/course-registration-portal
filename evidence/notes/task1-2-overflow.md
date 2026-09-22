# Task 1.2 — Overflow Check

Set DevTools viewport to 360 × 800. Ran in the Console:

    document.documentElement.scrollWidth

Result: 360

No horizontal overflow at 360 px.

Fixes applied:
1. min-width: 0 on .brand and .field
2. overflow-wrap: break-word on brand text
3. flex-wrap: wrap on the header row
4. max-width: 100% on inputs and submit button