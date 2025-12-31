const SETTINGS_KEY = "second-brain-settings";

export const loadSettings = () => {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { apiKey: "" };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      apiKey: parsed.apiKey ?? "",
    };
  } catch (error) {
    console.warn("Failed to parse settings", error);
    return { apiKey: "" };
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
