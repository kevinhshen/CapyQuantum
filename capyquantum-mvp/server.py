"""Serve the lab and an optional local Qiskit verification endpoint."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse
import json
import math
from pathlib import Path
from urllib.parse import parse_qs, urlparse

WEB = Path(__file__).resolve().parent / "web"


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path != "/api/experiment":
            return super().do_GET()
        try:
            query = parse_qs(url.query)
            theta = float(query.get("theta", ["90"])[0])
            phi = float(query.get("phi", ["0"])[0])
            errors = query.get("errors", ["IXI"])[0]
            if not (0 <= theta <= 180 and 0 <= phi <= 360) or len(errors) != 3 or any(e not in "IXYZ" for e in errors):
                raise ValueError("Invalid state or error selection")
            from quantum.bitflip import analyze
            payload = analyze(math.radians(theta), math.radians(phi), list(errors))
            payload.pop("statevector")
            payload["engine"] = "Qiskit Statevector"
            self.send_json(200, payload)
        except ImportError:
            self.send_json(503, {"error": "Install requirements.txt to enable local Qiskit verification."})
        except (ValueError, OverflowError):
            self.send_json(400, {"error": "Invalid state or error selection"})

    def send_json(self, code, payload):
        content = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(WEB)))
    print(f"CapyQuantum → http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
