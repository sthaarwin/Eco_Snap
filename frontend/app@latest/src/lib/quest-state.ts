// Simple in-memory quest state shared across all screens.
// Since all tabs run in the same JS runtime, this works instantly.

let activeQuestId: string | null = null;

export function getActiveQuestId(): string | null {
  return activeQuestId;
}

export function setActiveQuestId(id: string | null): void {
  activeQuestId = id;
}

export function hasActiveQuest(): boolean {
  return activeQuestId !== null;
}

export function clearActiveQuest(): void {
  activeQuestId = null;
}
