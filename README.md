# WhatsApp Chat Analyzer

A privacy-first, state-of-the-art conversational analytics engine for **Android** and **iOS** WhatsApp chat exports (1-on-1 or group chats). Runs with **100% feature and rule parity** both directly in your web browser (Web Worker + optional in-browser **Transformers.js WebGPU/WASM** neural disambiguation) and locally via Python CLI (`stock_predictor_env` with PyTorch CUDA GPU acceleration).

Live Web App: **[https://whatsapp-chat-analyzer-7509c.web.app](https://whatsapp-chat-analyzer-7509c.web.app)**

---

## Core Capabilities

- **100% Client-Side & Zero Disk Storage**: In browser mode, chat `.txt` files never leave your RAM. Even in local server mode (`run.py`), uploads on `POST /api/upload` are parsed strictly in memory with zero disk writes.
- **Farewell-Cluster Session Rule (`Bye / Byee / Byeee…`)**: Splits conversations after genuine `Bye` / `Byee+` farewells (using a 5-minute reciprocal sign-off window so mutual goodbyes don't count as new conversations, plus a narrative mid-sentence guard) alongside Hawkes-inspired active engagement hours.
- **Generalized Dynamic Name Protection & Expressive Word Normalization**:
  - Participant name tokens are automatically extracted from whatever `.txt` export is loaded (zero hardcoded names) and preserved across elongated variations (`<name>nnnn`).
  - Expressive elongations (`abbooo`, `abbboooo`, `onlyy`, `misssss`, `callll`) are collapsed phonotactically back to their core root while excluding conversational filler words.
- **SOTA Parsing & Statistical Accuracy**:
  - Local calendar date keys (eliminating midnight–5:30 AM UTC day-shift bugs), exact streak start/end tracking, UAX #29 grapheme-cluster emojis (`Intl.Segmenter` / `regex`), URL-stripped question detection, and strict WhatsApp media/edited markers.
- **5-Way Discourse Breakdown & Flirt Championship**:
  - Classifies conversation makeup across **% Flirting**, **% Teasing & Making Fun**, **% Arguments & Disagreements**, **% Exchange of Facts / Info**, and **% Normal Talks**.
  - Ranks **Who Flirts the Most** vs. **Who Flirts the Best** using a 4-axis Rizz Score (Partner "Butterflies" Reaction, Lexical Creativity, Smooth Segue, and Personalization Depth).
- **Apologies & Peacekeeping ("Sorry" Tracker)**:
  - Tracks total personal apologies (`sorry`, `sory`, `sry`, `sorryyy`, `my bad`), **Who Says "Sorry" First** (30-minute episode clustering), post-argument peacekeeper lead, and median make-up speed.
- **Intimacy, Pet Names & Sensory Escalation Timeline**:
  - Detects multi-word and regional nicknames (`kutti ponnu`, `cutee`, `lussuuu`, etc.) plus dynamic vocative mining, sensory/physical affection motifs (`hugs`, `lift`, `carry`, `looking into eyes`, `voice`), and 5-tier intimacy escalations with rolling Z-score heat spikes.
- **Intent Classifiers**:
  - **Picture Requests**: Direct asks (`send pic`, `fit check`) + `"want to see you"` visual desire + next-turn `<Media omitted>` confirmation, while rejecting notes/screenshots and separating in-person meetups.
  - **Longing & Meet Desire**: Unprompted vs. reciprocal `"Missing You"` + desire to meet in person (excluding work/class meetings).
- **Monumental Longest Messages**: Displays the #1 longest message overall and every party's personal longest message with exact date, time, word/char counts, and full verbatim text.
- **Unique Fun & Interactive Features**:
  - **✨ Chat Wrapped** animated story reel
  - **🧬 Linguistic & Emoji Contagion** (*Who infected whom?*) & **Language Style Matching (LSM %)**
  - **😂 Laugh-O-Meter**, **Chaser vs. Chased Index**, **2 AM Persona Shift**, **Superlative Trophy Cabinet**, and **🎮 "Guess Who Said It?" Quiz**
- **Mandatory Always-Blurred Secure HTML Export**:
  - Every exported standalone `.html` report **always blurs sensitive content** — choose between **Passphrase-Locked AES-256-GCM Encryption (PBKDF2 310k iterations)** or **Permanently Masked Redaction**.

---

## Running Locally (`stock_predictor_env`)

```bash
# CLI Analysis + JSON/CSV/PNG exports
conda activate stock_predictor_env
cd Code
python analyze_chat.py "../WhatsApp Chat with Partner.txt"

# Launch local dashboard server (127.0.0.1, in-memory upload processing)
python run.py

# Run automated test suite
pytest tests/test_analyzer.py -v
```
