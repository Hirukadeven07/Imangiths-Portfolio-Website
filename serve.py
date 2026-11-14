"""Local dev server: like `python -m http.server`, but tells the browser never
to keep old copies, so every edit shows up on a normal reload.

    python serve.py          # http://localhost:4173
    python serve.py 8000     # another port
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        # Pages: also empty anything the browser saved for this site before,
        # e.g. from a server that didn't send the header above.
        path = self.path.split("?", 1)[0]
        if path.endswith("/") or path.endswith(".html"):
            self.send_header("Clear-Site-Data", '"cache"')
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=root)
    http.server.test(HandlerClass=handler, port=port, bind="127.0.0.1")
