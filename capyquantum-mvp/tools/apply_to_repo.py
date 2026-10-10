"""Apply the prepared patch to the requested clean branch, when run by the user."""
from pathlib import Path
import subprocess
import sys

repo = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Users/Git Local/CapyQuantum")
patch = Path(__file__).resolve().parents[2] / "CapyQuantum-MVP.patch"


def git(*args):
    return subprocess.check_output(["git", "-C", str(repo), *args], text=True).strip()


if git("branch", "--show-current") != "MVP-Error-Correction":
    raise SystemExit("Switch to MVP-Error-Correction in GitHub Desktop first. No files changed.")
if git("status", "--porcelain"):
    raise SystemExit("The repo has local changes. Preserve them first. No files changed.")
subprocess.run(["git", "-C", str(repo), "apply", "--check", str(patch)], check=True)
subprocess.run(["git", "-C", str(repo), "apply", str(patch)], check=True)
print(f"MVP applied to {repo} on MVP-Error-Correction. No commit or push was made.")
print("Run python3 server.py from that folder to open the lab.")
