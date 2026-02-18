# Copyright 2026 Cicadas Contributors
# SPDX-License-Identifier: Apache-2.0

import argparse
import subprocess
from datetime import datetime, timezone
from utils import get_project_root


def _current_branch(root):
    try:
        return subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=root
        ).decode().strip()
    except Exception:
        return ""


def _review_path(cicadas_dir, branch_name):
    safe_name = branch_name.replace("/", "__")
    return cicadas_dir / "reviews" / f"{safe_name}.md"


def _update_approval(lines, approved, reviewer, notes, timestamp):
    new_lines = []
    for line in lines:
        if line.startswith("- APPROVED:"):
            value = "yes" if approved else "no"
            new_lines.append(f"- APPROVED: {value}")
        elif line.startswith("- Reviewer:"):
            new_lines.append(f"- Reviewer: {reviewer}")
        elif line.startswith("- Timestamp:"):
            new_lines.append(f"- Timestamp: {timestamp}")
        elif line.startswith("- Notes:"):
            new_lines.append(f"- Notes: {notes}")
        else:
            new_lines.append(line)
    return new_lines


def approve_review(branch, reviewer, approved, notes):
    root = get_project_root()
    cicadas = root / ".cicadas"

    if not branch:
        branch = _current_branch(root)
    if not branch:
        raise SystemExit("Error: Could not determine current branch.")

    review_path = _review_path(cicadas, branch)
    if not review_path.exists():
        raise SystemExit(f"Error: Review packet not found: {review_path}")

    timestamp = datetime.now(timezone.utc).isoformat()
    lines = review_path.read_text().splitlines()
    updated = _update_approval(lines, approved, reviewer, notes, timestamp)
    review_path.write_text("\n".join(updated) + "\n")
    print(f"Updated review packet: {review_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Approve or reject a local review packet")
    parser.add_argument("--branch", default="", help="Task branch (defaults to current)")
    parser.add_argument("--reviewer", required=True)
    parser.add_argument("--decision", choices=["approve", "reject"], default="approve")
    parser.add_argument("--notes", default="")
    args = parser.parse_args()
    approve_review(args.branch, args.reviewer, args.decision == "approve", args.notes)
