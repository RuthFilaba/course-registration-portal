// api.js
// ICT461 Lab — Fetch helpers for the course registration portal.
// All API access goes through this module so the rest of the application
// never needs to know the base URL or how responses are parsed.

const API_BASE = "http://localhost:3000/api";

// This helper wraps fetch so every request shares the same headers,
// credentials and response handling. Network failures are caught and
// returned as a structured error object instead of throwing, so callers
// can handle an offline API the same way they handle a 4xx or 5xx response.
export async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...options,
    });

    // A 204 response has no body, so parsing it as JSON would throw.
    if (response.status === 204) {
      return { ok: response.ok, status: 204 };
    }

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    // The API is unreachable — DNS, refused connection, offline, etc.
    return { ok: false, status: 0, data: { error: "Network error" } };
  }
}

// This function retrieves the assigned courses from the server so the
// course dropdown is populated from a single source of truth.
export async function fetchCourses() {
  return request("/courses");
}

// This function is responsible for submitting the registration form
// and sending the registration data to the server using the API helper.
export async function submitRegistration(data) {
  return request("/registrations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}