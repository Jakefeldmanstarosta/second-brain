const STORAGE_KEY = "second-brain-data";

const emptyState = () => ({
  notes: [],
  events: [],
  reminders: [],
});

export const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyState();
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      notes: parsed.notes ?? [],
      events: parsed.events ?? [],
      reminders: parsed.reminders ?? [],
    };
  } catch (error) {
    console.warn("Failed to parse saved state", error);
    return emptyState();
  }
};

export const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const createId = () => crypto.randomUUID();

export const addEntry = (state, type, entry) => {
  const nextState = {
    ...state,
    [type]: [entry, ...state[type]],
  };
  saveState(nextState);
  return nextState;
};

export const updateEntry = (state, type, entryId, updater) => {
  const updatedList = state[type].map((entry) =>
    entry.id === entryId ? updater(entry) : entry
  );
  const nextState = {
    ...state,
    [type]: updatedList,
  };
  saveState(nextState);
  return nextState;
};
