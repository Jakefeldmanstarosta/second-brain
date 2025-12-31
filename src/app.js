import { loadState, addEntry, createId, updateEntry } from "./storage.js";
import { inferType, parseDateTime, extractReminderContext } from "./inference.js";
import { extractTags } from "./tags.js";
import { renderNotes, renderEvents, renderReminders } from "./ui.js";
import { requestStructuredEntry } from "./llm.js";
import { loadSettings, saveSettings } from "./settings.js";

const state = {
  data: loadState(),
  filters: {
    search: "",
  },
  settings: loadSettings(),
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
  apiKeyInput: document.getElementById("apiKeyInput"),
  saveKeyButton: document.getElementById("saveKeyButton"),
  llmStatus: document.getElementById("llmStatus"),
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

const setLlmStatus = (message, tone = "muted") => {
  elements.llmStatus.textContent = message;
  elements.llmStatus.dataset.tone = tone;
};

const parseStructuredEntry = (payload, rawText) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const type = payload.type;
  if (!type || !["note", "event", "reminder"].includes(type)) {
    return null;
  }

  const base = {
    text: payload.text && typeof payload.text === "string" ? payload.text : rawText,
    tags: Array.isArray(payload.tags) && payload.tags.length > 0 ? payload.tags : extractTags(rawText),
  };

  if (type === "event") {
    return {
      type,
      ...base,
      datetime: typeof payload.datetime === "string" ? payload.datetime : null,
    };
  }

  if (type === "reminder") {
    return {
      type,
      ...base,
      reminderKind: payload.reminderKind === "context" ? "context" : "time",
      trigger: typeof payload.trigger === "string" ? payload.trigger : null,
    };
  }

  return { type, ...base };
};

const routeEntry = ({ type, text, tags, datetime, reminderKind, trigger }) => {
  const createdAt = new Date().toISOString();

  if (type === "event") {
    const dateInfo = datetime ? { iso: datetime, label: "" } : parseDateTime(text);
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
    return;
  }

  if (type === "reminder") {
    const reminder = {
      id: createId(),
      text,
      createdAt,
      tags,
      kind: reminderKind ?? "time",
      trigger: trigger ?? null,
    };
    state.data = addEntry(state.data, "reminders", reminder);
    return;
  }

  const note = {
    id: createId(),
    text,
    createdAt,
    tags,
  };
  state.data = addEntry(state.data, "notes", note);
  attachNoteToEvent(note);
};

const handleSubmit = async () => {
  const rawText = elements.mainInput.value.trim();
  if (!rawText) {
    return;
  }

  elements.sendButton.disabled = true;
  setLlmStatus("Routing…", "muted");

  const apiKey = state.settings.apiKey.trim();
  if (apiKey) {
    try {
      const payload = await requestStructuredEntry({ apiKey, text: rawText });
      const parsed = parseStructuredEntry(payload, rawText);
      if (parsed) {
        routeEntry(parsed);
        setLlmStatus("Routed by LLM", "success");
      } else {
        setLlmStatus("LLM response invalid, using local rules", "warning");
        routeEntry(localRoute(rawText));
      }
    } catch (error) {
      console.error(error);
      setLlmStatus("LLM failed, using local rules", "warning");
      routeEntry(localRoute(rawText));
    }
  } else {
    setLlmStatus("Local rules (add API key for LLM)", "muted");
    routeEntry(localRoute(rawText));
  }

  elements.mainInput.value = "";
  render();
};

const localRoute = (text) => {
  const type = inferType(text);
  const tags = extractTags(text);

  if (type === "event") {
    const dateInfo = parseDateTime(text);
    return {
      type,
      text,
      tags,
      datetime: dateInfo?.iso ?? null,
    };
  }

  if (type === "reminder") {
    return {
      type,
      text,
      tags,
      reminderKind: extractReminderContext(text) ? "context" : "time",
      trigger: extractReminderContext(text),
    };
  }

  return { type, text, tags };
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
  elements.saveKeyButton.addEventListener("click", () => {
    state.settings.apiKey = elements.apiKeyInput.value.trim();
    saveSettings(state.settings);
    setLlmStatus(state.settings.apiKey ? "API key saved" : "API key cleared", "success");
  });
};

const hydrateSettings = () => {
  elements.apiKeyInput.value = state.settings.apiKey;
  if (state.settings.apiKey) {
    setLlmStatus("LLM routing enabled", "success");
  } else {
    setLlmStatus("Local rules (add API key for LLM)", "muted");
  }
};

bindEvents();
bindSpeechInput();
hydrateSettings();
render();
