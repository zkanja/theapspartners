# End-to-end test for the booking widget and lead form.
# Runs against the local dev server (node dev-server.js, port 4173) on two engines:
#   - Chromium desktop 1280x800
#   - WebKit with iPhone 13 emulation (same engine as Safari iOS)
# Usage: <venv-python> tests/e2e_booking.py
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173"
ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "leads.local.json"
EMAIL = "contact@theapspartners.com"

def next_weekday(min_ahead=3):
    d = date.today() + timedelta(days=min_ahead)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d

def next_saturday():
    d = date.today() + timedelta(days=1)
    while d.weekday() != 5:
        d += timedelta(days=1)
    return d

def expected_utc_stamp(day, hhmm):
    h, m = map(int, hhmm.split(":"))
    local = datetime(day.year, day.month, day.day, h, m, tzinfo=ZoneInfo("Europe/Paris"))
    return local.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

results = []

def check(engine, name, ok, detail=""):
    results.append((engine, name, ok, detail))
    print(f"[{engine}] {'PASS' if ok else 'FAIL'} {name}" + (f" — {detail}" if detail and not ok else ""))

def run_suite(pw, engine_name):
    if engine_name == "webkit-iphone":
        browser = pw.webkit.launch()
        ctx = browser.new_context(**pw.devices["iPhone 13"])
    else:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})

    page = ctx.new_page()
    page.add_init_script("window.__captured=null; window.open=function(u){window.__captured=u;return null;};")
    # networkidle never fires here: the <video preload="metadata"> elements keep
    # range requests open — wait for the booking script to have initialised instead.
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_function("document.getElementById('b-date') && document.getElementById('b-date').value !== ''", timeout=10000)

    # 0. layout sanity: no horizontal overflow, booking widget present
    overflow = page.evaluate("document.scrollingElement.scrollWidth - window.innerWidth")
    check(engine_name, "no horizontal overflow", overflow <= 1, f"overflow={overflow}px")
    check(engine_name, "booking widget rendered", page.locator("#booking").count() == 1)

    # 1. default date pre-filled with a business day
    default_date = page.input_value("#b-date")
    ok = bool(default_date) and date.fromisoformat(default_date).weekday() < 5
    check(engine_name, "default date is a business day", ok, default_date)

    # 2. Google Calendar invite: correct UTC conversion + guest email
    day = next_weekday()
    page.fill("#b-date", day.isoformat())
    page.select_option("#b-time", "14:00")
    page.click("#b-google")
    url = page.evaluate("window.__captured")
    want = expected_utc_stamp(day, "14:00")
    ok = bool(url) and "calendar.google.com" in url and want in url and "add=" + EMAIL.replace("@", "%40") in url
    check(engine_name, "calendar invite URL (Paris→UTC + guest)", ok, str(url))

    # 3. weekend guard
    page.fill("#b-date", next_saturday().isoformat())
    page.click("#b-google")
    msg = page.text_content("#b-status") or ""
    check(engine_name, "weekend slot rejected", "business day" in msg, msg)

    # 4. past-slot guard (today at 09:00 only if already past in Paris)
    now_paris = datetime.now(ZoneInfo("Europe/Paris"))
    if now_paris.hour >= 10 and now_paris.weekday() < 5:
        page.fill("#b-date", now_paris.date().isoformat())
        page.select_option("#b-time", "09:00")
        page.click("#b-google")
        msg = page.text_content("#b-status") or ""
        check(engine_name, "past slot rejected", "past" in msg, msg)

    # 5. lead form end-to-end: POST /api/lead → stored with intent
    marker = f"e2e-{engine_name}"
    page.click('.intent[data-intent="question"]')
    page.fill("#f-name", marker)
    page.fill("#f-email", "e2e@example.com")
    page.fill("#f-message", "automated end-to-end check")
    page.click("#f-submit")
    page.wait_for_function("document.getElementById('form-status').textContent.includes('Filed')", timeout=5000)
    stored = json.loads(STORE.read_text(encoding="utf-8")) if STORE.exists() else []
    row = next((r for r in stored if r.get("name") == marker), None)
    check(engine_name, "form POST stored with intent=question", bool(row) and row.get("intent") == "question")

    # 6. .ics generation does not throw (download event or silent success)
    page.fill("#b-date", day.isoformat())
    try:
        with page.expect_download(timeout=4000) as dl:
            page.click("#b-ics")
        check(engine_name, ".ics download produced", dl.value.suggested_filename.endswith(".ics"))
    except Exception:
        msg = page.text_content("#b-status") or ""
        check(engine_name, ".ics flow completed without error", "err" not in (page.get_attribute("#b-status", "class") or ""), msg)

    browser.close()

with sync_playwright() as pw:
    for engine in ("chromium", "webkit-iphone"):
        try:
            run_suite(pw, engine)
        except Exception as exc:
            check(engine, "suite crashed", False, repr(exc))

# cleanup test rows
if STORE.exists():
    rows = [r for r in json.loads(STORE.read_text(encoding="utf-8")) if not str(r.get("name", "")).startswith("e2e-")]
    if rows:
        STORE.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    else:
        STORE.unlink()

failed = [r for r in results if not r[2]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
