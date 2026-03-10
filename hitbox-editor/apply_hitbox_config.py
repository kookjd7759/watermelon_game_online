#!/usr/bin/env python3
"""Apply saved hitbox JSON config into game.js constants.

Usage:
  python apply_hitbox_config.py [hitbox_config.json]
"""

from __future__ import annotations

import json
import math
import struct
import sys
from pathlib import Path

FRUIT_NAMES = [
    "Cherry",
    "Strawberry",
    "Grape",
    "Hallabong",
    "Persimmon",
    "Apple",
    "Pear",
    "Peach",
    "Pineapple",
    "Melon",
    "Watermelon",
]

MIN_COORD = -1.4
MAX_COORD = 1.4
MIN_RADIUS = 0.05
MAX_RADIUS = 1.4
MIN_EXPANSION = 0.6
MAX_EXPANSION = 2.2

# Old editor versions used this fixed visual half-size for scale calculations.
LEGACY_EDITOR_SPRITE_HALF = 178.0
LEGACY_EDITOR_MAX_SIDE = int(LEGACY_EDITOR_SPRITE_HALF * 2)

TOOL_DIR = Path(__file__).resolve().parent


def find_project_dir(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / "game.js").exists():
            return candidate
    return start


PROJECT_DIR = find_project_dir(TOOL_DIR)
GAME_JS = PROJECT_DIR / "game.js"
DEFAULT_CONFIG = PROJECT_DIR / "assets" / "hitbox_config.json"
ASSET_DIR = PROJECT_DIR / "assets"


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def normalize_circle(circle: dict[str, float]) -> dict[str, float]:
    return {
        "x": clamp(float(circle.get("x", 0.0)), MIN_COORD, MAX_COORD),
        "y": clamp(float(circle.get("y", 0.0)), MIN_COORD, MAX_COORD),
        "r": clamp(float(circle.get("r", 0.12)), MIN_RADIUS, MAX_RADIUS),
    }


def normalize_shape(shape: dict[str, object]) -> dict[str, float | str]:
    kind = str(shape.get("kind", "circle"))

    if kind == "ellipse":
        return {
            "kind": "ellipse",
            "x": clamp(float(shape.get("x", 0.0)), MIN_COORD, MAX_COORD),
            "y": clamp(float(shape.get("y", 0.0)), MIN_COORD, MAX_COORD),
            "rx": clamp(float(shape.get("rx", shape.get("r", 0.14))), MIN_RADIUS, MAX_RADIUS),
            "ry": clamp(float(shape.get("ry", shape.get("r", 0.14))), MIN_RADIUS, MAX_RADIUS),
        }

    return {
        "kind": "circle",
        "x": clamp(float(shape.get("x", 0.0)), MIN_COORD, MAX_COORD),
        "y": clamp(float(shape.get("y", 0.0)), MIN_COORD, MAX_COORD),
        "r": clamp(float(shape.get("r", 0.12)), MIN_RADIUS, MAX_RADIUS),
    }


def scale_shape(shape: dict[str, float | str], factor: float) -> dict[str, float | str]:
    kind = str(shape.get("kind", "circle"))
    if abs(factor - 1.0) < 1e-6:
        return shape

    if kind == "ellipse":
        return normalize_shape(
            {
                "kind": "ellipse",
                "x": float(shape.get("x", 0.0)) * factor,
                "y": float(shape.get("y", 0.0)) * factor,
                "rx": float(shape.get("rx", 0.12)) * factor,
                "ry": float(shape.get("ry", 0.12)) * factor,
            }
        )

    return normalize_shape(
        {
            "kind": "circle",
            "x": float(shape.get("x", 0.0)) * factor,
            "y": float(shape.get("y", 0.0)) * factor,
            "r": float(shape.get("r", 0.12)) * factor,
        }
    )


def scale_circle(circle: dict[str, float], factor: float) -> dict[str, float]:
    if abs(factor - 1.0) < 1e-6:
        return normalize_circle(circle)
    return normalize_circle(
        {
            "x": float(circle.get("x", 0.0)) * factor,
            "y": float(circle.get("y", 0.0)) * factor,
            "r": float(circle.get("r", 0.12)) * factor,
        }
    )


def read_png_size(path: Path) -> tuple[int, int] | None:
    try:
        with open(path, "rb") as f:
            data = f.read(24)
    except OSError:
        return None

    if len(data) < 24:
        return None
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None

    width, height = struct.unpack(">II", data[16:24])
    if width <= 0 or height <= 0:
        return None

    return width, height


