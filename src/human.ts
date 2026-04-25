import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), '.swipe-history.json');

export const DAILY_LIMIT = 100;
export const SESSION_BREAK_AFTER = 20;

const SESSION_BREAK_MIN_MS = 5 * 60 * 1000;
const SESSION_BREAK_MAX_MS = 15 * 60 * 1000;

interface SwipeHistory {
  date: string;
  count: number;
  lastSwipe: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadHistory(): SwipeHistory {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      if (data.date === today()) return data;
    }
  } catch {}
  return { date: today(), count: 0, lastSwipe: 0 };
}

export function saveHistory(h: SwipeHistory): void {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(h), 'utf-8');
}

export function checkDailyLimit(h: SwipeHistory): boolean {
  return h.count >= DAILY_LIMIT;
}

export function recordSwipe(h: SwipeHistory): SwipeHistory {
  return { ...h, count: h.count + 1, lastSwipe: Date.now() };
}

export function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, ms));
}

export function jitterScore(score: number): number {
  return score + (Math.random() - 0.5) * 1.0;
}

export function isHumanHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 23;
}

export async function maybeSessionBreak(swipeCount: number): Promise<void> {
  if (swipeCount > 0 && swipeCount % SESSION_BREAK_AFTER === 0) {
    const ms =
      Math.floor(Math.random() * (SESSION_BREAK_MAX_MS - SESSION_BREAK_MIN_MS + 1)) +
      SESSION_BREAK_MIN_MS;
    const mins = Math.round(ms / 60000);
    console.log(`\n☕ Taking a ${mins}-minute break to look human...\n`);
    await new Promise((r) => setTimeout(r, ms));
  }
}
