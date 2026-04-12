# AI guide: wpEditorDemo / Gutenberg integration

This document is for an AI assistant helping a developer adapt an existing editor to the wpIdentity ecosystem. Read this at session start before writing any code.

## What you are helping build

The developer wants to plug their editor into wpIdentity — a Node.js backend that provides WordPress.com OAuth identity, a simplified WordPress API, and MySQL-backed user storage. The result: users log in with WordPress.com, write in the developer's editor, and publish to their own WordPress sites. Users own their files. Editors are interchangeable.

This app (`apps/gutenberg/`) is the reference implementation using Gutenberg. The root `index.html` / `code.js` is a simpler textarea demo. Read both before writing code.

## The server

All apps point at `https://wordland.dev/` — a shared wpIdentity instance. Developers do not run their own server. The shared server is what makes cross-editor interop possible.

## The browser API

Loaded from: `//s3.amazonaws.com/scripting.com/code/wpidentity/client/api2.js`

Instantiate: `myWordpress = new wordpress ({ serverAddress: "https://wordland.dev/", urlChatLogSocket: "wss://wordland.dev/", flMarkdownProcess: false })`

All calls follow Node-style `callback (err, data)` except where noted.

### Calls used in this app

```
myWordpress.startup (callback)
  — boot point; call on page load; calls back immediately if not signed in

myWordpress.userIsSignedIn ()
  — synchronous boolean

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
```

**Important:** `ctSaves` is managed entirely by the server — it is incremented in the DB on each save and injected into the returned JSON. Never set it client-side.

## The storage key design

`wpstorage` table key: `(username, relpath, flprivate, idsite, idpost)`

This means multiple files can share the same `relpath` as long as `(idsite, idpost)` differs. Each editor attaches its own source file to a published post:

- `draft.json` — universal; stores draft metadata + markdown content
- `source.gutenberg` — Gutenberg block markup as JSON; saved on publish, read on re-open
- `source.opml` — outline editor source (future)
- `source.svg` — SVG editor source (future)

When helping a developer implement a new editor, instruct them to:
1. Name their source file `source.<format>`
2. Save it as JSON: `{ content: "...", contentType: "yourformat" }`
3. Save it after every publish with `(idsite, idpost)` in options
4. Read it first on re-open; fall back to `draft.json` content

## Two versions of the draft object

There are two distinct representations of a draft. This is critical to get right.

**Runtime draft** (`globals.theDraft`) — lives in memory while the app is running:

```javascript
{
    title: "",
    content: "",       // block markup at runtime (set by textChanged)
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
    content: "",         // markdown, converted from block markup via blocksToMarkdown()
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

Runtime fields (`flEnablePublish`, etc.) are never saved to disk. The `content` field in `draft.json` is always markdown so any editor in the ecosystem can read it.

## buildSaveableDraft()

This function is the single source of truth for what goes on disk. It converts block markup to markdown and strips runtime fields. Both `saveDraft()` and `updateDraftViewer()` call it. If you add new fields to the draft, add them here.

```javascript
function buildSaveableDraft (draftInfo) {
    const saveableDraft = {
        title: draftInfo.title,
        content: blocksToMarkdown (globals.theEditor ? globals.theEditor.val () : draftInfo.content),
        contentType: "markdown",
        categories: draftInfo.categories,
        author: draftInfo.author,
        whenCreated: draftInfo.whenCreated
        };
    if (draftInfo.idDraft !== undefined) { saveableDraft.idDraft = draftInfo.idDraft; }
    if (draftInfo.idPost !== undefined) { saveableDraft.idPost = draftInfo.idPost; }
    if (draftInfo.idSite !== undefined) { saveableDraft.idSite = draftInfo.idSite; }
    if (draftInfo.whenPublished !== undefined) { saveableDraft.whenPublished = draftInfo.whenPublished; }
    if (draftInfo.url !== undefined) { saveableDraft.url = draftInfo.url; }
    return (saveableDraft);
    }