def legacy_display_half_for_fruit(index: int) -> float:
    path = ASSET_DIR / f"{index + 1}.png"
    size = read_png_size(path)
    if not size:
        return LEGACY_EDITOR_SPRITE_HALF

    width, height = size
    scale = max(width / LEGACY_EDITOR_MAX_SIDE, height / LEGACY_EDITOR_MAX_SIDE)

    if scale <= 1.0:
        fit_w = width
        fit_h = height
    else:
        factor = max(1, int(math.ceil(scale)))
        fit_w = max(1, width // factor)
        fit_h = max(1, height // factor)

    return max(1.0, min(fit_w, fit_h) / 2)


def legacy_correction_factors() -> list[float]:
    factors: list[float] = []

    for i in range(len(FRUIT_NAMES)):
        display_half = legacy_display_half_for_fruit(i)
        factor = LEGACY_EDITOR_SPRITE_HALF / display_half
        factors.append(clamp(factor, 0.5, 4.0))

    return factors


def ellipse_to_circles_detailed(shape: dict[str, float | str]) -> list[dict[str, float]]:
    x = float(shape.get("x", 0.0))
    y = float(shape.get("y", 0.0))
    rx = clamp(float(shape.get("rx", 0.12)), MIN_RADIUS, MAX_RADIUS)
    ry = clamp(float(shape.get("ry", 0.12)), MIN_RADIUS, MAX_RADIUS)

    if abs(rx - ry) <= 0.01:
        return [normalize_circle({"x": x, "y": y, "r": (rx + ry) * 0.5})]

    major_is_x = rx >= ry
    major = rx if major_is_x else ry
    minor = ry if major_is_x else rx

    ratio = major / max(minor, 1e-6)
    base_count = 7 + (ratio - 1.0) * 7 + major * 10
    count = int(round(clamp(base_count, 7, 25)))
    if count % 2 == 0:
        count += 1

    span = max(0.0, major - minor)
    circles: list[dict[str, float]] = []

    for i in range(count):
        t = 0.0 if count == 1 else (-span + (2.0 * span) * (i / (count - 1)))

        factor = 1.0 - (t * t) / (major * major)
        local_minor = minor * math.sqrt(max(0.0, factor))
        radius = clamp(local_minor, MIN_RADIUS, MAX_RADIUS)

        cx = x + t if major_is_x else x
        cy = y if major_is_x else y + t

        circles.append(normalize_circle({"x": cx, "y": cy, "r": radius}))

    if not circles:
        circles.append(normalize_circle({"x": x, "y": y, "r": minor}))

    return circles


def shape_to_circles(shape: dict[str, float | str]) -> list[dict[str, float]]:
    kind = str(shape.get("kind", "circle"))
    if kind == "ellipse":
        return ellipse_to_circles_detailed(shape)

    return [
        normalize_circle(
            {
                "x": float(shape.get("x", 0.0)),
                "y": float(shape.get("y", 0.0)),
                "r": float(shape.get("r", 0.12)),
            }
        )
    ]


def templates_from_editor_shapes(editor_shapes: list[object], factors: list[float] | None = None) -> list[list[dict[str, float]]]:
    if len(editor_shapes) != len(FRUIT_NAMES):
        raise ValueError(f"editor_shapes must contain {len(FRUIT_NAMES)} entries")

    templates: list[list[dict[str, float]]] = []

    for idx, row in enumerate(editor_shapes):
        if not isinstance(row, list) or len(row) == 0:
            raise ValueError("each editor_shapes row must have at least one shape")

        factor = factors[idx] if factors and idx < len(factors) else 1.0

        circles: list[dict[str, float]] = []
        for raw_shape in row:
            if not isinstance(raw_shape, dict):
                continue
            shape = normalize_shape(raw_shape)
            shape = scale_shape(shape, factor)
            circles.extend(shape_to_circles(shape))

        if not circles:
            raise ValueError("each editor_shapes row must contain valid shapes")

        templates.append(circles)

    return templates


def scale_templates(templates: list[list[dict[str, float]]], factors: list[float]) -> list[list[dict[str, float]]]:
    scaled: list[list[dict[str, float]]] = []

    for idx, row in enumerate(templates):
        factor = factors[idx] if idx < len(factors) else 1.0
        scaled.append([scale_circle(circle, factor) for circle in row])

    return scaled


def fmt_number(value: float, digits: int = 3) -> str:
    rounded = round(float(value), digits)
    text = f"{rounded:.{digits}f}"
    text = text.rstrip("0").rstrip(".")
    if text == "-0":
        text = "0"
    if "." not in text:
        text += ".0"
    return text


def load_payload(path: Path) -> tuple[list[list[dict[str, float]]], list[float], bool, bool]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("JSON root must be an object")

    expansions = data.get("expansions")
    if not isinstance(expansions, list) or len(expansions) != len(FRUIT_NAMES):
        raise ValueError(f"expansions must contain {len(FRUIT_NAMES)} entries")

    next_expansions: list[float] = []
    for value in expansions:
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("expansion values must be numeric") from exc
        if not math.isfinite(number):
            raise ValueError("expansion values must be finite")
        next_expansions.append(clamp(number, MIN_EXPANSION, MAX_EXPANSION))

    editor_meta = data.get("editor_meta")
    scale_mode = editor_meta.get("scale_mode") if isinstance(editor_meta, dict) else None
    needs_legacy_fix = scale_mode != "display-half-v2"
    correction_factors = legacy_correction_factors() if needs_legacy_fix else [1.0] * len(FRUIT_NAMES)

    editor_shapes = data.get("editor_shapes")
    used_editor_shapes = False

    if isinstance(editor_shapes, list) and len(editor_shapes) == len(FRUIT_NAMES):
        templates = templates_from_editor_shapes(editor_shapes, correction_factors)
        used_editor_shapes = True
    else:
        templates = data.get("templates")
        if not isinstance(templates, list) or len(templates) != len(FRUIT_NAMES):
            raise ValueError(f"templates must contain {len(FRUIT_NAMES)} entries")

        next_templates: list[list[dict[str, float]]] = []
        for template in templates:
            if not isinstance(template, list) or len(template) == 0:
                raise ValueError("each fruit template must have at least one circle")
            circles = [normalize_circle(circle if isinstance(circle, dict) else {}) for circle in template]
            next_templates.append(circles)

        templates = scale_templates(next_templates, correction_factors) if needs_legacy_fix else next_templates

    return templates, next_expansions, used_editor_shapes, needs_legacy_fix


def find_array_span(source: str, const_name: str) -> tuple[int, int]:
    marker = f"const {const_name} ="
    marker_idx = source.find(marker)
    if marker_idx < 0:
        raise ValueError(f"Could not find {const_name} declaration")

    start = source.find("[", marker_idx)
    if start < 0:
        raise ValueError(f"Could not find array start for {const_name}")

    depth = 0
    in_string = False
    quote = ""
    escaped = False

    for i in range(start, len(source)):
        ch = source[i]

        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                in_string = False
            continue

        if ch in ('"', "'"):
            in_string = True
            quote = ch
            continue

        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return start, i

    raise ValueError(f"Could not find array end for {const_name}")


def format_templates_js(templates: list[list[dict[str, float]]]) -> str:
    lines: list[str] = ["["]

    for t_idx, template in enumerate(templates):
        lines.append("  [")
        for circle in template:
            lines.append(
                "    { x: "
                + fmt_number(circle["x"])
                + ", y: "
                + fmt_number(circle["y"])
                + ", r: "
                + fmt_number(circle["r"])
                + " },"
            )
        lines.append("  ]," if t_idx < len(templates) - 1 else "  ]")

    lines.append("]")
    return "\n".join(lines)


def format_expansions_js(expansions: list[float]) -> str:
    lines: list[str] = ["["]

    for i, value in enumerate(expansions):
        suffix = "," if i < len(expansions) - 1 else ""
        lines.append(f"  {fmt_number(value, digits=2)}{suffix} // {FRUIT_NAMES[i]}")

    lines.append("]")
    return "\n".join(lines)


def apply_arrays(source: str, templates_js: str, expansions_js: str) -> str:
    t_start, t_end = find_array_span(source, "FRUIT_MANUAL_HITBOX_TEMPLATES")
    updated = source[:t_start] + templates_js + source[t_end + 1 :]

    e_start, e_end = find_array_span(updated, "FRUIT_HITBOX_EXPANSION")
    updated = updated[:e_start] + expansions_js + updated[e_end + 1 :]

    return updated


def main() -> int:
    if len(sys.argv) > 2:
        print("Usage: python apply_hitbox_config.py [hitbox_config.json]")
        return 1

    if len(sys.argv) == 2:
        config_path = Path(sys.argv[1]).resolve()
    else:
        config_path = DEFAULT_CONFIG.resolve()
        print(f"No config path provided. Using default: {config_path}")

    if not config_path.exists():
        print(f"Config not found: {config_path}")
        return 1

    if not GAME_JS.exists():
        print(f"game.js not found: {GAME_JS}")
        return 1

    try:
        templates, expansions, used_editor_shapes, legacy_fix = load_payload(config_path)
    except Exception as exc:  # pylint: disable=broad-except
        print(f"Invalid config: {exc}")
        return 1

    source = GAME_JS.read_text(encoding="utf-8")
    templates_js = format_templates_js(templates)
    expansions_js = format_expansions_js(expansions)

    try:
        updated = apply_arrays(source, templates_js, expansions_js)
    except Exception as exc:  # pylint: disable=broad-except
        print(f"Failed to patch game.js: {exc}")
        return 1

    GAME_JS.write_text(updated, encoding="utf-8")
    print(f"Applied hitbox config from {config_path}")

    if used_editor_shapes:
        print("Mode: detailed conversion from editor_shapes (ellipse -> high-resolution circles)")
    else:
        print("Mode: templates passthrough")

    if legacy_fix:
        print("Legacy scale correction: applied")
    else:
        print("Legacy scale correction: not needed (display-half-v2)")

    print(f"Updated: {GAME_JS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
