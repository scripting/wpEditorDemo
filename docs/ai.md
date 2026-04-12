# AI guide: wpEditorDemo

This document is for an AI assistant helping a developer adapt an existing editor to the wpIdentity ecosystem. Read this at session start before writing any code.

## What you are helping build

The developer wants to plug their editor into wpIdentity — a Node.js backend that provides WordPress.com OAuth identity, a simplified WordPress API, and MySQL-backed user storage. The result: users log in with WordPress.com, write in the developer's editor, and publish to their own WordPress sites. Users own their files. Editors are interchangeable.

This repo contains two reference implementations:

- **Root app** (`index.html` / `code.js`) — a plain textarea editor. The simplest possible integration. Start here.
- **Gutenberg app** (`apps/gutenberg/`) — the Gutenberg block editor. A more complex integration showing how a rich editor plugs in. Current version: v0.4.8.

## The server

All apps point at `https://wordland.dev/` — a shared wpIdentity instance. Developers do not run their own server. The shared server is what makes cross-editor interop possible.

## The browser API

Loaded from: `//s3.amazonaws.com/scripting.com/code/wpidentity/client/api2.js`

Instantiate: `myWordpress = new wordpress ({ serverAddress: "https://wordland.dev/", urlChatLogSocket: "wss://wordland.dev/", flMarkdownProcess: false })`

All calls follow Node-style `callback (err, data)` except where noted.

### Core calls used in both apps

```
myWordpress.startup (callback)
  — boot point; call on page load; calls back immediately whether or not signed in

myWordpress.userIsSignedIn ()
  — synchronous boolean; check after startup

myWordpress.connectWithWordpress ()
  — redirects to WordPress.com OAuth

myWordpress.logOffWordpress ()
  — clears localStorage, reloads page

myWordpress.getUserInfoSync ()
  — synchronous; returns { idUser, username, name, ... } from cache

myWordpress.getSiteList ()
  — synchronous; returns cached array of { idSite, name, urlSite, ... }

myWordpress.readUserDataFile (relpath, flPrivate, callback, options)
  — options: { idsite, idpost } to key file to a specific post
  — data.filecontents is the raw string; JSON.parse it yourself

myWordpress.writeUserDataFile (relpath, filedata, type, flPrivate, callback, options)
  — options: { idsite, idpost, iddraft }
  — returns data.id (draft id), data.whenCreated, data.whenUpdated

myWordpress.writeUniqueFile (relpath, filedata, type, flPrivate, callback)
  — upserts by relpath; used for prefs (no post key needed)

myWordpress.readDraft (id, callback)
  — data.filecontents is the raw string; JSON.parse it yourself

myWordpress.addPost (idsite, thepost, callback)
  — thepost: { title, content, categories, contentType, idDraft, ... }
  — returns { idPost, idSite, url, whenCreated, whenPublished, author, ... }

myWordpress.updatePost (idsite, idpost, thepost, callback)
  — same thepost shape; returns updated post object

myWordpress.getSourceFiles (idSite, idPost, callback)
  — returns array of { relpath, filecontents, type, whenCreated, whenUpdated }
  — only returns source.* files; empty array is valid (means only draft.json exists)

myWordpress.deleteSourceFiles (idSite, idPost, paths, callback)
  — paths: array of relpaths to delete; if undefined, deletes all source.* for that post
  — returns affectedRows
```

**Important:** `ctSaves` is managed entirely by the server — never set it client-side. `hitCounter()` is called at startup regardless of whether the user is signed in — a hit is a hit.

## The storage key design

`wpstorage` table key: `(username, relpath, flprivate, idsite, idpost)`

This means multiple files can share the same `relpath` as long as `(idsite, idpost)` differs. Each editor attaches its own source file to a published post:

- `draft.json` — universal; stores draft metadata + markdown content
- `source.gutenberg` — Gutenberg block markup as JSON; saved on autosave and publish
- `source.opml` — outline editor source (future)
- `source.svg` — SVG editor source (future)

