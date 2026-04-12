# Developer guide: plugging an editor into wpIdentity

This guide explains how to adapt any browser-based editor to publish to WordPress via wpIdentity, using the two reference implementations in this repo as a starting point.

## The big idea

WordPress is the backend. Your editor is the front end. wpIdentity is the glue.

Most platforms give writers a text box. WordPress gives them the full web — proper HTML, RSS feeds with rssCloud, a real publishing infrastructure. wpIdentity makes it easy to put WordPress *under* your app instead of *around* it.

The deal for developers: you focus on editing. wpIdentity handles auth, storage, and publishing. Users keep their own files — you don't have to become a storage provider.

The deal for users: use any editor in the ecosystem. All your drafts are stored on the shared wpIdentity server in a standard format. Open a post you wrote in Gutenberg and re-edit it in an outliner. The files belong to you, not the app.

## Two reference implementations

**Root app** (`index.html` / `code.js`) — a plain textarea. The simplest possible integration. Start here if you are wiring up a basic editor.

**Gutenberg app** (`apps/gutenberg/`) — the Gutenberg block editor. A more complex integration showing how a rich editor with its own source format plugs in.

Both apps point at the same shared server (`https://wordland.dev/`) and share the same storage format.

## What you need to include

```html
<!-- jQuery (required by basic/code.js utilities) -->
<script src="https://s3.amazonaws.com/scripting.com/code/includes/jquery-1.9.1.min.js"></script>

<!-- Bootstrap (for the navbar and modal dialogs) -->
<link href="https://s3.amazonaws.com/scripting.com/code/includes/bootstrap.css" rel="stylesheet">
<script src="https://s3.amazonaws.com/scripting.com/code/includes/bootstrap.min.js"></script>

<!-- Dave's utility library (alertDialog, confirmDialog, askDialog, hitCounter, etc.) -->
<script src="https://s3.amazonaws.com/scripting.com/code/includes/basic/code.js?x=2"></script>
<link href="https://s3.amazonaws.com/scripting.com/code/includes/basic/styles.css" rel="stylesheet">

<!-- The wpIdentity browser API -->
<script src="https://s3.amazonaws.com/scripting.com/code/wpidentity/client/api2.js?x=0"></script>
```

For the Gutenberg editor, also add Turndown (HTML to Markdown) and the isolated-block-editor before your own scripts:

```html
<script src="https://unpkg.com/turndown/dist/turndown.js"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@automattic/isolated-block-editor@2.30.0/build-browser/isolated-block-editor.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@automattic/isolated-block-editor@2.30.0/build-browser/core.css"/>
<link rel="stylesheet" href="https://unpkg.com/@automattic/isolated-block-editor@2.30.0/build-browser/isolated-block-editor.css"/>
```

No build step required for any of this.

## Startup sequence

```javascript
myWordpress = new wordpress ({
	serverAddress: "https://wordland.dev/",
	urlChatLogSocket: "wss://wordland.dev/",
	flMarkdownProcess: false
	});

myWordpress.startup (function (err) {
	hitCounter ();
	if (myWordpress.userIsSignedIn ()) {
		// user is logged in — load prefs, restore last draft, start editor
		}
	else {
		// show the "log in with WordPress.com" button
		updateForLogin ();
		}
	});
```

`startup` is the single boot point. It calls back immediately whether or not the user is signed in — you don't branch on the error for that. Call `userIsSignedIn()` after.

`hitCounter()` is called right after startup, before the signed-in check. A page view is a page view regardless of login state.

## The storage key design

`wpstorage` table key: `(username, relpath, flprivate, idsite, idpost)`

Multiple files can share the same `relpath` as long as `(idsite, idpost)` differs. Each editor attaches its own source file to a published post:

- `draft.json` — universal; stores draft metadata + markdown content for cross-editor interop
- `source.gutenberg` — Gutenberg block markup as JSON
- `source.opml` — outline editor source (future)
- `source.svg` — SVG editor source (future)

When adding a new editor:
1. Name your source file `source.<format>`
2. Save it as JSON: `{ content: "...", contentType: "yourformat" }`
3. Save it on every autosave and publish, with `{ idsite, idpost }` in options
4. On re-open, read your source file first; fall back to `draft.json` content

## Two versions of the draft object

There are two distinct representations of a draft. Getting this wrong causes bugs.

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

Runtime fields (`flEnablePublish`, etc.) are never saved to disk. `ctSaves` is managed entirely by the server — never set it client-side.

## buildSaveableDraft()

The single source of truth for what goes on disk. It converts block markup to markdown and strips runtime fields. Both `saveDraft()` and the draft data viewer call it.

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

## Autosave

Set a flag when content changes, check every second, save if enough time has passed:

```javascript
function everySecond () {
	if (globals.flDraftChanged) {
		const secsSinceLastChange = secondsSince (globals.whenLastChange);
		if (secsSinceLastChange >= appConsts.minSecsBetwSave) {
			globals.flDraftChanged = false;
			saveDraft (globals.theDraft, function () {
				saveEditorSource (); // save source.<format> in sync with draft.json
				});
			}
		}
	}
```

