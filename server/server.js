// server.js
// ICT461 Lab — Express API for the course registration prototype.
// Records are held in memory because a database is outside this lab's scope.
// Every write is validated on the server: the client form is a convenience,
// not a security boundary.

import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
const PORT = 3000;

// The client is served from a different origin in development, so the API
// must explicitly allow it rather than relying on a wildcard.
const CLIENT_ORIGIN = "http://localhost:5500";

// CORS is configured once at the top of the middleware chain so every route
// inherits the same policy. Credentials are enabled because the cookie demo
// in Task 3 step 9 requires Access-Control-Allow-Credentials to be true.
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "If-None-Match"],
    exposedHeaders: ["ETag", "Location"],
    credentials: true,
  })
);

// JSON and URL-encoded parsers are mounted together so the /inspect diagnostic
// route can compare the two content types as required by Task 2 step 3.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registration responses must never be cached. A cached 201 would hide a
// new registration; a cached 409 would keep the student from retrying.
// no-store tells browsers and proxies not to store the response at all.
app.use("/api/registrations", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// The assigned courses for Year 4 Semester 1
const courses = [
  { code: "ICT411", name: "Cloud Computing & Distributed Systems" },
  { code: "ICT461", name: "Web Systems & Technology (Full Stack Engineering)" },
  { code: "ICS441", name: "Advanced Cybersecurity & Ethical Hacking" },
  { code: "ICT481", name: "Software Project Management" },
  { code: "ICT431", name: "Capstone Project I" },
];

const validProgrammes = new Set([
  "Computer Science",
  "BSc Computer Science",
  "Data Science",
  "Cybersecurity",
  "Information Technology",
]);

// Registrations are seeded with one record so GET /:id has something to return
// during the first round of manual testing.
const registrations = new Map();
registrations.set("STU001", {
  id: "STU001",
  name: "Demo Student",
  programme: "BSc Computer Science",
  course: "ICT461",
});

function getRecords(studentId) {
  const records = registrations.get(studentId);
  return Array.isArray(records) ? records : records ? [records] : [];
}

function getRecord(studentId) {
  return getRecords(studentId)[0];
}

// This function computes a stable ETag from any JSON-serialisable value so
// that GET /api/courses can support conditional requests without storing state.
function computeETag(value) {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify(value))
    .digest("hex");
}

// This function validates a registration payload on the server and returns
// a list of human-readable errors so the route handlers can respond with 400.
function validateRegistration(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string") errors.push("name is required");
  if (!body.id || typeof body.id !== "string") errors.push("student id is required");
  if (!body.programme || typeof body.programme !== "string") errors.push("programme is required");
  if (!body.course || typeof body.course !== "string") errors.push("course is required");
  if (body.programme && !validProgrammes.has(body.programme)) {
    errors.push("programme is not valid");
  }
  if (body.course && !courses.some((c) => c.code === body.course)) {
    errors.push("course is not in the assigned list");
  }
  return errors;
}

// This route returns the assigned courses with a public cache policy and an
// ETag so that repeat requests can be answered with 304 when nothing changed.
app.get("/api/courses", (req, res) => {
  const etag = computeETag(courses);
  res.set("ETag", `"${etag}"`);
  res.set("Cache-Control", "public, max-age=60");

  if (req.headers["if-none-match"] === `"${etag}"`) {
    return res.status(304).end();
  }
  res.status(200).json(courses);
});

// This route returns one registration by student id, or 404 when the record
// is unknown.
app.get("/api/registrations/:id", (req, res) => {
  const record = getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: "Registration not found" });
  res.status(200).json(record);
});

// This route creates a new registration, returns 201 with a Location header,
// and rejects duplicates with 409 as required by the lab.
app.post("/api/registrations", (req, res) => {
  const errors = validateRegistration(req.body);
  if (errors.length) return res.status(400).json({ error: "Invalid data", details: errors });

  const existing = getRecords(req.body.id).some(
    (record) => record.course === req.body.course
  );
  if (existing) {
    return res.status(409).json({ error: "Duplicate registration" });
  }

  const record = {
    id: req.body.id,
    name: req.body.name,
    programme: req.body.programme,
    course: req.body.course,
  };
  registrations.set(record.id, [...getRecords(record.id), record]);
  res.set("Location", `/api/registrations/${record.id}`);
  res.status(201).json(record);
});

// This route replaces the full record. Every required field must be present,
// otherwise the request is rejected with 400 before any state is changed.
app.put("/api/registrations/:id", (req, res) => {
  const errors = validateRegistration(req.body);
  if (errors.length) return res.status(400).json({ error: "Invalid data", details: errors });

  const record = { ...req.body, id: req.params.id };
  const records = getRecords(req.params.id);
  if (records.length) {
    records[0] = record;
    registrations.set(req.params.id, records);
  } else {
    registrations.set(req.params.id, [record]);
  }
  res.status(200).json(record);
});

// This route allows the student to change only their programme preference,
// which is the single mutable field in this prototype.
app.patch("/api/registrations/:id", (req, res) => {
  const record = getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: "Registration not found" });

  if (!req.body.programme || !validProgrammes.has(req.body.programme)) {
    return res.status(400).json({ error: "programme is invalid" });
  }

  record.programme = req.body.programme;
  res.status(200).json(record);
});

// This route removes a record and returns 204 with no body, so callers must
// not try to parse the response as JSON.
app.delete("/api/registrations/:id", (req, res) => {
  if (!registrations.has(req.params.id)) {
    return res.status(404).json({ error: "Registration not found" });
  }
  registrations.delete(req.params.id);
  res.status(204).end();
});

// This diagnostic route echoes the method, path, headers and body so the
// report can compare Accept with Content-Type and show how each parser
// handles form data versus JSON.
app.all("/inspect", (req, res) => {
  res.status(200).json({
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: req.body,
  });
});

// This route sets a non-sensitive demonstration cookie. It is not a login
// system; it exists only to show Set-Cookie, the stored cookie and the
// Cookie header on a later request.
app.get("/demo/cookie", (req, res) => {
  res.set(
    "Set-Cookie",
    "demo_session=lab-only; HttpOnly; SameSite=Lax; Path=/"
  );
  res.status(200).json({ message: "Demo cookie set" });
});

// A single start-up log line makes it obvious which port the API is bound to
// when the client cannot reach it during testing.
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});