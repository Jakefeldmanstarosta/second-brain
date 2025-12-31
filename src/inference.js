const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const ACTION_VERBS = [
  "call",
  "email",
  "send",
  "book",
  "buy",
  "pay",
  "schedule",
  "submit",
  "follow up",
  "cancel",
  "review",
  "sign",
];

const normalize = (text) => text.trim().toLowerCase();

const parseExplicitDate = (text) => {
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    const parsed = new Date(`${isoMatch[1]}T09:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const month = Number.parseInt(slashMatch[1], 10) - 1;
    const day = Number.parseInt(slashMatch[2], 10);
    const year = slashMatch[3]
      ? Number.parseInt(slashMatch[3], 10)
      : new Date().getFullYear();
    const parsed = new Date(year, month, day, 9, 0, 0);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

export const parseDateTime = (rawText) => {
  const text = normalize(rawText);
  const now = new Date();
  let date = null;

  if (text.includes("today")) {
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  } else if (text.includes("tomorrow")) {
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
  } else {
    const nextMatch = text.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    const dayMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    const targetDay = nextMatch?.[1] ?? dayMatch?.[1];
    if (targetDay) {
      const targetIndex = WEEKDAYS.indexOf(targetDay);
      const currentIndex = now.getDay();
      let delta = (targetIndex - currentIndex + 7) % 7;
      if (nextMatch) {
        delta = delta === 0 ? 7 : delta;
      }
      date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta, 9, 0, 0);
    }
  }

  if (!date) {
    date = parseExplicitDate(text);
  }

  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)?\b/);
  if (date && timeMatch) {
    let hours = Number.parseInt(timeMatch[1], 10);
    const minutes = Number.parseInt(timeMatch[2] ?? "0", 10);
    const meridiem = timeMatch[3];
    if (meridiem === "pm" && hours < 12) {
      hours += 12;
    }
    if (meridiem === "am" && hours === 12) {
      hours = 0;
    }
    date.setHours(hours, minutes, 0, 0);
  }

  if (!date) {
    return null;
  }

  const label = date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    date,
    label,
    iso: date.toISOString(),
  };
};

const isReminder = (text) => {
  if (/\b(remind me|remember to|don’t let me forget|do not let me forget)\b/i.test(text)) {
    return true;
  }

  const normalized = normalize(text);
  return ACTION_VERBS.some((verb) => normalized.startsWith(verb));
};

const isCalendarEvent = (text) => parseDateTime(text) !== null;

export const inferType = (text) => {
  if (isReminder(text)) {
    return "reminder";
  }
  if (isCalendarEvent(text)) {
    return "event";
  }
  return "note";
};

export const extractReminderContext = (text) => {
  const match = text.match(/\bwhen\s+([^,.]+)/i);
  if (match) {
    return match[1].trim();
  }
  const locationMatch = text.match(/\bwhen I'?m\s+([^,.]+)/i);
  if (locationMatch) {
    return locationMatch[1].trim();
  }
  return null;
};
