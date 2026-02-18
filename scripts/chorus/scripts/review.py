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


def _infer_base(branch_name):
    if branch_name.startswith("task/"):
        parts = branch_name.split("/")
        if len(parts) >= 2:
            return f"feat/{parts[1]}"
    return ""


def _review_path(cicadas_dir, branch_name):
    safe_name = branch_name.replace("/", "__")
    return cicadas_dir / "reviews" / f"{safe_name}.md"


def create_review_packet(branch, base):
    root = get_project_root()
    cicadas = root / ".cicadas"
    cicadas.mkdir(parents=True, exist_ok=True)

    if not branch:
        branch = _current_branch(root)
    if not branch:
        raise SystemExit("Error: Could not determine current branch.")

    if not base:
        base = _infer_base(branch)
    if not base:
        raise SystemExit("Error: Base branch not provided and could not be inferred.")

    review_path = _review_path(cicadas, branch)
    review_path.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).isoformat()
    compare_range = f"{base}..{branch}"

    if review_path.exists():
        print(f"Review packet already exists: {review_path}")
        return

    content = "\n".join(
        [
            f"# Review Packet",
            f"",
            f"- Branch: {branch}",
            f"- Base: {base}",
            f"- Compare: {compare_range}",
            f"- Created: {timestamp}",
            f"",
            f"## Task Intent",
            f"[fill in]",
            f"",
            f"## Summary",
            f"[fill in]",
            f"",
            f"## Reflect Findings",
            f"[fill in]",
            f"",
            f"## Review Commands",
            f"- git diff --stat {compare_range}",
            f"- git diff {compare_range}",
            f"- git log --left-right --graph {base}...{branch}",
            f"",
            f"## Approval",
            f"- APPROVED: no",
            f"- Reviewer: ",
            f"- Timestamp: ",
            f"- Notes: ",
            f"",
        ]
    )

    review_path.write_text(content)
    print(f"Created review packet: {review_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a local review packet for a task branch")
    parser.add_argument("--branch", default="", help="Task branch (defaults to current)")
    parser.add_argument("--base", default="", help="Base feature branch to compare against")
    args = parser.parse_args()
    create_review_packet(args.branch, args.base)
