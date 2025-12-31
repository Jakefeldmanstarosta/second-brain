import { renderMarkdown } from "./markdown.js";

const formatTimestamp = (iso) => {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const renderTags = (tags) =>
  tags
    .map((tag) => `<span>${tag}</span>`)
    .join("");

const emptyState = (message) => `<div class="empty">${message}</div>`;

export const renderNotes = (notes, container) => {
  if (notes.length === 0) {
    container.innerHTML = emptyState("No notes yet. Capture something.");
    return;
  }

  container.innerHTML = notes
    .map(
      (note) => `
      <article class="card">
        <div class="card-header">
          <span>Note</span>
          <span>${formatTimestamp(note.createdAt)}</span>
        </div>
        <div class="card-body">${renderMarkdown(note.text)}</div>
        <div class="card-tags">${renderTags(note.tags)}</div>
      </article>
    `
    )
    .join("");
};

export const renderEvents = (events, container) => {
  if (events.length === 0) {
    container.innerHTML = emptyState("No events yet. Dates will land here.");
    return;
  }

  container.innerHTML = events
    .map(
      (event) => `
      <article class="card">
        <div class="card-header">
          <span>Event</span>
          <span>${formatTimestamp(event.date)}</span>
        </div>
        <div class="card-body">${renderMarkdown(event.text)}</div>
        <div class="card-tags">${renderTags(event.tags)}</div>
        <div class="card-header">
          <span>Attached notes</span>
          <span>${event.noteIds.length}</span>
        </div>
      </article>
    `
    )
    .join("");
};

export const renderReminders = (reminders, container) => {
  if (reminders.length === 0) {
    container.innerHTML = emptyState("No reminders yet. Action verbs end here.");
    return;
  }

  container.innerHTML = reminders
    .map(
      (reminder) => `
      <article class="card">
        <div class="card-header">
          <span>${reminder.kind === "context" ? "Context" : "Reminder"}</span>
          <span>${formatTimestamp(reminder.createdAt)}</span>
        </div>
        <div class="card-body">${renderMarkdown(reminder.text)}</div>
        <div class="card-tags">${renderTags(reminder.tags)}</div>
        ${
          reminder.trigger
            ? `<div class="card-header"><span>Trigger</span><span>${reminder.trigger}</span></div>`
            : ""
        }
      </article>
    `
    )
    .join("");
};
