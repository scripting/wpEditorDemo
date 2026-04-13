#### 4/12/26; v0.4.12 by Claude

- Removed `flMarkdownProcess` from startup options in code.js and from all docs — it's an internal default in api2.js (false), not something apps need to set
- worknotes.md brought up to date

#### 4/12/26; v0.4.11 by Claude

- Docs menu in index.html now links to GitHub URLs instead of relative paths (which don't work when the app is deployed)

#### 4/12/26; v0.4.10 by Claude

- Version number correction — was incorrectly bumped to 0.5.0 instead of 0.4.10

#### 4/12/26; v0.4.9 by Claude

- Demo URL updated to demo.gutenberg.land in docs/developers.md and apps/gutenberg/README.md

#### 4/12/26; v0.4.8 by DW + Claude

- First push to GitHub
- hitCounter() called at startup (before userIsSignedIn check) — a page view is a page view
- Conflict detection: checkForSourceConflict() added — on open, if a foreign source.* file exists for the post, user is warned and given the choice to proceed (deletes the foreign file) or abort (opens an empty draft)
- saveGutenbergSource() now uses writeUniqueFile instead of writeUserDataFile — prevents duplicate records on repeated saves
- Autosave now chains saveGutenbergSource after saveDraft — source.gutenberg and draft.json stay in sync on every save, not just on publish
- deleteSourceFiles() in wpIdentity updated to accept an optional paths array — Gutenberg app passes only foreign filenames so its own source.gutenberg is never deleted

#### 4/12/26; v0.4.7 by DW + Claude

- Draft viewer (second box) enhanced to show full saveable draft metadata including gutenberg content and contentType — developers can see exactly what's stored

#### 4/12/26; v0.4.6 by DW + Claude

- Product renamed to "Gutenberg" (title, navbar, About text)
- Draft viewer updated to show source.gutenberg content alongside draft metadata

#### 4/12/26; v0.4.4–v0.4.5 by DW

- Local development and testing — confirmed readGutenbergSource loading correctly on page reload
- Protocol-relative URLs (`//s3.amazonaws.com/...`) changed to `https://` to support local file:// testing

#### 4/10/26; v0.4.3 by DW

- Draft viewer now shows the saveable draft format (what actually gets written to draft.json) -- markdown content, no runtime fields
- Refactored: buildSaveableDraft() is now shared by saveDraft() and updateDraftViewer()
- Removed Choose site, View post, Publish from Menu (buttons are sufficient)

#### 4/10/26; v0.4.2 by DW

- draft.json now saved in WordLand-compatible format: content is markdown (converted from block markup via turndown), contentType is "markdown", no runtime fields (flEnablePublish, flDraftChanged)
- source.gutenberg is now JSON: { content: blockMarkup, contentType: "gutenberg" }
- Added turndown (via unpkg) for client-side block markup → HTML → markdown conversion
- Added Docs menu with links to developer-guide.md, ai-guide.md, worknotes.md
- Editor height: removed max-height constraint, lets Gutenberg auto-size
- Known issue: cmd-Z undo not working — needs investigation

#### 4/10/26; v0.4.1 by DW

Started the project. Built a working Gutenberg block editor plugged into wpIdentity using the Automattic isolated-block-editor package (v2.30.0) loaded via unpkg. No build step required.

First publish worked on the first try. Block markup sent as content to WordPress, which renders blocks natively. source.gutenberg saved per post for re-editing.

Version 0.4.1.
