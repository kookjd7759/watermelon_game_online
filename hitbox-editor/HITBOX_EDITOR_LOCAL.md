# Local Hitbox Editor (Python)

## 1) Run editor locally

```bash
python hitbox_editor_local.py
```

Windows:

```bat
run_hitbox_editor.bat
```

## 2) Edit and save JSON

- Circle and ellipse editing are supported.
- Hitbox outlines are transparent (no fill) so the image behind stays visible.
- Ellipses are stored in `editor_shapes` and converted to circles for runtime.

Saved JSON shape:

```json
{
  "templates": [[{"x": 0, "y": 0, "r": 0.5}]],
  "expansions": [1.2],
  "editor_shapes": [[{"kind": "ellipse", "x": 0, "y": 0, "rx": 0.3, "ry": 0.2}]],
  "editor_meta": {
    "tool": "hitbox_editor_local.py",
    "version": 2,
    "scale_mode": "display-half-v2"
  }
}
```

## 3) Apply saved config to game.js

```bash
python apply_hitbox_config.py ..\\assets\\hitbox_config.json
```

Or run without args (uses `assets/hitbox_config.json`):

```bash
python apply_hitbox_config.py
```

This patches:

- `FRUIT_MANUAL_HITBOX_TEMPLATES`
- `FRUIT_HITBOX_EXPANSION`

## Scale correction behavior

- `editor_meta.scale_mode == "display-half-v2"`: no legacy correction.
- Missing `editor_meta.scale_mode`: legacy correction is applied automatically for old configs.

This prevents the "applied hitbox looks slightly smaller" mismatch from old editor output.