"""Run the browser smoke test from the command line, in headless Chrome or Edge.

    python tools/smoke/run_smoke.py

It starts the app server if it is not running, loads the page with the smoke test attached, prints one line per
check and exits with a non-zero code if any check failed. No Sarvam key, voice or search credits are used.
"""
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATIC = ROOT / "app" / "static"
URL = "http://localhost:8000"
BROWSERS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
sys.stdout.reconfigure(encoding="utf-8")


def server_up():
    try:
        urllib.request.urlopen(URL + "/api/health", timeout=2)
        return True
    except Exception:
        return False


def main():
    browser = next((b for b in BROWSERS if Path(b).exists()), None)
    if not browser:
        sys.exit("No Chrome or Edge found")
    started = None
    if not server_up():
        started = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", "8000"], cwd=ROOT / "app" / "backend",
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(30):
            if server_up():
                break
            time.sleep(0.5)
        else:
            started.kill()
            sys.exit("Could not start the server")
    tmp_profile = tempfile.mkdtemp(prefix="smoke_profile_")
    page, script = STATIC / "_smoke.html", STATIC / "_smoke.js"
    try:
        index = (STATIC / "index.html").read_text(encoding="utf-8")
        page.write_text(index.replace('<script src="app.js"></script>', '<script src="app.js"></script>\n<pre id="smokeResult"></pre>\n<script src="_smoke.js"></script>'), encoding="utf-8")
        shutil.copy(ROOT / "tools" / "smoke" / "browser_smoke.js", script)
        out = subprocess.run([browser, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={tmp_profile}",
                              "--autoplay-policy=no-user-gesture-required", "--virtual-time-budget=60000", "--dump-dom", URL + "/_smoke.html"],
                             capture_output=True, timeout=180, text=True, encoding="utf-8", errors="replace").stdout
    finally:
        for f in (page, script):
            f.unlink(missing_ok=True)
        shutil.rmtree(tmp_profile, ignore_errors=True)
        if started:
            started.kill()
    m = re.search(r'<pre id="smokeResult">(.*?)</pre>', out, re.S)
    if not m or not m.group(1).strip():
        sys.exit("The smoke test did not finish (no result in the page).")
    result = json.loads(html.unescape(m.group(1)))
    print("\n".join(result["lines"]))
    print(f"\n{result['passed']}/{result['total']} checks passed")
    sys.exit(0 if result["passed"] == result["total"] else 1)


if __name__ == "__main__":
    main()
