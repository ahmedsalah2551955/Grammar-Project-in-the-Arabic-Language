#!/usr/bin/env python3
"""خادم محلي بسيط لمنصة نَحْو.

التشغيل:
    python3 serve.py
    python3 serve.py --port 8080
    python3 serve.py --no-browser

لا يحتاج أي مكتبات خارجية. فتح index.html مباشرة يعمل أيضًا،
لكن تسجيل عامل الخدمة وتثبيت التطبيق يحتاجان إلى HTTP.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import socket
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8000
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".txt": "text/plain; charset=utf-8",
}


class NahwRequestHandler(http.server.SimpleHTTPRequestHandler):
    """خادم ملفات ثابت مع أنواع MIME صحيحة ومنع التخزين المؤقت."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **CONTENT_TYPES,
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        print(f"  {self.address_string()} — {format % args}")


def local_ip() -> str:
    """يعيد عنوان الشبكة المحلية إن أمكن، وإلا 127.0.0.1."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.settimeout(0.25)
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return "127.0.0.1"
    finally:
        sock.close()


def find_server(host: str, start_port: int):
    """يبحث عن منفذ متاح بدءًا من المنفذ المطلوب."""
    handler = functools.partial(NahwRequestHandler, directory=str(ROOT))
    for port in range(start_port, start_port + 20):
        try:
            return http.server.ThreadingHTTPServer((host, port), handler), port
        except OSError:
            continue
    raise SystemExit(
        f"تعذّر إيجاد منفذ متاح بين {start_port} و{start_port + 19}."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="تشغيل خادم منصة نَحْو المحلي")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="المنفذ (افتراضي: 8000)")
    parser.add_argument("--host", default="0.0.0.0", help="العنوان الذي يستمع عليه الخادم")
    parser.add_argument("--no-browser", action="store_true", help="عدم فتح المتصفح تلقائيًا")
    args = parser.parse_args()

    server, port = find_server(args.host, args.port)
    lan = local_ip()
    local_url = f"http://localhost:{port}/"
    network_url = f"http://{lan}:{port}/"

    print()
    print("  نَحْو — خادم التطوير المحلي")
    print("  " + "─" * 42)
    print(f"  على هذا الجهاز : {local_url}")
    if args.host == "0.0.0.0" and lan != "127.0.0.1":
        print(f"  على الهاتف     : {network_url}")
        print("  (الهاتف والكمبيوتر على نفس شبكة Wi-Fi)")
    print("  للإيقاف        : Ctrl+C")
    print("  " + "─" * 42)
    print()

    if not args.no_browser:
        threading.Timer(0.7, lambda: webbrowser.open(local_url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  تم إيقاف الخادم. إلى اللقاء!\n")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