When helping a developer implement a new editor, instruct them to:
1. Name their source file `source.<format>`
2. Save it as JSON: `{ content: "...", contentType: "yourformat" }`
3. Save it on every autosave and publish, keyed to `(idsite, idpost)`
4. Read it first on re-open; fall back to `draft.json` content

## Two versions of the draft object

There are two distinct representations of a draft. This is critical to get right.

**Runtime draft** (`globals.theDraft`) — lives in memory while the app is running:

```javascript
{
	title: "",
	content: "",       // block markup at runtime (Gutenberg) or markdown (textarea)
	categories: [],
	idPost: undefined, // set after first publish
	idSite: undefined, // set after first publish
	idDraft: undefined,// assigned by server on first save
	flEnablePublish: false, // runtime gate for publish button
	author: { id, username, name },
	whenCreated: Date,
	whenUpdated: Date,
	whenPublished: Date,
	url: undefined
	}
```

**Saveable draft** — what actually gets written to `draft.json`. Built by `buildSaveableDraft()`:

```javascript
{
	title: "",
	content: "",         // always markdown for cross-editor interop
	contentType: "markdown",
	categories: [],
	author: { id, username, name },
	whenCreated: Date,
	idDraft: ...,        // only if set
	idPost: ...,         // only if set
	idSite: ...,         // only if set
	whenPublished: Date, // only if set
	url: ""              // only if set
	}
```

Runtime fields (`flEnablePublish`, etc.) are never saved to disk. `ctSaves` is managed by the server.

## Conflict detection (both apps, v0.4.8)

At open time, if a draft has `idSite` + `idPost`, call `getSourceFiles` to check for foreign source files. If found, warn the user with `window.confirm`:

`"There's a '[format]' version of this file which you will lose if you edit this file."`

- **OK:** delete the foreign files, proceed
- **Cancel:** open an empty draft

**Gutenberg app** — deletes any `source.*` that is not `source.gutenberg`.
**Base textarea app** — deletes all `source.*` files (it has no source format of its own).

## Gutenberg-specific notes

The Gutenberg app uses [Automattic/isolated-block-editor](https://github.com/Automattic/isolated-block-editor) v2.30.0 via unpkg — no build step required. Also uses Turndown (HTML→Markdown) via unpkg.

`wp.attachEditor (textarea)` transforms a hidden textarea into Gutenberg. The textarea value is polled every second to detect changes.

Gutenberg outputs HTML with block grammar comments:
```html
<!-- wp:paragraph -->
<p>Hello</p>
<!-- /wp:paragraph -->
```

This block markup is:
- Sent as `content` to `addPost` / `updatePost` — WordPress renders it natively (`flMarkdownProcess: false`)
- Saved as-is in `source.gutenberg` (as JSON) on every autosave and publish
- Converted to markdown via `blocksToMarkdown()` before saving to `draft.json`

The draft viewer (second box on screen) shows the full draft metadata with block markup as `content` and `contentType: "gutenberg"` — so developers can see exactly what's stored.

`buildSaveableDraft()` is the single source of truth for disk writes. The draft viewer calls it, then overwrites `content` and `contentType` for display purposes only — nothing extra is written to disk.

## Known issues as of v0.4.8

1. **Editor height** — `isolated-block-editor` sizes itself via internal React/JS, not CSS. Workaround: `max-height: 300px; overflow-y: auto`. (Gutenberg app only, deferred)
2. **cmd-Z undo** — keyboard undo not working in Gutenberg; toolbar arrows work. (Gutenberg app only, deferred)

## Code style

Tabs, spaces before parens and brackets, closing braces align with content — not with the opening statement. Always use `forEach` for array iteration — never `map`, `filter`, or `reduce`. See global `CLAUDE.md` for the full guide.

## Files to read before writing code

1. `code.js` — root textarea app; the simplest integration
2. `apps/gutenberg/code.js` — Gutenberg integration; search for `myWordpress` for all integration points
3. `docs/developers.md` — narrative walkthrough for developers
4. `misc/handoff.md` — project context, storage design, session notes
5. wpIdentity `misc/handoff.md` — full wpIdentity API reference
