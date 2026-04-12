# Developer guide: plugging an editor into wpIdentity

This guide explains how to adapt any browser-based editor to publish to WordPress via wpIdentity, using the Gutenberg integration in this folder as a reference implementation.

## The big idea

WordPress is the backend. Your editor is the front end. wpIdentity is the glue.

Most platforms give writers a text box. WordPress gives them the full web — proper HTML, RSS feeds with rssCloud, a real publishing infrastructure. wpIdentity makes it easy to put WordPress *under* your app instead of *around* it.

The deal for developers: you focus on editing. wpIdentity handles auth, storage, and publishing. Users keep their own files — you don't have to become a storage provider.

The deal for users: use any editor in the ecosystem. All your drafts are yours, stored on the shared wpIdentity server. Open a post you wrote in Gutenberg and re-edit it in an outliner. The files belong to you.

## How the ecosystem works

Every editor in the wpIdentity ecosystem:

1. Authenticates the user via WordPress.com OAuth (one click, handled by wpIdentity)
2. Saves drafts to the user's storage on the wpIdentity server in a standard format
3. Saves an editor-specific source file per published post (e.g. `source.gutenberg`, `source.opml`)
4. Publishes to WordPress by calling `addPost` / `updatePost`

The source files are what make interop possible. When you open a published post, your editor looks for its own source file first. If it finds one, it loads that. If not, it falls back to the content in `draft.json`.

## What you need to include

```html
<!-- jQuery (required by basic/code.js utilities) -->
<script src="//s3.amazonaws.com/scripting.com/code/includes/jquery-1.9.1.min.js"></script>

<!-- Bootstrap (for the navbar and modal dialogs) -->
<link href="//s3.amazonaws.com/scripting.com/code/includes/bootstrap.css" rel="stylesheet">
<script src="//s3.amazonaws.com/scripting.com/code/includes/bootstrap.min.js"></script>

<!-- Dave's utility library (alertDialog, confirmDialog, askDialog, secondsSince, etc.) -->
<script src="//s3.amazonaws.com/scripting.com/code/includes/basic/code.js?x=2"></script>
<link href="//s3.amazonaws.com/scripting.com/code/includes/basic/styles.css" rel="stylesheet">

<!-- The wpIdentity browser API -->
<script src="//s3.amazonaws.com/scripting.com/code/wpidentity/client/api2.js?x=0"></script>
```

For Gutenberg specifically, also add turndown (HTML to Markdown) and the isolated-block-editor before your own scripts:

```html
<script src="https://unpkg.com/turndown/dist/turndown.js"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@automattic/isolated-block-editor@2.30.0/build-browser/isolated-block-editor.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@automattic/isolated-block-editor@2.30.0/build-browser/core.css"/>
<link rel="stylesheet" href="https://unpkg.com/@automattic/isolated-block-editor@2.30.0/build-browser/isolated-block-editor.css"/>
```

No build step required.

## Startup sequence

```javascript
const wpOptions = {
    serverAddress: "https://wordland.dev/",
    urlChatLogSocket: "wss://wordland.dev/",
    flMarkdownProcess: false
    }
myWordpress = new wordpress (wpOptions);
myWordpress.startup (function (err) {
    if (myWordpress.userIsSignedIn ()) {
        // user is logged in — load prefs, restore last draft, start editor
        }
    else {
        // show the "log in with WordPress.com" button
        updateForLogin ();
        }
    });
```

`startup` is the single boot point. If the user isn't signed in it returns immediately with no error — you don't need to branch on the error to detect that case. Just call `userIsSignedIn()` after.

## Two versions of the draft object

There are two distinct representations of a draft. Understanding the difference is important.

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

**Saveable draft** — what actually gets written to `draft.json` on disk. Built by `buildSaveableDraft()`:

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

This format is compatible with WordLand and all other editors in the ecosystem. The `content` field is always markdown so any editor can read it. Runtime fields like `flEnablePublish` are never saved to disk. `ctSaves` is managed entirely by the server — never set it client-side.

## buildSaveableDraft()

This function is the single source of truth for what goes on disk. It converts block markup to markdown and strips runtime fields. Both `saveDraft()` and the draft data viewer call it. If you add new fields to the draft, add them here.

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

## The five myWordpress calls you can't skip

