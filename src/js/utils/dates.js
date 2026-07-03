export const today = () => toDateInputValue(new Date());

export function completionTimestamp() {
  return new Date().toISOString();
}

export function addDays(value, days) {
  const date = parseDateInput(value) || new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function compactDateLabel(value) {
  const date = parseDateInput(value);
  if (!date) return "No date";
  const diff = dayDiff(date, parseDateInput(today()));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function taskDateGroup(value) {
  const date = parseDateInput(value);
  if (!date) return { label: "After month", order: 5 };
  const diff = dayDiff(date, parseDateInput(today()));
  if (diff === 0) return { label: "Today", order: 0 };
  if (diff < 0) return { label: "Overdue", order: 1 };
  if (diff === 1) return { label: "Tomorrow", order: 2 };
  if (diff <= 7) return { label: "Next 7 days", order: 3 };
  if (diff <= 31) return { label: "Next month", order: 4 };
  return { label: "After month", order: 5 };
}

export function isFutureDate(value) {
  const date = parseDateInput(value);
  if (!date) return false;
  return dayDiff(date, parseDateInput(today())) > 0;
}

function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayDiff(date, base) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const anchor = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.round((current - anchor) / 86400000);
}

function pad(value) {
  return String(value).padStart(2, "0");
}
