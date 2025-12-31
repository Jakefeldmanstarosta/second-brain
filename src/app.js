import { loadState, addEntry, createId, updateEntry } from "./storage.js";
import { inferType, parseDateTime, extractReminderContext } from "./inference.js";
import { extractTags } from "./tags.js";
import { renderNotes, renderEvents, renderReminders } from "./ui.js";

const state = {
  data: loadState(),
  filters: {
    search: "",
  },
};

const elements = {
  notesList: document.getElementById("notesList"),
  eventsList: document.getElementById("eventsList"),
  remindersList: document.getElementById("remindersList"),
  notesCount: document.getElementById("notesCount"),
  eventsCount: document.getElementById("eventsCount"),
  remindersCount: document.getElementById("remindersCount"),
  mainInput: document.getElementById("mainInput"),
  sendButton: document.getElementById("sendButton"),
  micButton: document.getElementById("micButton"),
  searchInput: document.getElementById("searchInput"),
};

const applySearch = (notes) => {
  const query = state.filters.search.trim().toLowerCase();
  if (!query) {
    return notes;
  }
  return notes.filter((note) =>
    [note.text, ...note.tags].some((value) => value.toLowerCase().includes(query))
  );
};

const render = () => {
  const filteredNotes = applySearch(state.data.notes);
  renderNotes(filteredNotes, elements.notesList);
  renderEvents(state.data.events, elements.eventsList);
  renderReminders(state.data.reminders, elements.remindersList);

  elements.notesCount.textContent = String(state.data.notes.length);
  elements.eventsCount.textContent = String(state.data.events.length);
  elements.remindersCount.textContent = String(state.data.reminders.length);
};

const attachNoteToEvent = (note) => {
  const dateInfo = parseDateTime(note.text);
  if (!dateInfo) {
    return;
  }
  const matchingEvent = state.data.events.find((event) =>
    event.date.startsWith(dateInfo.date.toISOString().slice(0, 10))
  );
  if (!matchingEvent) {
    return;
  }

  if (matchingEvent.noteIds.includes(note.id)) {
    return;
  }

  state.data = updateEntry(state.data, "events", matchingEvent.id, (event) => ({
    ...event,
    noteIds: [...event.noteIds, note.id],
  }));
};

const handleSubmit = () => {
  const text = elements.mainInput.value.trim();
  if (!text) {
    return;
  }

  const type = inferType(text);
  const createdAt = new Date().toISOString();
  const tags = extractTags(text);

  if (type === "event") {
    const dateInfo = parseDateTime(text);
    const event = {
      id: createId(),
      text,
      createdAt,
      date: dateInfo?.iso ?? createdAt,
      dateLabel: dateInfo?.label ?? "",
      tags,
      noteIds: [],
    };
    state.data = addEntry(state.data, "events", event);
  } else if (type === "reminder") {
    const trigger = extractReminderContext(text);
    const reminder = {
      id: createId(),
      text,
      createdAt,
      tags,
      kind: trigger ? "context" : "time",
      trigger,
    };
    state.data = addEntry(state.data, "reminders", reminder);
  } else {
    const note = {
      id: createId(),
      text,
      createdAt,
      tags,
    };
    state.data = addEntry(state.data, "notes", note);
    attachNoteToEvent(note);
  }

  elements.mainInput.value = "";
  elements.sendButton.disabled = true;
  render();
};

const handleKeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
};

const handleInput = (event) => {
  const value = event.target.value;
  elements.sendButton.disabled = value.trim().length === 0;
  event.target.style.height = "auto";
  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
};

const bindSpeechInput = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.micButton.disabled = true;
    elements.micButton.title = "Speech input not supported";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  elements.micButton.addEventListener("click", () => {
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    elements.mainInput.value = transcript;
    elements.sendButton.disabled = transcript.trim().length === 0;
    elements.mainInput.focus();
  });
};

const bindEvents = () => {
  elements.sendButton.addEventListener("click", handleSubmit);
  elements.mainInput.addEventListener("keydown", handleKeydown);
  elements.mainInput.addEventListener("input", handleInput);
  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    render();
  });
};

bindEvents();
bindSpeechInput();
render();
