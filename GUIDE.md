# tinder-cli — Complete Usage Guide

## What This Does

AI-powered Tinder automation. Uses your real Chrome browser + Groq AI (free) to analyze profile photos and auto-swipe based on attractiveness scoring.

---

## Setup (One-Time)

### 1. Prerequisites
- Node.js v18+
- Google Chrome installed
- Groq API key (free) — get at https://console.groq.com

### 2. Install
```cmd
git clone https://github.com/shashank-100/tinder-cli.git
cd tinder-cli
npm install
npm run build
npm link
```

### 3. Configure API Key
Create a file named `.env` in the project folder:
```
GROQ_API_KEY=gsk_your-key-here
```

---

## Every Time You Use It

### Step 1 — Launch Chrome in debug mode
Open **cmd** (not PowerShell) and run:
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\tmp\chrome-debug"
```

### Step 2 — Log into Tinder
In that Chrome window:
1. Go to `https://tinder.com`
2. Log in with your account
3. Navigate to `https://tinder.com/app/recs`
4. Make sure profile cards are visible

### Step 3 — Run commands
Open a **new cmd window**, navigate to project, run commands.

> **Note:** VS Code must be closed. It uses port 9222 and conflicts with the tool.

---

## Commands

### Analyze current profile (no swipe)
```cmd
tinder-agent analyze
```
Shows name, age, bio, AI score (0–10), and swipe recommendation. Does not swipe.

### Swipe right manually
```cmd
tinder-agent swipe-right
```

### Swipe left manually
```cmd
tinder-agent swipe-left
```

### Auto-swipe (main feature)
```cmd
tinder-agent auto-swipe
```
Automatically processes 20 profiles using AI vision scoring.

#### Options
```cmd
tinder-agent auto-swipe --limit 50          # process 50 profiles
tinder-agent auto-swipe --min-score 6       # swipe right on score >= 6
tinder-agent auto-swipe --limit 30 --min-score 5
```

| Option | Default | Description |
|--------|---------|-------------|
| `--limit` | 20 | Max profiles to process this session |
| `--min-score` | 7 | Minimum score (0–10) to swipe right |

---

## Scoring System

| Score | Meaning | Action |
|-------|---------|--------|
| 0 | No face visible / overweight | Left swipe |
| 1–4 | Unattractive | Left swipe |
| 5–6 | Average | Left swipe (default threshold) |
| 7–8 | Attractive | Right swipe |
| 9–10 | Very attractive | Right swipe |

**Age filter:** Only swipes right on ages 18–21. Others auto-skipped.

---

## Human-Mode Safety Features

These are built in automatically — no configuration needed:

| Feature | Value |
|---------|-------|
| Daily swipe limit | 100/day (tracked in `.swipe-history.json`) |
| Delay between profiles | 8–20 seconds (random) |
| Delay before swiping | 1–4 seconds (random) |
| Session break | 5–15 min pause every 20 swipes |
| Active hours | 9am–11pm only (won't run at night) |
| Score jitter | ±0.5 random variation (natural ratio) |
| Out-of-likes detection | Stops automatically when Tinder paywall appears |

---

## Dos and Don'ts — Avoid Getting Banned

### DO
- Run only between 9am and 11pm
- Keep sessions under 50 swipes
- Use a real existing Tinder account (not freshly created)
- Keep the same IP / Wi-Fi connection
- Let the built-in delays run — don't interrupt mid-swipe
- Run 1–2 sessions per day, not continuously
- Keep Chrome with Tinder open and visible (don't minimize)

### DON'T
- Don't lower `--min-score` to 0 (100% right swipe = instant ban)
- Don't run more than 100 swipes/day
- Don't use a VPN that rotates IPs
- Don't close and reopen Chrome repeatedly in one session
- Don't run overnight or at unusual hours
- Don't run multiple instances at the same time
- Don't use a freshly created Tinder account (wait 2–3 weeks first)
- Don't spam swipe-right on every profile manually after running auto-swipe

---

## Troubleshooting

### `tinder-agent: command not found`
```cmd
cd tinder-cli
npm link
```

### `Chrome not running on port 9222`
Launch Chrome with the exact debug command from Step 1 above.

### `Tinder tab not found`
Make sure you navigated to `tinder.com/app/recs` in the debug Chrome window before running.

### `GROQ_API_KEY not set`
Check your `.env` file is in the `tinder-cli/` folder and contains `GROQ_API_KEY=gsk_...`

### `Out of likes` message
Tinder's free tier limits daily likes. Wait until tomorrow or upgrade Tinder Gold.

### Port 9222 conflict with VS Code
Close VS Code before running the tool.

### Tool hangs on `Analyzing...`
Groq API may be rate-limited. Wait 1 minute and retry.

---

## File Structure

```
tinder-cli/
├── src/
│   ├── index.ts          — CLI commands
│   ├── agentBrowser.ts   — Chrome browser control
│   ├── analyze.ts        — Groq AI image scoring
│   └── human.ts          — Anti-ban human behavior
├── dist/                 — Compiled JS (auto-generated)
├── .env                  — Your API key (never share this)
├── .swipe-history.json   — Daily swipe counter (auto-created)
└── GUIDE.md              — This file
```

---

## Daily Routine (Recommended)

```
Morning session:   tinder-agent auto-swipe --limit 30
Evening session:   tinder-agent auto-swipe --limit 30
Night:             Don't run
```

Total: ~60 swipes/day. Safe, sustainable, human-like.
