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