```javascript
myWordpress.startup (callback)
// Boot point. Call on page load. Initializes user info, sitelist, WebSocket.

myWordpress.userIsSignedIn ()
// Returns boolean. Check after startup to decide which UI to show.

myWordpress.connectWithWordpress ()
// Redirects to WordPress.com OAuth. Wire to your "log in" button.

myWordpress.addPost (idsite, thepost, callback)
// Creates a new WordPress post. thepost is your draft object.
// Returns the new post with idPost, idSite, url, etc.

myWordpress.updatePost (idsite, idpost, thepost, callback)
// Updates an existing post. Use after first publish.
```

Everything else — storage, drafts, site lists, prefs — builds on these five.

## Saving drafts (autosave)

Call `buildSaveableDraft()` to get the object, then save it:

```javascript
const saveableDraft = buildSaveableDraft (draftInfo);
myWordpress.writeUserDataFile ("draft.json", jsonStringify (saveableDraft), "application/json", true, callback, options)
```

Where `options = { idsite, idpost, iddraft }` (all optional until after first publish).

The server returns `data.id` — store this as `draftInfo.idDraft` and save it to prefs so you can restore the last draft on next startup.

Autosave pattern: set a flag when content changes, check every second, save if enough time has passed since the last change.

## Saving the editor source file

After publish, save your editor's native format as JSON, keyed to `(idsite, idpost)`:

```javascript
const gutenbergSource = {
    content: globals.theEditor.val (), // raw block markup
    contentType: "gutenberg"
    };
myWordpress.writeUserDataFile ("source.gutenberg", jsonStringify (gutenbergSource), "application/json", true, callback, {
    idsite: draftInfo.idSite,
    idpost: draftInfo.idPost
    })
```

Use your own name: `source.gutenberg`, `source.opml`, `source.svg`, etc. Always save as JSON with `content` and `contentType` fields — this keeps the format consistent across editors.

## Re-opening a published post

On startup, if you have a saved `idDraft`, restore it:

```javascript
myWordpress.readDraft (idDraft, function (err, data) {
    const theDraft = JSON.parse (data.filecontents);
    // if published, try to load the editor source file
    if (theDraft.idSite && theDraft.idPost) {
        myWordpress.readUserDataFile ("source.gutenberg", true, function (err, gutenbergSource) {
            // source.gutenberg is JSON — use gutenbergSource.content for the editor
            const initialContent = err ? theDraft.content : gutenbergSource.content;
            startYourEditor (initialContent);
            }, { idsite: theDraft.idSite, idpost: theDraft.idPost });
        }
    else {
        startYourEditor (theDraft.content);
        }
    });
```

Note: `readUserDataFile` returns raw file contents in `data.filecontents`. The source file is JSON, so parse it: `const gutenbergSource = JSON.parse (data.filecontents)`.

## Letting users choose a site

Users may have multiple WordPress sites. You must let them pick before publishing:

```javascript
myWordpress.getSiteList ()   // synchronous, returns cached array after startup
```

Each site: `{ idSite, name, urlSite, description }`. Store the chosen `idSite` in prefs so users don't have to pick every session.

## Prefs

Save small user preferences (last draft id, last site chosen, etc.) to:

```javascript
myWordpress.writeUniqueFile ("yourapp/prefs.json", jsontext, "application/json", true, callback)
```

Use a subfolder name unique to your app to avoid collisions with other editors.

## Known issues as of v0.4.3

**Source file conflicts** — no warning when opening a post that has a `source.*` from a different editor. The old source file is silently deleted on save. A future version will detect the conflict and warn. For now: check for foreign `source.*` files at open time and warn the user.

**Editor height** — `isolated-block-editor` was designed as a full-page editor. Constraining it to a panel inside a larger page requires `max-height` and `overflow-y: auto`. It does not auto-size to content the way a textarea does.

**cmd-Z undo** — keyboard undo is not working. Gutenberg's toolbar undo arrows work. Needs investigation.

## Reference

- [wpIdentity repo](https://github.com/scripting/wpIdentity)
- [api2.js](https://github.com/scripting/wpIdentity/blob/main/client/api2.js) — full browser API source
- [wpEditorDemo](https://github.com/scripting/wpEditorDemo) — this repo; textarea demo at root, Gutenberg demo at `apps/gutenberg/`
- Live Gutenberg demo: https://this.how/ai/wpEditorDemo/gutenberg/
