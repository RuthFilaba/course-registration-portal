// app.js
// ICT461 Lab — Client-side behaviour for the registration portal.
// The module imports the Fetch helper from api.js and updates the page
// using textContent only, so user input is never treated as markup.

import { fetchCourses, submitRegistration } from "./api.js";

// This function runs once the DOM is ready and prepares the page by
// loading courses, restoring the saved programme and wiring the submit event.
async function initialiseApp() {
  await loadCourseOptions();
  restoreProgrammePreference();
  attachFormHandler();
}

// This function fetches the assigned courses and fills the course dropdown.
async function loadCourseOptions() {
  const select = document.querySelector("#course");
  const result = await fetchCourses();

  if (!result.ok) {
    // The API may not be running yet during Task 1. Add a placeholder
    // course list so the form is still usable while the server is down.
    const fallbackCourses = [
      { code: "ICT411", name: "Cloud Computing & Distributed Systems" },
      { code: "ICT461", name: "Web Systems & Technology (Full Stack Engineering)" },
      { code: "ICS441", name: "Advanced Cybersecurity & Ethical Hacking" },
      { code: "ICT481", name: "Software Project Management" },
      { code: "ICT431", name: "Capstone Project I" },
    ];

    for (const course of fallbackCourses) {
      const option = document.createElement("option");
      option.value = course.code;
      option.textContent = `${course.code} — ${course.name}`;
      select.appendChild(option);
    }
    return;
  }

  for (const course of result.data) {
    const option = document.createElement("option");
    option.value = course.code;
    option.textContent = `${course.code} — ${course.name}`;
    select.appendChild(option);
  }
}

// This function reads the programme preference from localStorage and
// applies it to the dropdown, but only if the saved value is one of the
// available options. Otherwise the select would silently stay on the
// placeholder.
function restoreProgrammePreference() {
  const select = document.querySelector("#programme");
  const saved = localStorage.getItem("programme");
  if (!saved) return;

  const isKnown = Array.from(select.options).some(
    (option) => option.value === saved
  );

  if (isKnown) {
    select.value = saved;
  }
}

// This function handles the submit event, disables the button while the
// request is in flight, and reports the outcome without reloading the page.
async function handleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const data = Object.fromEntries(new FormData(form));

  // Only the programme preference is persisted. No personal data is stored.
  localStorage.setItem("programme", data.programme);

  button.disabled = true;
  setStatus("Submitting registration…", "loading");

  const result = await submitRegistration(data);

  button.disabled = false;

  if (result.ok) {
    setStatus(
      `Registration successful.\n${data.course}\nStudent ID: ${data.id}`,
      "success"
    );
    form.reset();
    restoreProgrammePreference();
  } else if (result.status === 409) {
    setStatus(
      `Registration could not be completed.\nThis student is already registered for ${data.course}.`,
      "error"
    );
  } else if (result.data?.error) {
    setStatus(result.data.error, "error");
  } else {
    setStatus(
      "Registration failed. Please check that the API is running.",
      "error"
    );
  }
}

// This function attaches the submit handler to the form once the DOM is ready.
function attachFormHandler() {
  document
    .querySelector("#registration-form")
    .addEventListener("submit", handleSubmit);
}

// This function updates the status message and its class in one place so
// every part of the application reports outcomes consistently.
function setStatus(message, state) {
  const el = document.querySelector("#status");
  el.textContent = message;
  el.className = `status ${state ?? ""}`.trim();
}

document.addEventListener("DOMContentLoaded", initialiseApp);