```

## blocksToMarkdown()

Converts Gutenberg block markup to markdown. Strip the block grammar comments first, then run turndown:

```javascript
function blocksToMarkdown (blockMarkup) {
    if (!blockMarkup || blockMarkup.trim () === "") {
        return ("");
        }
    const html = blockMarkup.replace (/<!--[\s\S]*?-->/g, "").trim ();
    const turndownService = new TurndownService ();
    return (turndownService.turndown (html));
    }
```

Turndown is loaded via unpkg: `<script src="https://unpkg.com/turndown/dist/turndown.js"></script>`

## The Gutenberg-specific implementation

Gutenberg outputs HTML with block grammar comments:
```html
<!-- wp:paragraph -->
<p>Hello</p>
<!-- /wp:paragraph -->
```

This block markup is:
- Sent as `content` to `addPost` / `updatePost` — WordPress renders it natively. `flMarkdownProcess` must be `false`.
- Saved as-is in `source.gutenberg` (as JSON) — for re-editing in Gutenberg
- Converted to markdown via `blocksToMarkdown()` before saving to `draft.json` — for interop with other editors

The `source.gutenberg` file is JSON, not raw markup:
```javascript
{ content: blockMarkup, contentType: "gutenberg" }
```

Always parse it after reading: `const gutenbergSource = JSON.parse (data.filecontents)`

The `isolated-block-editor` package (Automattic, v2.30.0) is loaded via unpkg with no build step. `wp.attachEditor (textarea)` transforms a hidden textarea into Gutenberg. The textarea value is polled every second to detect changes.

## Patterns to follow

**Autosave:** set `globals.flDraftChanged = true` on content change; in `everySecond()` check if enough time has passed (`minSecsBetwSave`), then call `saveDraft`.

**Prefs:** stored at `appConsts.fnamePrefs` (e.g. `"gutenbergdemo/prefs.json"`). Use a subfolder unique to your app. Save with `writeUniqueFile`. Key prefs: `idLastDraft`, `idLastSiteChosen`, `nameLastSiteChosen`.

**Site picker:** `getSiteList()` returns cached array after startup. Show a modal with site names. Store chosen `idSite` + name in prefs.

**Version:** defined in `appConsts.version`, displayed as `v0.4.3` in navbar upper right.

**Draft viewer:** shows the saveable draft format (what actually goes to disk) — call `buildSaveableDraft (globals.theDraft)` and display it. Never show the runtime draft object directly.

## Known issues as of v0.4.3

1. **Source file conflict**: no warning when opening a post that has a `source.*` from a different editor. The old source file is silently deleted on save. Fix: check for foreign source files at open time and warn.
2. **Editor height**: `isolated-block-editor` was designed as a full-page editor. It does not auto-size to content like a textarea — heights are set by internal JavaScript/React, not CSS rules. Workaround: `max-height: 300px; overflow-y: auto`. No clean fix without knowing the library's internal API.
3. **cmd-Z undo**: keyboard undo is not working. Gutenberg toolbar undo arrows work. Needs investigation.
4. Deprecated warnings from `isolated-block-editor` v2.30.0 (`wp.blockEditor.useSetting`, `__experimentalRecursionProvider`) — internal to the library, not actionable.

## Code style

Tabs, spaces before parens and brackets, closing braces align with content — not with the opening statement. See `~/.claude/CLAUDE.md` for the full guide. This applies to JS, JSON, CSS, HTML.

## Files to read before writing code

1. `apps/gutenberg/code.js` — full implementation; search for `myWordpress` for all integration points
2. `apps/gutenberg/developer-guide.md` — narrative walkthrough
3. `misc/handoff.md` — project structure and storage design
4. wpIdentity `misc/handoff.md` — full API reference (at `/Users/davewiner/Claude/wpIdentity/misc/handoff.md` if available)
