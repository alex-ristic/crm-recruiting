export const today = () => new Date().toISOString().slice(0, 10);

export function completionTimestamp() {
  return new Date().toISOString();
}

