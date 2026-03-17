# Suika game

A browser-playable Suika-style merge game with custom fruit sprites, tuned collision physics, and a local Python hitbox editor workflow.

<p align="center">
  <a href="https://kookjd7759.github.io/suika-game/">
    <img src="https://img.shields.io/badge/GAME_START-Play_Now-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Game Start Badge" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JavaScript-0f172a?style=flat-square" alt="Stack" />
  <img src="https://img.shields.io/badge/Hitbox_Editor-Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Hitbox Editor Python" />
  <a href="https://kookjd7759.github.io/suika-game/">
    <img src="https://img.shields.io/badge/GitHub_Pages-Live-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub Pages Live" />
  </a>
</p>

## Quick Start

### Online Demo
- URL: https://kookjd7759.github.io/suika-game/

### Run Locally
This is a static project (`index.html`, `styles.css`, `game.js`).

1. From the project root, run:
```bash
python -m http.server 8000
```
2. Open:
- http://localhost:8000

## Controls

| Action | Key / Input |
|---|---|
| Aim | Mouse / Touch |
| Drop fruit | Click / `Space` / `Enter` |
| Move left/right | `Left Arrow` / `Right Arrow` |
| Restart | `R` |

## Gameplay Tuning (Snapshot)
Source of truth: `game.js`

### Core
- `GAME_SPEED = 1.3`
- `GAME_OVER_SECONDS = 2.5`

### Danger Timer
- If the danger condition clears, the timer resets to `0` immediately.
- The danger line turns red after `0.5s` in danger (`DANGER_LINE_RED_DELAY_SECONDS = 0.5`).

### Physics
- `AIR_DAMPING = 0.9995`
- `FRUIT_STATIC_FRICTION = 0.68`
- `FRUIT_DYNAMIC_FRICTION = 0.52`
- `WORLD_STATIC_FRICTION = 0.62`
- `WORLD_DYNAMIC_FRICTION = 0.46`
- `FRUIT_RESTITUTION = 0.11`
- `WORLD_RESTITUTION = 0.06`

## Fruit Radius Table
Source of truth: `const FRUITS` in `game.js`

| # | Fruit | Radius |
|---|---|---:|
| 1 | Cherry | 16 |
| 2 | Strawberry | 22 |
| 3 | Grape | 29 |
| 4 | Hallabong | 38 |
| 5 | Persimmon | 50 |
| 6 | Apple | 55 |
| 7 | Pear | 88 |
| 8 | Peach | 86 |
| 9 | Pineapple | 124 |
| 10 | Melon | 128 |
| 11 | Watermelon | 153 |

Note: Runtime collision size is also affected by `FRUIT_COLLISION_SCALES`, render scale, and hitbox expansion constants.

## Hitbox Editing Workflow (Local Python)
Tools are in `hitbox-editor/`.

### 1) Open the local GUI editor
```bash
python hitbox-editor/hitbox_editor_local.py
```

Features:
- Circle and ellipse editing
- Transparent hitbox outlines (image behind remains visible)
- Save JSON to `assets/hitbox_config.json` (or a custom path)

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

## UI Notes (Current)
- Next fruit display uses a transparent background (no inner circle plate).
- Fruit order list is visually grouped with line separators.
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
- `game.js`: physics, rendering, gameplay logic, and hitbox runtime
- `assets/`: fruit images and hitbox JSON
- `hitbox-editor/`: local Python editor and apply script

