#!/usr/bin/env python3
"""Sync canonical school curriculum data into the Next.js app."""

from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from pathlib import Path


SOURCE_RELATIVE = Path("data") / "school.json"
TARGET_RELATIVE = Path("app") / "src" / "data" / "json" / "school.json"


@dataclass(frozen=True)
class SyncResult:
    source: Path
    target: Path
    changed: bool


def resolve_repo_root(repo_root: Path | None = None) -> Path:
    return (repo_root or Path(__file__).resolve().parent).resolve()


def _read_valid_school_json(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise ValueError(f"Missing source file: {path}") from exc

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc

    if not isinstance(data, dict) or "schoolName" not in data or "cohorts" not in data:
        raise ValueError(f"Invalid school data shape in {path}: expected schoolName and cohorts")
    if not isinstance(data["cohorts"], dict):
        raise ValueError(f"Invalid school data shape in {path}: cohorts must be an object")

    return text


def check_school_json(repo_root: Path | None = None) -> bool:
    root = resolve_repo_root(repo_root)
    source = root / SOURCE_RELATIVE
    target = root / TARGET_RELATIVE
    source_text = _read_valid_school_json(source)
    try:
        target_text = target.read_text(encoding="utf-8")
    except FileNotFoundError:
        return False
    return source_text == target_text


def sync_school_json(repo_root: Path | None = None) -> SyncResult:
    root = resolve_repo_root(repo_root)
    source = root / SOURCE_RELATIVE
    target = root / TARGET_RELATIVE
    source_text = _read_valid_school_json(source)

    try:
        target_text = target.read_text(encoding="utf-8")
    except FileNotFoundError:
        target_text = None

    changed = source_text != target_text
    if changed:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)

    return SyncResult(source=source, target=target, changed=changed)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync data/school.json to app/src/data/json/school.json."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit with status 1 if the app school data is out of sync.",
    )
    args = parser.parse_args()

    if args.check:
        in_sync = check_school_json()
        print("school.json is in sync" if in_sync else "school.json is out of sync")
        return 0 if in_sync else 1

    result = sync_school_json()
    action = "updated" if result.changed else "already in sync"
    print(f"{action}: {result.source} -> {result.target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
