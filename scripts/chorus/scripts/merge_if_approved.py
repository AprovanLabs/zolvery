# Copyright 2026 Cicadas Contributors
# SPDX-License-Identifier: Apache-2.0

import argparse
import subprocess
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


def _is_approved(review_path):
    for line in review_path.read_text().splitlines():
        if line.strip().lower() == "- approved: yes":
            return True
    return False


def merge_if_approved(branch, base):
    root = get_project_root()
    cicadas = root / ".cicadas"

    if not branch:
        branch = _current_branch(root)
    if not branch:
        raise SystemExit("Error: Could not determine current branch.")

    if not base:
        base = _infer_base(branch)
    if not base:
        raise SystemExit("Error: Base branch not provided and could not be inferred.")

    review_path = _review_path(cicadas, branch)
    if not review_path.exists():
        raise SystemExit(f"Error: Review packet not found: {review_path}")

    if not _is_approved(review_path):
        raise SystemExit("Error: Review packet is not approved.")

    subprocess.run(["git", "checkout", base], check=True, cwd=root)
    subprocess.run(["git", "merge", branch], check=True, cwd=root)
    print(f"Merged {branch} into {base}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge a task branch only if locally approved")
    parser.add_argument("--branch", default="", help="Task branch (defaults to current)")
    parser.add_argument("--into", dest="base", default="", help="Feature branch to merge into")
    args = parser.parse_args()
    merge_if_approved(args.branch, args.base)
