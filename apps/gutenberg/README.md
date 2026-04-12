# Gutenberg editor — wpIdentity integration

A fully functional browser-based Gutenberg editor plugged into WordPress via [wpIdentity](https://github.com/scripting/wpIdentity). Users log in with WordPress.com, write in the Gutenberg block editor, and publish to their own WordPress sites.

Current version: v0.4.10

## Live demo

[demo.gutenberg.land](https://demo.gutenberg.land/)

## What this is

A reference implementation showing how to wire the [Automattic isolated-block-editor](https://github.com/Automattic/isolated-block-editor) to WordPress publishing and user-owned storage. No build step required — everything loads from unpkg and S3.

## Docs

- [Developer guide](../../docs/developers.md) — how to adapt this pattern to your own editor
- [AI guide](../../docs/ai.md) — dense context for AI assistants working on this codebase

## Files

- `index.html` — page structure and script/style loading
- `code.js` — all app logic; search for `myWordpress` for every wpIdentity integration point
- `styles.css` — layout and editor styles
- `worknotes.md` — version history and development notes
