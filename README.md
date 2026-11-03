# WhatsApp Chat Analyzer 💬📊

A fast, privacy-first, zero-dependency analytics dashboard and visualization engine for WhatsApp conversations. Works seamlessly with both **Android** and **iOS** chat exports, dynamically detecting participants, calculating conversation rhythms, reply latency, streak records, word frequencies, and emoji habits.

Deployed live on Firebase: **[https://whatsapp-chat-analyzer-7509c.web.app](https://whatsapp-chat-analyzer-7509c.web.app)**

---

## 🌟 Key Features

- **🔒 100% Client-Side & Privacy-First**: Your chats never leave your computer. All parsing, text processing, and analytics happen directly inside your web browser memory.
- **👥 Dynamic Participant Detection**: Automatically identifies any participants from the uploaded export file—works for both 1-on-1 conversations and group chats without hardcoded names.
- **⚡ Instant Drag-and-Drop & Clipboard Paste**:
  - Drag and drop any WhatsApp `.txt` export directly onto the browser window.
  - Or simply copy the chat file/text and press `Ctrl + V` anywhere on the page.
- **📱 Universal WhatsApp Format Support**:
  - **Android format**: `12/03/24, 9:45 pm - Name: Message`
  - **iOS format**: `[12/03/24, 09:45:12 PM] Name: Message`
  - Handles 12-hour (AM/PM) and 24-hour clocks, multi-line messages, attachments, media omission flags, and invisible Unicode direction marks (LRM/RLM).
- **📈 Comprehensive Metrics & Deep Insights**:
  - **Overall KPIs**: Total messages, words exchanged, messages per day, active chatting days, longest streak, peak chat hour.
  - **Activity & Rhythm**:
    - *Hour-by-hour distribution* (stacked bars showing day/night patterns).
    - *Weekly heatmaps* (day of week vs. hour of day).
    - *Daily message timeline* with 7-day rolling trendlines.
    - *Monthly activity breakdowns*.
  - **Replies & Conversation Flow**:
    - Median reply latency after pauses.
    - Conversation starter frequency (who breaks the silence).
    - Reply time distribution buckets (`<1 min`, `1–5 min`, `5–15 min`, `15–60 min`, `>1 hour`).
  - **Vocabulary & Emoji Habits**:
    - Top 12 most frequently used words per participant.
    - Top 10 most popular emojis with frequency counts.
    - Average words and characters per message.
- **🎨 WhatsApp Design Language**:
  - Solid ribbon navbar featuring the official WhatsApp brand aesthetic.
  - Interactive Light & Dark theme toggle with persistent preference.
  - Sleek, modern typography with responsive card layouts.
- **💾 Standalone Single-File HTML Export**:
  - Click **"Export HTML"** to download a self-contained `.html` file that bundles all CSS, JavaScript, and parsed chat data. Share or archive offline reports without needing a server.

---

## 🛠️ Methodology & Technical Architecture

The WhatsApp Chat Analyzer is engineered with **zero external runtime dependencies** (no bulky frontend frameworks, no heavy chart libraries). It loads instantly and executes with maximum performance.

```
WhatsApp Chat Export (.txt)
         │
         ▼
┌────────────────────────────────────────────────────────┐
│               Regex Cleansing & Tokenizer              │
│  - Strip invisible marks (LRM \u200e, RLM \u200f, BOM) │
│  - Match date, time, 12h/24h period, and sender headers│
│  - Assemble multi-line continuations                   │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│              Analytics & Metrics Engine                │
│  - Session gap thresholding (burst detection)          │
│  - Turn-taking & response latency tracking             │
│  - Word tokenization & stop-word filtering             │
│  - Emoji extraction with skin-tone normalization       │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│           Zero-Dependency Visual Presentation          │
│  - Responsive SVGs with dynamic viewBox math           │
│  - Modular CSS3 custom properties (Light/Dark themes)  │
│  - Single-file standalone HTML bundler                 │
└────────────────────────────────────────────────────────┘
```

### 1. Robust WhatsApp Parsing Pipeline (`parseClientWhatsApp`)
- **Sanitization**: Strips invisible direction marks (`\u200e`, `\u200f`, `\u202a`–`\u202e`, `\ufeff`) and normalizes unusual whitespace characters inserted by mobile platforms.
- **Header Matching**: A comprehensive regular expression captures date components, 12/24-hour timestamps, and sender delimiters (`- Sender:` or `] Sender:`).
- **Message Stitching**: Lines without headers are seamlessly concatenated to the preceding message body, preserving multi-line paragraphs and formatted text.
- **System Event Handling**: Automatically filters out WhatsApp system notices (encryption announcements, group creation, security codes).

### 2. Analytical Statistics Computation
- **Reply Latency**: Measures response delay between alternating senders. Replies following an inactive period (>6 hours) are flagged as conversation starters rather than slow replies, preventing statistical skew in turnaround times.
- **Rolling Averages**: Calculates 7-day rolling moving averages to reveal underlying chatting velocity smoothed across weekday variances.
- **Text & Emoji Tokenization**: Words are normalized and filtered against common conversational stop-words. Unicode surrogate pairs and emoji sequences are parsed and matched accurately.

### 3. Lightweight SVG Graphics Engine
Instead of bundling multi-megabyte JavaScript charting libraries, all charts (timelines, bar charts, heatmaps) are dynamically generated as clean, responsive **inline SVGs**:
- Resolution-independent and retina-sharp.
- Styled directly using CSS variables for theme switching.
- Near-instantaneous rendering even on massive multi-year chat histories.

### 4. Dual Deployment & Execution Models
- **Browser-Only Mode**: Powered by `index.html`, `style.css`, and `app.js`. Runs directly in any web browser, completely offline or hosted on any static cloud provider (Firebase Hosting, GitHub Pages, Vercel, Netlify).
- **Python CLI Pipeline**: Includes `analyze_chat.py` and `run.py` for command-line power users who wish to parse files locally, generate CSV exports (`per_sender.csv`, `hourly.csv`, `daily.csv`, `summary.json`), or run a local lightweight Python web server.

---

## 📁 Repository Structure

```
.
├── index.html          # Main HTML structure with WhatsApp ribbon navigation
├── style.css           # WhatsApp design system with dark/light themes & SVG styles
├── app.js              # Client-side chat parser, analytics engine, & SVG visualizer
├── analyze_chat.py     # Python CLI parser and CSV/JSON reporting utility
├── run.py              # Local lightweight development server
├── whatsapp icon.png   # Official WhatsApp brand asset
└── README.md           # Documentation and methodology
```

---

## 🚀 Getting Started

### Option 1: Live Web App (No Installation Needed)
Visit the live hosted app: **[https://whatsapp-chat-analyzer-7509c.web.app](https://whatsapp-chat-analyzer-7509c.web.app)**
1. Drag and drop your WhatsApp `.txt` file onto the page.
2. View your conversation insights immediately.

### Option 2: Local Static Execution
1. Clone or download this repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
3. Upload or paste your exported WhatsApp `.txt` chat.

### Option 3: Local Python Server
If you prefer running a local server:
```bash
# Clone the repository
git clone https://github.com/AlysterBenedict/Whatsapp-Chat-Analyser.git
cd Whatsapp-Chat-Analyser

# Start the local server
python run.py
```
This will automatically launch the local dashboard at `http://localhost:8000`.

---

## 📲 How to Export Your WhatsApp Chat

1. Open WhatsApp on your phone and open the chat you want to analyze.
2. Tap the chat name or menu (`⋮` on Android, tap name on iOS).
3. Select **Export Chat** (or **More > Export Chat**).
4. Choose **Without Media** to export a clean `.txt` file.
5. Save or transfer the `.txt` file to your computer.

---

## 🔒 Privacy & Security

- **Zero Cloud Storage**: Chat messages and participant names are **never** transmitted to any server or remote database.
- **Client-Side Execution**: All processing executes within your browser's local sandbox memory.
- **Safe for Sharing**: The **Export HTML** feature generates an offline report containing only aggregated statistics and top words—your raw message logs remain private.

---

## 📄 License

MIT License. Free for personal and educational use.
