#!/usr/bin/env python3
"""Local hitbox editor for watermelon_game_online assets.

Usage:
  python hitbox_editor_local.py
"""

from __future__ import annotations

import copy
import json
import math
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

TOOL_DIR = Path(__file__).resolve().parent


def find_project_dir(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / "game.js").exists():
            return candidate
    return start


PROJECT_DIR = find_project_dir(TOOL_DIR)
ASSET_DIR = PROJECT_DIR / "assets"

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

DEFAULT_TEMPLATES = [
    [
        {"x": -0.29, "y": 0.31, "r": 0.38},
        {"x": 0.29, "y": 0.31, "r": 0.38},
        {"x": 0.0, "y": 0.39, "r": 0.29},
        {"x": -0.17, "y": 0.06, "r": 0.12},
        {"x": 0.17, "y": 0.06, "r": 0.12},
    ],
    [
        {"x": 0.0, "y": 0.04, "r": 0.45},
        {"x": -0.27, "y": 0.06, "r": 0.22},
        {"x": 0.27, "y": 0.06, "r": 0.22},
        {"x": -0.25, "y": 0.34, "r": 0.24},
        {"x": 0.25, "y": 0.34, "r": 0.24},
        {"x": 0.0, "y": -0.30, "r": 0.2},
        {"x": -0.19, "y": -0.20, "r": 0.16},
        {"x": 0.19, "y": -0.20, "r": 0.16},
        {"x": 0.0, "y": 0.62, "r": 0.29},
    ],
    [
        {"x": 0.0, "y": 0.03, "r": 0.34},
        {"x": -0.24, "y": 0.02, "r": 0.22},
        {"x": 0.24, "y": 0.02, "r": 0.22},
        {"x": 0.0, "y": -0.18, "r": 0.2},
        {"x": -0.14, "y": 0.34, "r": 0.2},
        {"x": 0.14, "y": 0.34, "r": 0.2},
        {"x": 0.0, "y": 0.61, "r": 0.2},
        {"x": 0.0, "y": -0.33, "r": 0.12},
        {"x": -0.22, "y": -0.24, "r": 0.11},
        {"x": 0.22, "y": -0.24, "r": 0.11},
    ],
    [
        {"x": 0.0, "y": 0.17, "r": 0.59},
        {"x": -0.32, "y": 0.21, "r": 0.3},
        {"x": 0.32, "y": 0.21, "r": 0.3},
        {"x": 0.0, "y": 0.5, "r": 0.26},
    ],
    [
        {"x": 0.0, "y": 0.16, "r": 0.58},
        {"x": -0.31, "y": 0.17, "r": 0.29},
        {"x": 0.31, "y": 0.17, "r": 0.29},
        {"x": 0.0, "y": 0.48, "r": 0.24},
    ],
    [
        {"x": 0.03, "y": 0.17, "r": 0.59},
        {"x": -0.3, "y": 0.2, "r": 0.28},
        {"x": 0.3, "y": 0.2, "r": 0.28},
        {"x": 0.03, "y": 0.5, "r": 0.24},
    ],
    [
        {"x": 0.0, "y": 0.35, "r": 0.45},
        {"x": 0.0, "y": 0.02, "r": 0.3},
        {"x": -0.22, "y": 0.36, "r": 0.24},
        {"x": 0.22, "y": 0.36, "r": 0.24},
    ],
    [
        {"x": 0.0, "y": 0.19, "r": 0.6},
        {"x": -0.28, "y": 0.21, "r": 0.27},
        {"x": 0.28, "y": 0.21, "r": 0.27},
        {"x": 0.0, "y": 0.54, "r": 0.22},
    ],
    [
        {"x": 0.0, "y": 0.36, "r": 0.43},
        {"x": 0.0, "y": 0.07, "r": 0.28},
        {"x": -0.22, "y": 0.37, "r": 0.22},
        {"x": 0.22, "y": 0.37, "r": 0.22},
        {"x": 0.0, "y": 0.6, "r": 0.22},
    ],
    [
        {"x": 0.0, "y": 0.18, "r": 0.6},
        {"x": -0.28, "y": 0.2, "r": 0.27},
        {"x": 0.28, "y": 0.2, "r": 0.27},
        {"x": 0.0, "y": 0.52, "r": 0.23},
    ],
    [
        {"x": 0.0, "y": 0.17, "r": 0.62},
        {"x": -0.29, "y": 0.19, "r": 0.28},
        {"x": 0.29, "y": 0.19, "r": 0.28},
        {"x": 0.0, "y": 0.54, "r": 0.24},
    ],
]

