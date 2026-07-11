# Claude Guidelines — Dodge-Style-Game

## Game assets — copy from the studio library only

All game assets (sprites, models, audio, UI, textures) come from the studio's CC0
asset library: **[Bit-Serenity-Studios/CC0-Assets](https://github.com/Bit-Serenity-Studios/CC0-Assets)**.

- **Copy individual files** from the library into this project's asset folder — use a
  shallow/sparse clone of the library and `cp` only the specific sprites/models/sounds
  this game actually uses.
- **Never bulk-extract.** Do not copy entire top-level collections or whole packs, do not
  clone/vendor the full ~4 GB library into this repo, do not add it as a git submodule,
  and never commit asset ZIPs or archives.
- **Don't re-download from origin sites** (kenney.nl, quaternius.com, polyhaven.com,
  ambientcg.com). Take the copy from CC0-Assets so every project ships identical
  asset versions.
- **Record provenance.** In the commit that adds assets, note the library path they came
  from (e.g. `2D assets/Space Shooter Redux/PNG/playerShip1_blue.png`).
- All library assets are CC0 — no attribution required in-game.
