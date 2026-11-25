# WhatsApp Chat Analyzer

A privacy-first conversational analytics engine for **Android** and **iOS** WhatsApp chat exports (1-on-1 or group chats). Runs with **100% feature and rule parity** both directly in your web browser (Web Worker + optional in-browser **Transformers.js WASM** neural disambiguation) and locally via Python CLI (`stock_predictor_env` with optional PyTorch CUDA/CPU neural verification).

Live Web App: [https://whatsapp-chat-analyzer-7509c.web.app](https://whatsapp-chat-analyzer-7509c.web.app)

---

## Privacy & Security

- **100% Client-Side Browser Mode**: Drag, drop, or upload a `.txt` chat export and all parsing, NLP scoring, and optional Transformers.js (`Xenova/all-MiniLM-L6-v2`, `q8` WASM) disambiguation happen strictly in browser RAM. No messages are transmitted to or stored on any server.
- **In-Memory Local Server (`run.py`)**: Binds strictly to `127.0.0.1` (ports `8000`–`8019`), enforces a 25 MB upload limit, strict path allowlist, and `localhost` Origin guard. Uploaded chats on `POST /api/upload` are parsed strictly in RAM with zero disk writes.
- **In-Session Blur Toggle**: Use the **Blur On** toggle in the navbar to blur or reveal sensitive quotes during live viewing.
- **Mandatory Always-Blurred Secure HTML Export**: Every exported standalone `.html` report always blurs sensitive content. Choose between:
  - **Passphrase-Encrypted Blurred Export (AES-256-GCM, PBKDF2 310,000 iterations)**: Zero sensitive plaintext exists in the exported file; quotes unlock only in browser memory with your passphrase.
  - **Permanently Masked Blurred Export**: Irreversibly redacts all sensitive quotes before exporting.
  - Optional checkbox to also protect longest messages, pet names, and intimacy quotes.

---

## Core Engine & Features

### Parsing & Session Modeling
- **Android & iOS Support**: Auto-detects `DD/MM` vs. `MM/DD` date order (with `--date-order` CLI override), uses local calendar date keys to avoid UTC day-shift bugs, tracks exact streak start/end dates, extracts UAX #29 grapheme-cluster emojis (`Intl.Segmenter` / `regex`), strips URLs before question detection, and handles WhatsApp media/edited markers.
- **Farewell-Cluster Session Rule (`Bye / Byee / Byeee...`)**: Splits conversations after genuine `Bye` / `Byee+` farewells using a 5-minute reciprocal sign-off window and a narrative mid-sentence guard, alongside Hawkes-inspired active engagement hours.
- **Dynamic Name Protection & Expressive Word Normalization**: Automatically extracts participant name tokens from whatever `.txt` export is loaded (zero hardcoded names), preserves elongated name variations, and collapses expressive elongations (`abbooo`, `onlyy`, `misssss`, `callll`) back to their core root while filtering conversational and screenshot filler words.

### Dashboard Sections
- **Overview**: Hero KPIs (total messages, words, active days, conversations, active chat hours, longest daily streak), participant message split bar, dynamic story highlights, and side-by-side participant comparison.
- **Vibes, Flirting & Intentions**:
  - **5-Way Conversation Breakdown**: Classifies conversation makeup across Flirting, Teasing & Making Fun, Arguments & Disagreements, Exchange of Facts / Info, and Normal Talk.
  - **Flirt Championship (Most vs. Best)**: Ranks volume vs. a 4-axis Rizz Score (Partner Reaction, Lexical Creativity, Smooth Segue, and Personalization Depth).
  - **Asking for a Picture**: Detects direct picture asks (`send pic`, `fit check`, etc.) and `"want to see you"` visual desire with next-turn `<Media omitted>` confirmation, while excluding notes and screenshots.
  - **Missing You & Desire to Meet**: Separates unprompted vs. reciprocal `"Miss You"` and desire to meet in person (excluding work/class meetings).
- **Apologies & Peacekeeping**: Tracks personal apologies (`sorry`, `sory`, `sry`, `sorryyy`, `my bad`), **Who Says "Sorry" First** (30-minute episode clustering), post-argument peacekeeper lead, median make-up speed, and monthly apology frequency.
- **Intimacy, Pet Names & Sensory Motifs**: Detects multi-word and regional nicknames plus strict vocative mining, sensory/physical affection motifs (hugs, lifting/carrying, eyes/gaze, voice admiration, cute compliments), 5-tier intimacy escalations, and a monthly intimacy trajectory chart.
- **Rhythm, Replies & Night Shift**:
  - Hour-by-hour activity, 7x24 weekly heatmap, daily timeline with 7-day rolling average, month-by-month, and day-of-week charts.
  - Reply speed distribution and metrics (typical delay after a pause, geometric mean latency, slowest 10% threshold, same-minute reply %).
  - Conversation starters, final `Bye` enders, average message burst, and longest run without a reply.
  - **2 AM Persona Shift & Chaser Index**: Compares daytime vs. 12–5 AM flirting/intimacy percentages alongside 30m+ double-texts, >6h unannounced vanishes, and dry 1-word reply percentages.
- **Words & Monumental Messages**: #1 longest message overall and per-participant longest substantive messages (with date, time, word/character counts, and expandable verbatim text), expressive-normalized top words and emojis, and records & streaks.
- **Linguistic Contagion, Trophies & Quiz**:
  - **Superlative Trophy Cabinet**: Data-backed relationship and chat awards.
  - **Linguistic & Emoji Contagion**: Identifies who used a word or emoji first and spread it to the other person.
  - **Comedy, Laugh-O-Meter & Style Sync**: Tracks Language Style Matching (LSM %), total comedy points, laughs triggered, tease reactions triggered, and laughs sent.
  - **"Guess Who Said It?" Quiz**: 10-round interactive quote quiz sampled from clean memorable lines.
- **Interactive UI Controls**:
  - **Chat Wrapped**: 6-slide animated story reel accessible from the navbar.
  - **AI Boost Toggle**: Enable or disable in-browser Transformers.js neural disambiguation.
  - **Light / Dark Theme Toggle**: Persisted in `localStorage` with system-preference detection.

---

## Running Locally

### 1. Local Web Dashboard (`run.py`)

```bash
conda activate stock_predictor_env
cd Code
python run.py
```

By default, `run.py` analyzes the latest `.txt` chat file in `Code/` or its parent folder (only when results are missing or out of date), starts the local server on `http://localhost:8000` (or the next free port up to `8019`), and opens it in your browser.

```bash
# Force a fresh analysis before starting the dashboard
python run.py --refresh
```

### 2. Python CLI Analysis (`analyze_chat.py`)

Generates `summary.json`, `daily.csv`, `hourly.csv`, `per_sender.csv`, and PNG charts in `chat_analysis_output/`.

```bash
conda activate stock_predictor_env
cd Code
python analyze_chat.py "../WhatsApp Chat with Partner.txt"
```

Available CLI flags:
- `--date-order {dmy,mdy}`: Force `DD/MM` or `MM/DD` date parsing (default: auto-detect).
- `--reply-cap-hours <float>`: Ignore reply gaps longer than this many hours (default: `6`).
- `--top <int>`: Number of top words and emojis to list (default: `15`).
- `--stopwords <comma-separated>`: Extra words to exclude from top words.
- `--out <dir>`: Output directory (default: `chat_analysis_output` next to the chat file).
- `--no-charts`: Skip generating PNG charts.
- `--no-neural`: Skip optional local neural prototype verification.
- `--reveal-sensitive`: Print sensitive longest message previews unmasked in the terminal.

### 3. Automated Tests & JS Parity Check

```bash
conda activate stock_predictor_env
cd Code
pytest tests/test_analyzer.py -v
node tests/verify_js_parity.mjs
```