DEFAULT_EXPANSIONS = [1.30, 1.36, 1.30, 1.25, 1.28, 1.25, 1.19, 1.20, 1.16, 1.22, 1.20]
GLOBAL_HITBOX_EXPANSION = 1.24
EDITOR_SCALE_MODE = "display-half-v2"
EDITOR_VERSION = 2

MIN_COORD = -1.4
MAX_COORD = 1.4
MIN_RADIUS = 0.05
MAX_RADIUS = 1.4
MIN_EXPANSION = 0.6
MAX_EXPANSION = 2.2

CANVAS_W = 760
CANVAS_H = 640
CENTER_X = 330
CENTER_Y = 320
SPRITE_HALF = 178
HANDLE_R = 7

DEFAULT_SAVE_PATH = ASSET_DIR / "hitbox_config.json"


Shape = dict[str, float | str]


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def normalize_circle(circle: dict[str, float]) -> dict[str, float]:
    return {
        "x": clamp(float(circle.get("x", 0.0)), MIN_COORD, MAX_COORD),
        "y": clamp(float(circle.get("y", 0.0)), MIN_COORD, MAX_COORD),
        "r": clamp(float(circle.get("r", 0.12)), MIN_RADIUS, MAX_RADIUS),
    }


def normalize_ellipse(ellipse: dict[str, float]) -> dict[str, float]:
    return {
        "x": clamp(float(ellipse.get("x", 0.0)), MIN_COORD, MAX_COORD),
        "y": clamp(float(ellipse.get("y", 0.0)), MIN_COORD, MAX_COORD),
        "rx": clamp(float(ellipse.get("rx", 0.16)), MIN_RADIUS, MAX_RADIUS),
        "ry": clamp(float(ellipse.get("ry", 0.12)), MIN_RADIUS, MAX_RADIUS),
    }


def normalize_shape(shape: Shape) -> Shape:
    kind = str(shape.get("kind", "circle"))

    if kind == "ellipse":
        e = normalize_ellipse({
            "x": float(shape.get("x", 0.0)),
            "y": float(shape.get("y", 0.0)),
            "rx": float(shape.get("rx", shape.get("r", 0.16))),
            "ry": float(shape.get("ry", shape.get("r", 0.12))),
        })
        return {"kind": "ellipse", **e}

    c = normalize_circle({
        "x": float(shape.get("x", 0.0)),
        "y": float(shape.get("y", 0.0)),
        "r": float(shape.get("r", 0.12)),
    })
    return {"kind": "circle", **c}


def default_shapes() -> list[list[Shape]]:
    shapes: list[list[Shape]] = []
    for template in DEFAULT_TEMPLATES:
        row: list[Shape] = []
        for circle in template:
            norm = normalize_circle(circle)
            row.append({"kind": "circle", **norm})
        shapes.append(row)
    return shapes


def ellipse_to_circles(shape: Shape) -> list[dict[str, float]]:
    x = float(shape.get("x", 0.0))
    y = float(shape.get("y", 0.0))
    rx = clamp(float(shape.get("rx", 0.12)), MIN_RADIUS, MAX_RADIUS)
    ry = clamp(float(shape.get("ry", 0.12)), MIN_RADIUS, MAX_RADIUS)

    if abs(rx - ry) < 1e-6:
        return [normalize_circle({"x": x, "y": y, "r": rx})]

    major_is_x = rx >= ry
    major = rx if major_is_x else ry
    minor = ry if major_is_x else rx

    ratio = major / max(minor, 1e-6)
    count = int(clamp(round(4 + ratio * 2.2), 3, 13))
    if count % 2 == 0:
        count += 1

    span = max(0.0, major - minor)

    circles: list[dict[str, float]] = []
    for i in range(count):
        t = 0.0 if count == 1 else (-span + (2.0 * span) * (i / (count - 1)))

        factor = 1.0 - (t * t) / (major * major)
        local_minor = minor * math.sqrt(max(0.0, factor))
        r = clamp(local_minor, MIN_RADIUS, MAX_RADIUS)

        cx = x + t if major_is_x else x
        cy = y if major_is_x else y + t

        circles.append(normalize_circle({"x": cx, "y": cy, "r": r}))

    return circles


