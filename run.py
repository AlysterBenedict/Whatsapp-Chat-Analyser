#!/usr/bin/env python3
"""One command: analyse the chat (if needed), serve the dashboard locally, open the browser.

    python run.py            # analyse only when the results are missing or out of date
    python run.py --refresh  # force a fresh analysis

Keep this file next to: the chat .txt (or in Code), analyze_chat.py, index.html, style.css, app.js.
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
# Chat analysis output is saved in the parent directory
OUT = PARENT / "chat_analysis_output"

# Only these paths are ever served - the chat .txt itself is never exposed.
ALLOW = re.compile(r"^/(|index\.html|style\.css|app\.js|whatsapp icon\.png|whatsapp%20icon\.png|api/refresh|api/upload|chat_analysis_output/[\w.\-]+\.(json|csv|png))$")


def chat_file():
    # Search current directory and parent directory for .txt files
    search_dirs = [ROOT, ROOT.parent]
    c = []
    for d in search_dirs:
        c.extend(d.glob("*.txt"))
    # Sort by newest modification time first, then size
    c = sorted(c, key=lambda p: (p.stat().st_mtime, p.stat().st_size), reverse=True)
    pref = [p for p in c if "whatsapp" in p.name.lower() or p.name.lower().startswith("_chat") or "chat" in p.name.lower()]
    return (pref or c or [None])[0]


def analyse(target_file=None):
    f = target_file or chat_file()
    if not f:
        print("No chat .txt found in", ROOT, "or", PARENT)
        return False
    OUT.mkdir(parents=True, exist_ok=True)
    r = subprocess.run([sys.executable, str(ROOT / "analyze_chat.py"), str(f), "--out", str(OUT), "--no-charts"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        print(r.stderr[-800:])
    return r.returncode == 0


def stale():
    s, f = OUT / "summary.json", chat_file()
    if not s.exists():
        return True
    t = s.stat().st_mtime
    return bool(f and f.stat().st_mtime > t) or (ROOT / "analyze_chat.py").stat().st_mtime > t


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass

    def send_json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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
                with open(target, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except OSError:
                return self.send_error(500)

        # Serve chat analysis output from the parent folder's chat_analysis_output directory
        if path.startswith("/chat_analysis_output/"):
            rel_name = path[len("/chat_analysis_output/"):]
            target = OUT / rel_name
            if not target.is_file():
                return self.send_error(404)
            ctype = self.guess_type(str(target))
            try:
                with open(target, "rb") as f:
                    content = f.read()
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
        if path == "/api/upload":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                content_type = self.headers.get("Content-Type", "")
                body = self.rfile.read(content_length)

                filename = "uploaded_chat.txt"
                file_bytes = b""
                if "multipart/form-data" in content_type and b"\r\n" in body:
                    boundary = content_type.split("boundary=")[-1].strip().encode()
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
                    self.send_json(400, {"ok": False, "error": "No file received"})
                    return

                clean_name = re.sub(r'[\\/*?:"<>|]', "", filename) or "uploaded_chat.txt"
                if not clean_name.lower().endswith(".txt"):
                    clean_name += ".txt"
                dest_path = PARENT / clean_name
                with open(dest_path, "wb") as f:
                    f.write(file_bytes)

                OUT.mkdir(parents=True, exist_ok=True)
                r = subprocess.run([
                    sys.executable, str(ROOT / "analyze_chat.py"), str(dest_path),
                    "--out", str(OUT), "--no-charts"
                ], capture_output=True, text=True, encoding="utf-8", errors="replace")

                if r.returncode != 0:
                    self.send_json(500, {"ok": False, "error": r.stderr[-500:]})
                    return

                summary_file = OUT / "summary.json"
                daily_file = OUT / "daily.csv"
                summary_data = {}
                daily_csv = ""
                if summary_file.exists():
                    with open(summary_file, "r", encoding="utf-8") as sf:
                        summary_data = json.load(sf)
                if daily_file.exists():
                    with open(daily_file, "r", encoding="utf-8") as df:
                        daily_csv = df.read()

                self.send_json(200, {
                    "ok": True,
                    "filename": clean_name,
                    "summary": summary_data,
                    "daily": daily_csv
                })
            except Exception as ex:
                self.send_json(500, {"ok": False, "error": str(ex)})
            return
        self.send_error(404)


def main():
    if "--refresh" in sys.argv or stale():
        print("Analysing your chat (a large export can take a minute)...")
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
