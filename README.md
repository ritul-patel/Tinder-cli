# tinder-cli

AI-powered Tinder automation CLI. Controls your real Chrome browser, reads profiles with computer vision, and auto-swipes based on attractiveness scoring — all free, no paid subscriptions needed.

---

## How It Works

```
Your Terminal
     |
     v
tinder-agent CLI
     |                          |
     v                          v
Chrome (port 9222)         Groq AI (free)
Real browser you           Vision model scores
control via CDP            profile photos 0-10
     |                          |
     +---------- swipe ----------+
```

1. Launch Chrome with remote debugging enabled
2. Log into Tinder in that Chrome window
3. Run `tinder-agent auto-swipe`
4. Tool takes screenshots of each profile, sends to Groq AI
5. AI scores photos 0-10 based on face visibility, attractiveness, body type
6. Swipes right if score is at or above threshold, left if below

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v18+ | https://nodejs.org (LTS) |
| Git | any | https://git-scm.com |
| Google Chrome | any | https://google.com/chrome |
| Groq API key | free | https://console.groq.com |

---

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/tinder-cli.git
cd tinder-cli
npm install
npm run build
npm link
```

### Configure API Key

Create a `.env` file in the project root:

```
GROQ_API_KEY=gsk_your_key_here
```

Get a free key at https://console.groq.com — click API Keys, then Create API Key.

---

## Usage

### Step 1 — Launch Chrome in debug mode

**Windows (use cmd, not PowerShell):**
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\tmp\chrome-debug"
```

**Mac:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

> **Windows:** VS Code also uses port 9222. Close it before running Chrome in debug mode.

### Step 2 — Log into Tinder

In that Chrome window:
1. Go to `https://tinder.com`
2. Log in with your account
3. Navigate to `https://tinder.com/app/recs`
4. Make sure profile cards are visible

### Step 3 — Run

```bash
tinder-agent analyze          # score current profile, no swipe
tinder-agent swipe-right      # manual right swipe
tinder-agent swipe-left       # manual left swipe
tinder-agent auto-swipe       # AI auto-swipe 20 profiles
tinder-agent auto-swipe --limit 30 --min-score 6
```

---

## Commands

| Command | Description |
|---------|-------------|
| `tinder-agent analyze` | Score current profile without swiping |
| `tinder-agent swipe-right` | Manual right swipe (LIKE) |
| `tinder-agent swipe-left` | Manual left swipe (NOPE) |
| `tinder-agent auto-swipe` | AI-powered batch swiping |
| `tinder-agent --help` | Show all commands |

### auto-swipe options

| Flag | Default | Description |
|------|---------|-------------|
| `--limit <n>` | 20 | Max profiles per session |
| `--min-score <n>` | 7 | Minimum AI score to swipe right (0-10) |

---

## Scoring System

| Score | Meaning | Action |
|-------|---------|--------|
| 0 | No face visible OR overweight body | Left swipe |
| 1-4 | Unattractive | Left swipe |
| 5-6 | Average | Left swipe (default threshold) |
| 7-8 | Attractive | Right swipe |
| 9-10 | Very attractive | Right swipe |

**Age filter:** Profiles outside age 18-21 are automatically left-swiped.

---

## Anti-Ban System

All protections run automatically. No configuration needed.

| Protection | Detail |
|------------|--------|
| Random delays | 8-20 seconds between profiles, 1-4 seconds before swiping |
| Session breaks | 5-15 minute pause automatically every 20 swipes |
| Daily swipe limit | Max 100 swipes per day, tracked in `.swipe-history.json` |
| Human hours only | Will not run outside 9am-11pm |
| Score jitter | Random +/- 0.5 variation for natural right-swipe ratio |
| Out-of-likes detection | Stops automatically when Tinder paywall appears |
| Real browser | Uses your actual Chrome with real session, not headless |

---

## Dos and Don'ts

### DO
- Run only between 9am and 11pm
- Keep sessions under 50 swipes at a time
- Use an account that is at least 2-3 weeks old
- Stay on the same Wi-Fi and IP address per session
- Let the built-in delays run — do not interrupt mid-session
- Run 1-2 sessions per day maximum

### DON'T
- Do not set `--min-score 0` — 100% right swipe ratio gets accounts banned instantly
- Do not run more than 100 swipes per day
- Do not use a VPN that rotates IP addresses
- Do not run multiple instances at the same time
- Do not use a freshly created account (wait at least 2 weeks)
- Do not run overnight or 24/7
- Do not manually spam swipes immediately after running auto-swipe

---

## Project Structure

```
tinder-cli/
├── src/
│   ├── index.ts          — CLI entry point, all commands
│   ├── agentBrowser.ts   — Chrome CDP browser control
│   ├── analyze.ts        — Groq AI vision scoring
│   └── human.ts          — Anti-ban human behavior module
├── .env                  — Your API keys (never commit this)
├── .env.example          — Template showing required variables
├── .gitignore            — Excludes .env, dist, node_modules
├── package.json
├── tsconfig.json
├── GUIDE.md              — Detailed step-by-step setup guide
└── README.md             — This file
```

---

## Troubleshooting

**`tinder-agent: command not found`**
```bash
cd tinder-cli
npm link
```

**`Chrome not running on port 9222`**
Close all Chrome windows. Relaunch using the exact debug command above.

**`Tinder tab not found`**
In the debug Chrome window, navigate to `tinder.com/app/recs` before running any command.

**`GROQ_API_KEY not set`**
Check that `.env` exists in the project root folder and contains `GROQ_API_KEY=gsk_...`

**Port 9222 conflict**
Close VS Code — it uses port 9222. Relaunch Chrome after closing VS Code.

**Tool hangs on Analyzing**
Groq free tier may be rate-limited. Wait 1 minute and try again.

**Out of likes message**
Tinder free tier limits daily likes. Wait until tomorrow or upgrade to Tinder Gold.

---

## Recommended Daily Routine

```
Morning:   tinder-agent auto-swipe --limit 30
Evening:   tinder-agent auto-swipe --limit 30
Night:     Do not run
```

~60 swipes per day. Safe, natural, sustainable.

---

## License

ISC