Both `draft.json` and your source file should be saved together on every autosave, not just on publish.

## Saving drafts

```javascript
const saveableDraft = buildSaveableDraft (globals.theDraft);
myWordpress.writeUserDataFile ("draft.json", jsonStringify (saveableDraft), "application/json", true, function (err, data) {
	if (!err) {
		globals.theDraft.idDraft = data.id;
		}
	}, { idsite: globals.theDraft.idSite, idpost: globals.theDraft.idPost, iddraft: globals.theDraft.idDraft });
```

The server returns `data.id` — store this as `idDraft` and save it to prefs so you can restore the last draft on next startup.

## Saving your editor source file

Use `writeUniqueFile` (not `writeUserDataFile`) so repeated saves don't create duplicate records:

```javascript
const sourceData = {
	content: globals.theEditor.val (),
	contentType: "gutenberg"
	};
myWordpress.writeUniqueFile ("source.gutenberg", jsonStringify (sourceData), "application/json", true, function (err) {
	// saved
	});
```

Wait — `writeUniqueFile` doesn't accept post-keyed options. For source files that must be keyed to `(idsite, idpost)`, you need `writeUserDataFile`. See `code.js` in either app for the exact pattern used.

## Re-opening a published post

On startup, if you have a saved `idDraft`, restore it:

```javascript
myWordpress.readDraft (idDraft, function (err, data) {
	const theDraft = JSON.parse (data.filecontents);
	if (theDraft.idSite && theDraft.idPost) {
		checkForSourceConflict (theDraft.idSite, theDraft.idPost, function (flAbort) {
			if (flAbort) {
				startNewDraft ();
				return;
				}
			myWordpress.readUserDataFile ("source.gutenberg", true, function (err, sourceData) {
				const source = err ? null : JSON.parse (sourceData.filecontents);
				const initialContent = source ? source.content : theDraft.content;
				startEditor (initialContent);
				}, { idsite: theDraft.idSite, idpost: theDraft.idPost });
			});
		}
	else {
		startEditor (theDraft.content);
		}
	});
```

## Conflict detection

When a post has been edited by a different editor, it will have a foreign `source.*` file. Detect and handle this at open time:

```javascript
function checkForSourceConflict (idSite, idPost, callback) {
	myWordpress.getSourceFiles (idSite, idPost, function (err, theFiles) {
		if (err || theFiles.length === 0) {
			callback (false);
			return;
			}
		// filter out your own source file (base textarea app skips this — all source.* are foreign)
		const foreignFiles = [];
		theFiles.forEach (function (f) {
			if (f.relpath !== "source.gutenberg") {
				foreignFiles.push (f);
				}
			});
		if (foreignFiles.length === 0) {
			callback (false);
			return;
			}
		const format = foreignFiles [0].relpath.replace ("source.", "");
		const flProceed = window.confirm ("There's a '" + format + "' version of this file which you will lose if you edit this file.");
		if (flProceed) {
			const foreignNames = [];
			foreignFiles.forEach (function (f) {
				foreignNames.push (f.relpath);
				});
			myWordpress.deleteSourceFiles (idSite, idPost, foreignNames, function (err) {
				callback (false);
				});
			}
		else {
			callback (true); // abort — open empty draft
			}
		});
	}
```

- **OK:** delete only the foreign files, proceed normally
- **Cancel:** open an empty draft

The base textarea app passes no exclusions — all `source.*` files are foreign to it. Pass `undefined` as `paths` to delete all.

## Letting users choose a site

```javascript
const sites = myWordpress.getSiteList (); // synchronous after startup
// sites is array of { idSite, name, urlSite, description }
```

Store the chosen `idSite` in prefs. Users should not have to pick every session.

## Prefs

```javascript
myWordpress.writeUniqueFile ("yourapp/prefs.json", jsontext, "application/json", true, callback);
myWordpress.readUserDataFile ("yourapp/prefs.json", true, callback);
```

Use a subfolder unique to your app. Key prefs to save: `idLastDraft`, `idLastSiteChosen`, `nameLastSiteChosen`.

## The Gutenberg-specific part

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

`wp.attachEditor (textarea)` transforms a hidden textarea into Gutenberg. Poll the textarea value every second to detect changes.

## Known issues as of v0.4.8

**Editor height** — `isolated-block-editor` sizes itself via internal React/JS, not CSS. Workaround: `max-height: 300px; overflow-y: auto`. (Gutenberg app only, deferred)

**cmd-Z undo** — keyboard undo not working in Gutenberg; toolbar arrows work. (Gutenberg app only, deferred)

## Reference

- [wpIdentity repo](https://github.com/scripting/wpIdentity) — backend source
- [api2.js](https://github.com/scripting/wpIdentity/blob/main/client/api2.js) — full browser API source
- [wpEditorDemo](https://github.com/scripting/wpEditorDemo) — this repo
- Live demos: root textarea app at [demo.wpidentity.org](https://demo.wpidentity.org), Gutenberg app at [this.how/ai/wpEditorDemo/gutenberg/](https://this.how/ai/wpEditorDemo/gutenberg/)