def shape_to_circles(shape: Shape) -> list[dict[str, float]]:
    kind = str(shape.get("kind", "circle"))
    if kind == "ellipse":
        return ellipse_to_circles(shape)

    return [normalize_circle({
        "x": float(shape.get("x", 0.0)),
        "y": float(shape.get("y", 0.0)),
        "r": float(shape.get("r", 0.12)),
    })]


class HitboxEditorApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Local Hitbox Editor")

        self.shapes = default_shapes()
        self.expansions = list(DEFAULT_EXPANSIONS)

        self.current = 0
        self.selected = -1

        self.dragging = False
        self.drag_mode = "move"
        self.drag_offset_x = 0.0
        self.drag_offset_y = 0.0

        self.images_raw: list[tk.PhotoImage | None] = []
        self.images_fit: list[tk.PhotoImage | None] = []
        self.image_half_sizes: list[float] = []
        self._load_images()

        self.status_var = tk.StringVar(value="Ready")
        self.fruit_var = tk.StringVar()
        self.selection_var = tk.StringVar()
        self.expansion_var = tk.DoubleVar(value=self.expansions[self.current])
        self.add_kind_var = tk.StringVar(value="circle")

        self._build_ui()
        self._bind_events()
        self._refresh_ui()

    def _build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=10)
        outer.pack(fill="both", expand=True)

        top = ttk.Frame(outer)
        top.pack(fill="x")

        ttk.Button(top, text="Prev Fruit", command=lambda: self.change_fruit(-1)).pack(side="left")
        ttk.Button(top, text="Next Fruit", command=lambda: self.change_fruit(1)).pack(side="left", padx=(8, 0))

        ttk.Label(top, textvariable=self.fruit_var, font=("Segoe UI", 11, "bold")).pack(side="left", padx=12)

        add_frame = ttk.Frame(top)
        add_frame.pack(side="right")

        ttk.Radiobutton(add_frame, text="Circle", variable=self.add_kind_var, value="circle").pack(side="left")
        ttk.Radiobutton(add_frame, text="Ellipse", variable=self.add_kind_var, value="ellipse").pack(side="left", padx=(6, 0))
        ttk.Button(add_frame, text="Add Center", command=self.add_shape_center).pack(side="left", padx=(10, 0))
        ttk.Button(add_frame, text="Delete Selected", command=self.remove_selected).pack(side="left", padx=(8, 0))

        body = ttk.Frame(outer)
        body.pack(fill="both", expand=True, pady=(10, 0))

        self.canvas = tk.Canvas(
            body,
            width=CANVAS_W,
            height=CANVAS_H,
            bg="#1f1f1f",
            highlightthickness=1,
            highlightbackground="#666",
            cursor="crosshair",
        )
        self.canvas.pack(side="left", fill="both", expand=True)

        side = ttk.Frame(body, padding=(10, 0, 0, 0))
        side.pack(side="left", fill="y")

        ttk.Label(side, text="Expansion", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.expansion_scale = ttk.Scale(
            side,
            orient="horizontal",
            length=240,
            from_=MIN_EXPANSION,
            to=MAX_EXPANSION,
            variable=self.expansion_var,
            command=self.on_expansion_changed,
        )
        self.expansion_scale.pack(anchor="w", pady=(4, 8))

        self.expansion_value_label = ttk.Label(side, text="")
        self.expansion_value_label.pack(anchor="w", pady=(0, 12))

        ttk.Label(side, textvariable=self.selection_var, justify="left", wraplength=260).pack(anchor="w", pady=(0, 12))

        ttk.Separator(side, orient="horizontal").pack(fill="x", pady=8)

        ttk.Button(side, text="Load JSON", command=self.load_json).pack(fill="x", pady=2)
        ttk.Button(side, text="Save JSON", command=self.save_json).pack(fill="x", pady=2)
        ttk.Button(side, text="Reset Current Fruit", command=self.reset_current).pack(fill="x", pady=2)
        ttk.Button(side, text="Reset All", command=self.reset_all).pack(fill="x", pady=2)

        help_text = (
            "Controls\n"
            "- Left click shape: select / move\n"
            "- Left click empty: add current mode\n"
            "- Circle handle (right dot): resize radius\n"
            "- Ellipse handles (right/bottom dots): resize rx/ry\n"
            "- Right click: remove shape\n"
            "- Mouse wheel: selected size +/-\n"
            "- [ ] : previous/next fruit\n"
            "\n"
            "Note: ellipse is exported as multiple circles\n"
            "for in-game compatibility."
        )
        ttk.Label(side, text=help_text, justify="left", wraplength=260).pack(anchor="w", pady=(12, 0))

        status = ttk.Label(outer, textvariable=self.status_var, relief="sunken", anchor="w", padding=(6, 4))
        status.pack(fill="x", pady=(8, 0))

    def _bind_events(self) -> None:
        self.canvas.bind("<Button-1>", self.on_left_down)
        self.canvas.bind("<B1-Motion>", self.on_left_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_left_up)
        self.canvas.bind("<Button-3>", self.on_right_down)
        self.canvas.bind("<MouseWheel>", self.on_mousewheel)
        self.canvas.bind("<Button-4>", lambda _e: self.on_mousewheel_delta(1))
        self.canvas.bind("<Button-5>", lambda _e: self.on_mousewheel_delta(-1))

        self.root.bind("<KeyPress-bracketleft>", lambda _e: self.change_fruit(-1))
        self.root.bind("<KeyPress-bracketright>", lambda _e: self.change_fruit(1))
        self.root.bind("<Delete>", lambda _e: self.remove_selected())
        self.root.bind("<BackSpace>", lambda _e: self.remove_selected())
        self.root.bind("<Control-s>", lambda _e: self.save_json())
        self.root.bind("<Control-o>", lambda _e: self.load_json())

    def _load_images(self) -> None:
        for i in range(len(FRUIT_NAMES)):
            path = ASSET_DIR / f"{i + 1}.png"
            if not path.exists():
                self.images_raw.append(None)
                self.images_fit.append(None)
                self.image_half_sizes.append(SPRITE_HALF)
                continue

            try:
                image = tk.PhotoImage(file=str(path))
            except tk.TclError:
                self.images_raw.append(None)
                self.images_fit.append(None)
                self.image_half_sizes.append(SPRITE_HALF)
                continue

            fit_image = self._fit_image(image, int(SPRITE_HALF * 2))
            half_size = min(fit_image.width(), fit_image.height()) / 2

            self.images_raw.append(image)
            self.images_fit.append(fit_image)
            self.image_half_sizes.append(half_size if half_size > 0 else SPRITE_HALF)

    @staticmethod
    def _fit_image(image: tk.PhotoImage, max_side: int) -> tk.PhotoImage:
        w = image.width()
        h = image.height()
        if w <= 0 or h <= 0:
            return image

        scale = max(w / max_side, h / max_side)
        if scale <= 1:
            return image

        factor = max(1, int(math.ceil(scale)))
        return image.subsample(factor, factor)

    def get_display_sprite_half(self) -> float:
        if 0 <= self.current < len(self.image_half_sizes):
            half = self.image_half_sizes[self.current]
            if half > 0:
                return half
        return SPRITE_HALF

    def get_scale(self) -> float:
        return self.get_display_sprite_half() * GLOBAL_HITBOX_EXPANSION * self.expansions[self.current]

    def get_shapes(self) -> list[Shape]:
        return self.shapes[self.current]

    def get_selected_shape(self) -> Shape | None:
        shapes = self.get_shapes()
        if self.selected < 0 or self.selected >= len(shapes):
            return None
        return shapes[self.selected]

    def change_fruit(self, delta: int) -> None:
        count = len(FRUIT_NAMES)
        self.current = (self.current + delta + count) % count
        self.selected = -1
        self.expansion_var.set(self.expansions[self.current])
        self._refresh_ui()

    def add_shape_center(self) -> None:
        self.add_shape(CENTER_X, CENTER_Y)

    def add_shape(self, x: float, y: float, kind: str | None = None) -> None:
        shape_kind = kind or self.add_kind_var.get() or "circle"
        scale = self.get_scale()

        if shape_kind == "ellipse":
            shape = normalize_shape(
                {
                    "kind": "ellipse",
                    "x": (x - CENTER_X) / scale,
                    "y": (y - CENTER_Y) / scale,
                    "rx": 0.18,
                    "ry": 0.12,
                }
            )
        else:
            shape = normalize_shape(
                {
                    "kind": "circle",
                    "x": (x - CENTER_X) / scale,
                    "y": (y - CENTER_Y) / scale,
                    "r": 0.12,
                }
            )

        self.get_shapes().append(shape)
        self.selected = len(self.get_shapes()) - 1
        self._set_status(f"Added {shape_kind}")
        self._refresh_ui()

    def remove_selected(self) -> None:
        shapes = self.get_shapes()
        if self.selected < 0 or self.selected >= len(shapes):
            return

        shapes.pop(self.selected)
        if self.selected >= len(shapes):
            self.selected = len(shapes) - 1
        self._set_status("Shape removed")
        self._refresh_ui()

    def on_expansion_changed(self, _value: str) -> None:
        self.expansions[self.current] = clamp(float(self.expansion_var.get()), MIN_EXPANSION, MAX_EXPANSION)
        self._refresh_ui(redraw_only=True)

    def on_left_down(self, event: tk.Event) -> None:
        pick = self.pick_shape(event.x, event.y)

        if pick is None:
            self.add_shape(event.x, event.y)
            pick = self.pick_shape(event.x, event.y)
            if pick is None:
                return

        self.selected = int(pick["index"])
        self.dragging = True
        self.drag_mode = str(pick["mode"])
        self.drag_offset_x = float(event.x) - float(pick["cx"])
        self.drag_offset_y = float(event.y) - float(pick["cy"])
        self._refresh_ui(redraw_only=True)

    def on_left_drag(self, event: tk.Event) -> None:
        if not self.dragging:
            return

        shape = self.get_selected_shape()
        if shape is None:
            return

        scale = self.get_scale()
        cx, cy, sx, sy = self.shape_metrics(shape)

        mode = self.drag_mode
        if mode == "resize_circle":
            dist = math.hypot(float(event.x) - cx, float(event.y) - cy)
            shape["r"] = clamp(dist / scale, MIN_RADIUS, MAX_RADIUS)
        elif mode == "resize_x":
            rx = abs(float(event.x) - cx) / scale
            shape["rx"] = clamp(rx, MIN_RADIUS, MAX_RADIUS)
        elif mode == "resize_y":
            ry = abs(float(event.y) - cy) / scale
            shape["ry"] = clamp(ry, MIN_RADIUS, MAX_RADIUS)
        else:
            shape["x"] = clamp((float(event.x) - CENTER_X - self.drag_offset_x) / scale, MIN_COORD, MAX_COORD)
            shape["y"] = clamp((float(event.y) - CENTER_Y - self.drag_offset_y) / scale, MIN_COORD, MAX_COORD)

        # Keep dict normalized.
        normalized = normalize_shape(shape)
        shape.clear()
        shape.update(normalized)

        # Touch metrics so linters don't complain.
        _ = (sx, sy)

        self._refresh_ui(redraw_only=True)

    def on_left_up(self, _event: tk.Event) -> None:
        self.dragging = False

    def on_right_down(self, event: tk.Event) -> None:
        pick = self.pick_shape(event.x, event.y)
        if pick is None:
            return

        self.selected = int(pick["index"])
        self.remove_selected()

    def on_mousewheel(self, event: tk.Event) -> None:
        direction = 1 if event.delta > 0 else -1
        self.on_mousewheel_delta(direction)

    def on_mousewheel_delta(self, direction: int) -> None:
        shape = self.get_selected_shape()
        if shape is None:
            return

        step = 0.01 if direction > 0 else -0.01

        if str(shape.get("kind", "circle")) == "ellipse":
            shape["rx"] = clamp(float(shape.get("rx", 0.12)) + step, MIN_RADIUS, MAX_RADIUS)
            shape["ry"] = clamp(float(shape.get("ry", 0.12)) + step, MIN_RADIUS, MAX_RADIUS)
        else:
            shape["r"] = clamp(float(shape.get("r", 0.12)) + step, MIN_RADIUS, MAX_RADIUS)

        normalized = normalize_shape(shape)
        shape.clear()
        shape.update(normalized)
        self._refresh_ui(redraw_only=True)

    def shape_metrics(self, shape: Shape) -> tuple[float, float, float, float]:
        scale = self.get_scale()
        cx = CENTER_X + float(shape.get("x", 0.0)) * scale
        cy = CENTER_Y + float(shape.get("y", 0.0)) * scale

        if str(shape.get("kind", "circle")) == "ellipse":
            sx = float(shape.get("rx", 0.12)) * scale
            sy = float(shape.get("ry", 0.12)) * scale
        else:
            r = float(shape.get("r", 0.12)) * scale
            sx = r
            sy = r

        return cx, cy, sx, sy

    def pick_shape(self, x: float, y: float) -> dict[str, float | int | str] | None:
        shapes = self.get_shapes()
        best = None

        for i in range(len(shapes) - 1, -1, -1):
            shape = shapes[i]
            kind = str(shape.get("kind", "circle"))
            cx, cy, sx, sy = self.shape_metrics(shape)

            if kind == "ellipse":
                hx_dist = math.hypot(x - (cx + sx), y - cy)
                hy_dist = math.hypot(x - cx, y - (cy + sy))

                if hx_dist <= HANDLE_R + 4:
                    return {"index": i, "mode": "resize_x", "cx": cx, "cy": cy}
                if hy_dist <= HANDLE_R + 4:
                    return {"index": i, "mode": "resize_y", "cx": cx, "cy": cy}

                nx = (x - cx) / max(sx + 6, 1e-6)
                ny = (y - cy) / max(sy + 6, 1e-6)
                inside = (nx * nx + ny * ny) <= 1.0
                if inside:
                    dist = math.hypot(x - cx, y - cy)
                    if best is None or dist < float(best["dist"]):
                        best = {"index": i, "mode": "move", "cx": cx, "cy": cy, "dist": dist}
            else:
                handle_dist = math.hypot(x - (cx + sx), y - cy)
                if handle_dist <= HANDLE_R + 4:
                    return {"index": i, "mode": "resize_circle", "cx": cx, "cy": cy}

                dist = math.hypot(x - cx, y - cy)
                if dist <= sx + 6:
                    if best is None or dist < float(best["dist"]):
                        best = {"index": i, "mode": "move", "cx": cx, "cy": cy, "dist": dist}

        return best

    def payload(self) -> dict[str, object]:
        templates: list[list[dict[str, float]]] = []
        editor_shapes: list[list[Shape]] = []

        for fruit_shapes in self.shapes:
            normalized_shapes: list[Shape] = []
            circles: list[dict[str, float]] = []

            for shape in fruit_shapes:
                s = normalize_shape(shape)
                normalized_shapes.append(dict(s))
                circles.extend(shape_to_circles(s))

            if not circles:
                circles = [normalize_circle({"x": 0.0, "y": 0.0, "r": 0.12})]

            templates.append(circles)
            editor_shapes.append(normalized_shapes)

        expansions = [round(clamp(float(value), MIN_EXPANSION, MAX_EXPANSION), 4) for value in self.expansions]

        return {
            "templates": templates,
            "expansions": expansions,
            "editor_shapes": editor_shapes,
            "editor_meta": {
                "tool": "hitbox_editor_local.py",
                "version": EDITOR_VERSION,
                "scale_mode": EDITOR_SCALE_MODE,
            },
        }

    def apply_payload(self, data: dict[str, object]) -> None:
        expansions = data.get("expansions")
        templates = data.get("templates")
        editor_shapes = data.get("editor_shapes")

        if not isinstance(expansions, list) or len(expansions) != len(FRUIT_NAMES):
            raise ValueError("expansions length mismatch")

        next_expansions: list[float] = []
        for value in expansions:
            try:
                number = float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError("expansion must be numeric") from exc
            next_expansions.append(clamp(number, MIN_EXPANSION, MAX_EXPANSION))

        next_shapes: list[list[Shape]] = []

        # Preferred: restore full editor shapes (supports ellipse persistence).
        if isinstance(editor_shapes, list) and len(editor_shapes) == len(FRUIT_NAMES):
            for row in editor_shapes:
                if not isinstance(row, list) or len(row) == 0:
                    raise ValueError("each editor_shapes row must contain at least one shape")

                normalized_row: list[Shape] = []
                for raw in row:
                    if not isinstance(raw, dict):
                        continue
                    normalized_row.append(normalize_shape(raw))

                if not normalized_row:
                    raise ValueError("each editor_shapes row must contain valid shapes")

                next_shapes.append(normalized_row)
        else:
            # Fallback: load circles from templates only.
            if not isinstance(templates, list) or len(templates) != len(FRUIT_NAMES):
                raise ValueError("templates length mismatch")

            for row in templates:
                if not isinstance(row, list) or len(row) == 0:
                    raise ValueError("each template row must contain at least one circle")

                shapes_row: list[Shape] = []
                for raw in row:
                    if not isinstance(raw, dict):
                        continue
                    c = normalize_circle(raw)
                    shapes_row.append({"kind": "circle", **c})

                if not shapes_row:
                    raise ValueError("each template row must contain valid circles")

                next_shapes.append(shapes_row)

        self.shapes = next_shapes
        self.expansions = next_expansions
        self.selected = -1
        self.expansion_var.set(self.expansions[self.current])

    def save_json(self) -> None:
        path = filedialog.asksaveasfilename(
            title="Save hitbox config",
            initialfile=DEFAULT_SAVE_PATH.name,
            initialdir=str(DEFAULT_SAVE_PATH.parent),
            defaultextension=".json",
            filetypes=[("JSON", "*.json"), ("All files", "*.*")],
        )
        if not path:
            return

        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.payload(), f, ensure_ascii=False, indent=2)
            f.write("\n")

        self._set_status(f"Saved: {path}")

    def load_json(self) -> None:
        path = filedialog.askopenfilename(
            title="Load hitbox config",
            initialdir=str(DEFAULT_SAVE_PATH.parent),
            filetypes=[("JSON", "*.json"), ("All files", "*.*")],
        )
        if not path:
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                raise ValueError("root must be a JSON object")
            self.apply_payload(data)
        except Exception as exc:  # pylint: disable=broad-except
            messagebox.showerror("Load Failed", f"Could not load file:\n{exc}")
            self._set_status("Load failed")
            return

        self._set_status(f"Loaded: {path}")
        self._refresh_ui()

    def reset_current(self) -> None:
        self.shapes[self.current] = default_shapes()[self.current]
        self.expansions[self.current] = DEFAULT_EXPANSIONS[self.current]
        self.selected = -1
        self.expansion_var.set(self.expansions[self.current])
        self._set_status(f"Reset current fruit: {FRUIT_NAMES[self.current]}")
        self._refresh_ui()

    def reset_all(self) -> None:
        if not messagebox.askyesno("Reset All", "Reset all fruits to default hitboxes?"):
            return

        self.shapes = default_shapes()
        self.expansions = list(DEFAULT_EXPANSIONS)
        self.selected = -1
        self.expansion_var.set(self.expansions[self.current])
        self._set_status("Reset all fruits to defaults")
        self._refresh_ui()

    def _set_status(self, text: str) -> None:
        self.status_var.set(text)

    def _refresh_ui(self, redraw_only: bool = False) -> None:
        self.expansions[self.current] = clamp(float(self.expansion_var.get()), MIN_EXPANSION, MAX_EXPANSION)

        if not redraw_only:
            self.fruit_var.set(f"{self.current + 1} / {len(FRUIT_NAMES)}  {FRUIT_NAMES[self.current]}")

        self.expansion_value_label.config(
            text=f"per-fruit: {self.expansions[self.current]:.2f}x\n"
            f"effective: {(self.expansions[self.current] * GLOBAL_HITBOX_EXPANSION):.3f}x"
        )

        shape = self.get_selected_shape()
        if shape is not None:
            kind = str(shape.get("kind", "circle"))
            if kind == "ellipse":
                self.selection_var.set(
                    f"Selected: #{self.selected + 1} / {len(self.get_shapes())} (ellipse)\n"
                    f"x={float(shape['x']):.3f}, y={float(shape['y']):.3f}\n"
                    f"rx={float(shape['rx']):.3f}, ry={float(shape['ry']):.3f}"
                )
            else:
                self.selection_var.set(
                    f"Selected: #{self.selected + 1} / {len(self.get_shapes())} (circle)\n"
                    f"x={float(shape['x']):.3f}, y={float(shape['y']):.3f}, r={float(shape['r']):.3f}"
                )
        else:
            self.selection_var.set(f"Selected: none\nTotal shapes: {len(self.get_shapes())}")

        self.redraw_canvas()

    def redraw_canvas(self) -> None:
        self.canvas.delete("all")

        self.canvas.create_line(CENTER_X, 0, CENTER_X, CANVAS_H, fill="#3c3c3c")
        self.canvas.create_line(0, CENTER_Y, CANVAS_W, CENTER_Y, fill="#3c3c3c")

        image = self.images_fit[self.current]
        sprite_half = self.get_display_sprite_half()
        if image is not None:
            self.canvas.create_image(CENTER_X, CENTER_Y, image=image)
        else:
            self.canvas.create_oval(
                CENTER_X - sprite_half,
                CENTER_Y - sprite_half,
                CENTER_X + sprite_half,
                CENTER_Y + sprite_half,
                fill="#2b2b2b",
                outline="#555",
                width=2,
            )
            self.canvas.create_text(CENTER_X, CENTER_Y, text="No asset image", fill="#aaa")

        shapes = self.get_shapes()
        for i, shape in enumerate(shapes):
            kind = str(shape.get("kind", "circle"))
            cx, cy, sx, sy = self.shape_metrics(shape)
            selected = i == self.selected

            outline = "#a7ffec" if selected else "#ffdcb0"
            width = 2 if selected else 1

            self.canvas.create_oval(
                cx - sx,
                cy - sy,
                cx + sx,
                cy + sy,
                fill="",
                outline=outline,
                width=width,
            )

            if kind == "ellipse":
                self.canvas.create_oval(
                    cx + sx - HANDLE_R,
                    cy - HANDLE_R,
                    cx + sx + HANDLE_R,
                    cy + HANDLE_R,
                    fill="#8effd5",
                    outline="",
                )
                self.canvas.create_oval(
                    cx - HANDLE_R,
                    cy + sy - HANDLE_R,
                    cx + HANDLE_R,
                    cy + sy + HANDLE_R,
                    fill="#a4cfff",
                    outline="",
                )
            else:
                self.canvas.create_oval(
                    cx + sx - HANDLE_R,
                    cy - HANDLE_R,
                    cx + sx + HANDLE_R,
                    cy + HANDLE_R,
                    fill="#8effd5",
                    outline="",
                )

            kind_mark = "E" if kind == "ellipse" else "C"
            self.canvas.create_text(cx, cy, text=f"{i + 1}{kind_mark}", fill=outline, font=("Segoe UI", 9, "bold"))


def main() -> None:
    root = tk.Tk()
    root.geometry("1120x730")
    app = HitboxEditorApp(root)
    # Keep a reference so Tk images are not garbage-collected.
    root._app = app  # type: ignore[attr-defined]
    root.mainloop()


if __name__ == "__main__":
    main()














