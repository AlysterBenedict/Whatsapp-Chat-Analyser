#!/usr/bin/env python3
"""
One command: analyse the chat (if needed), serve the dashboard locally on 127.0.0.1.

    python run.py            # analyse only when results are missing or out of date
    python run.py --refresh  # force a fresh analysis

Security guarantees:
    - Binds strictly to 127.0.0.1
    - Uploaded chats on POST /api/upload are parsed strictly in RAM (zero disk writes)
    - Enforces 25 MB upload limit, strict path allowlist, and localhost Origin guard
"""

import json
import re
import subprocess
import sys
import threading
import urllib.parse
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARENT = ROOT.parent
OUT = PARENT / "chat_analysis_output"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB limit

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Only these paths are ever served - chat .txt exports are never exposed.
ALLOW = re.compile(
    r"^/(|index\.html|style\.css|app\.js|analyzer\.worker\.js|whatsapp icon\.png|whatsapp%20icon\.png|"
    r"api/refresh|api/upload|chat_analysis_output/[\w.\-]+\.(json|csv|png))$"
)
LOCAL_ORIGIN_RE = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", re.IGNORECASE)


def chat_file():
    search_dirs = [ROOT, ROOT.parent]
    c = []
    for d in search_dirs:
        c.extend(d.glob("*.txt"))
    c = [p for p in c if "readme" not in p.name.lower() and "requirements" not in p.name.lower()]
    c = sorted(c, key=lambda p: (p.stat().st_mtime, p.stat().st_size), reverse=True)
    pref = [p for p in c if "whatsapp" in p.name.lower() or p.name.lower().startswith("_chat") or "chat" in p.name.lower()]
    return (pref or c or [None])[0]


def analyse(target_file=None):
    f = target_file or chat_file()
    if not f:
        print("No chat .txt found in", ROOT, "or", PARENT)
        return False
    OUT.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(
        [sys.executable, str(ROOT / "analyze_chat.py"), str(f), "--out", str(OUT), "--no-charts"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if r.returncode:
        print(r.stderr[-800:])
    return r.returncode == 0


def stale():
    s, f = OUT / "summary.json", chat_file()
    if not s.exists():
        return True
    t = s.stat().st_mtime
    return (
        bool(f and f.stat().st_mtime > t)
        or (ROOT / "analyze_chat.py").stat().st_mtime > t
        or ((ROOT / "nlp_engine.py").exists() and (ROOT / "nlp_engine.py").stat().st_mtime > t)
    )


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def log_message(self, *a):
        pass

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _check_local_origin(self):
        origin = self.headers.get("Origin")
        if origin and not LOCAL_ORIGIN_RE.match(origin):
            return False
        return True

    def do_GET(self):
        path = urllib.parse.unquote(self.path.split("?")[0])
        if not ALLOW.match(path) and not ALLOW.match(self.path.split("?")[0]):
            return self.send_error(404)

        if path == "/api/refresh":
            ok = analyse()
            self.send_json(200 if ok else 500, {"ok": ok})
            return

        if path == "/whatsapp icon.png":
            target = ROOT / "whatsapp icon.png"
            if not target.is_file():
                return self.send_error(404)
            try:
                content = target.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except OSError:
                return self.send_error(500)

        if path.startswith("/chat_analysis_output/"):
            rel_name = path[len("/chat_analysis_output/") :]
            target = OUT / rel_name
            if not target.is_file():
                return self.send_error(404)
            ctype = self.guess_type(str(target))
            try:
                content = target.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except OSError:
                return self.send_error(500)
        super().do_GET()

    def do_POST(self):
        path = urllib.parse.unquote(self.path.split("?")[0])
        if path != "/api/upload":
            return self.send_error(404)

        if not self._check_local_origin():
            return self.send_json(403, {"ok": False, "error": "Forbidden origin"})

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0 or content_length > MAX_UPLOAD_BYTES:
                return self.send_json(413, {"ok": False, "error": "File empty or exceeds 25 MB limit"})

            content_type = self.headers.get("Content-Type", "")
            body = self.rfile.read(content_length)

            filename = "uploaded_chat.txt"
            file_bytes = b""
            if "multipart/form-data" in content_type and b"\r\n" in body:
                boundary = content_type.split("boundary=")[-1].strip().strip('"').encode()
                parts = body.split(b"--" + boundary)
                for part in parts:
                    if b'filename="' in part:
                        header_part, content = part.split(b"\r\n\r\n", 1)
                        content = content.rstrip(b"\r\n--")
                        m = re.search(rb'filename="([^"]+)"', header_part)
                        if m:
                            filename = m.group(1).decode("utf-8", errors="replace")
                        file_bytes = content
                        break
            else:
                file_bytes = body

            if not file_bytes:
                return self.send_json(400, {"ok": False, "error": "No file received"})

            # Analyze strictly in RAM without persisting uploaded personal chat text to disk
            raw_text = file_bytes.decode("utf-8", errors="replace")
            import analyze_chat

            summary_data, _, daily_csv = analyze_chat.analyze_text(
                raw_text,
                use_neural=True,
                cache_dir=ROOT / ".cache",
            )
            clean_name = re.sub(r'[\\/*?:"<>|]', "", filename) or "uploaded_chat.txt"
            return self.send_json(
                200,
                {
                    "ok": True,
                    "filename": clean_name,
                    "summary": summary_data,
                    "daily": daily_csv,
                },
            )
        except Exception as ex:
            return self.send_json(500, {"ok": False, "error": str(ex)})


def main():
    if "--refresh" in sys.argv or stale():
        print("Analysing your chat (a large export can take a few seconds)...")
        if not analyse():
            sys.exit("Analysis failed. Run analyze_chat.py directly to see the error.")
    for port in range(8000, 8020):
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            break
        except OSError:
            continue
    else:
        sys.exit("No free port between 8000 and 8019.")
    url = f"http://localhost:{port}/"
    print(f"Dashboard running at {url}   (press Ctrl+C to stop)")
    threading.Timer(0.6, webbrowser.open, args=(url,)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
