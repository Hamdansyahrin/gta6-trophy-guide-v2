#!/usr/bin/env python3
"""Render the three guide views used by the make.fun submission."""

from pathlib import Path
import mimetypes
import subprocess
import time
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://localhost:8080"
OUTPUT = ROOT / "screenshots"


def wait_for_server(server):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if server.poll() is not None:
            return False
        try:
            with urlopen(BASE, timeout=1) as response:
                if response.status == 200:
                    return True
        except (OSError, URLError):
            time.sleep(0.25)
    return False


def install_file_route(page):
    """Let a browser render the same offline files when a sandbox blocks loopback binds."""

    def serve(route):
        parsed = urlparse(route.request.url)
        if parsed.hostname != "localhost" or parsed.port != 8080:
            route.abort()
            return
        relative = parsed.path.lstrip("/") or "index.html"
        target = (ROOT / "app" / relative).resolve()
        if ROOT / "app" not in target.parents and target != ROOT / "app":
            route.fulfill(status=403, body="forbidden")
            return
        if not target.is_file():
            route.fulfill(status=404, body="not found")
            return
        content_type, _ = mimetypes.guess_type(target.name)
        route.fulfill(
            status=200,
            body=target.read_bytes(),
            content_type=content_type or "application/octet-stream",
        )

    page.route("**/*", serve)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = subprocess.Popen(
        ["node", "serve.ts"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    try:
        server_ready = wait_for_server(server)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
            browser_errors = []
            page.on("pageerror", lambda error: browser_errors.append(str(error)))
            page.on(
                "console",
                lambda message: browser_errors.append(message.text) if message.type == "error" else None,
            )
            if not server_ready:
                print("Local server could not bind; rendering the same static files through Playwright routes.")
                install_file_route(page)
            views = [
                ("1-checklist.jpg", "/"),
                ("2-silver.jpg", "/?grade=silver"),
                ("3-bronze.jpg", "/?grade=bronze&scroll=1400"),
            ]
            for filename, path in views:
                page.goto(BASE + path, wait_until="networkidle")
                page.locator(".trophy").first.wait_for()
                if "scroll=" in path:
                    page.wait_for_function("window.scrollY >= 1400")
                page.wait_for_timeout(250)
                page.screenshot(
                    path=str(OUTPUT / filename),
                    type="jpeg",
                    quality=90,
                    full_page=False,
                )
                print(f"Saved {filename} at {page.url}")
            browser.close()
            if browser_errors:
                raise RuntimeError("Browser page errors: " + "; ".join(browser_errors))
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()


if __name__ == "__main__":
    main()
