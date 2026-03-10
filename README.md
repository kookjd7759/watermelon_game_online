# Watermelon Game Online

A browser-playable Suika-style merge game with custom fruit sprites, tuned collision physics, and a local Python hitbox editor workflow.

## Demo
- GitHub Pages: https://kookjd7759.github.io/watermelon_game_online/

## Run Locally
This project is static (`index.html`, `styles.css`, `game.js`).

1. From the project root, run:
   ```bash
   python -m http.server 8000
   ```
2. Open:
   - http://localhost:8000

## Controls
- Move with mouse or touch
- Click / Space / Enter to drop
- Left / Right arrow to move
- `R` to restart

## Current Gameplay Tuning (snapshot)
Source of truth: `game.js`

- `GAME_SPEED = 1.3`
- `GAME_OVER_SECONDS = 3`
- Danger timer behavior:
  - If danger condition clears, timer resets to `0` immediately.
  - Danger line red effect starts after `0.5s` in danger (`DANGER_LINE_RED_DELAY_SECONDS = 0.5`).
- Physics:
  - `FLOOR_FRICTION = 0.995`
  - `SURFACE_FRICTION = 0.9960`
  - `COLLISION_FRICTION = 0.55`
  - `AIR_DAMPING = 0.9987`

## Current Fruit Radius Values
Source of truth: `const FRUITS` in `game.js`

| # | Fruit | Radius |
|---|---|---:|
| 1 | Cherry | 16 |
| 2 | Strawberry | 22 |
| 3 | Grape | 29 |
| 4 | Hallabong | 37.62 |
| 5 | Persimmon | 49.665 |
| 6 | Apple | 65 |
| 7 | Pear | 98.252 |
| 8 | Peach | 96.48 |
| 9 | Pineapple | 130.9 |
| 10 | Melon | 167.2 |
| 11 | Watermelon | 200 |

Note: Runtime collision size is affected by additional factors (`FRUIT_COLLISION_SCALES`, render scale, and hitbox expansion constants).

## Hitbox Editing Workflow (Local Python)
Tools are in `hitbox-editor/`.

### 1) Open local GUI editor
```bash
python hitbox-editor/hitbox_editor_local.py
```

Features:
- Circle and ellipse editing
- Transparent hitbox outlines (image behind remains visible)
- Save JSON to `assets/hitbox_config.json` (or custom path)

### 2) Apply JSON to `game.js`
```bash
python hitbox-editor/apply_hitbox_config.py
```
Or:
```bash
python hitbox-editor/apply_hitbox_config.py assets/hitbox_config.json
```

This patches:
- `FRUIT_MANUAL_HITBOX_TEMPLATES`
- `FRUIT_HITBOX_EXPANSION`

### 3) VS Code launch shortcuts
Configured in `.vscode/launch.json`:
- `Hitbox Editor (Local GUI)`
- `Apply Hitbox Config (assets/hitbox_config.json)`

### 4) Important runtime note
`game.js` keeps local override disabled by default:
- `ENABLE_LOCAL_HITBOX_OVERRIDE = false`

This prevents stale `localStorage` editor data from overriding JSON-applied hitboxes.

## UI Notes (current)
- Next fruit display uses transparent background (no inner circle plate).
- Fruit Order list is visually grouped with line separators.
- Bottom board frame and floor shading were adjusted for a smoother board edge.

## Deploy (GitHub Pages)
1. Repository `Settings`
2. `Pages`
3. `Deploy from a branch`
4. Branch: `main`, Folder: `/root`
5. Save and wait for the published URL

## Main Files
- `index.html`: layout and HUD
- `styles.css`: UI theme and responsive styling
- `game.js`: physics, rendering, gameplay logic, hitbox runtime
- `assets/`: fruit images and hitbox JSON
- `hitbox-editor/`: local Python editor and apply script