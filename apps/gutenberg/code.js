const appConsts = {
	version: "0.4.10",
	productName: "gutenbergdemo",
	fnamePrefs: "gutenbergdemo/prefs.json",
	fnameSourceGutenberg: "source.gutenberg",
	aboutText: "Gutenberg is a block editor plugged into wpIdentity. Drafts are saved to the same wpIdentity server that WordLand uses. The block markup is stored as source.gutenberg, keyed per post, so any Gutenberg-aware editor can re-open it."
	}

var appPrefs = {
	ctStarts: 0,
	whenLastStart: new Date (0),
	idLastDraft: undefined,
	minSecsBetwSave: 0.5,
	idLastSiteChosen: undefined,
	nameLastSiteChosen: undefined
	}

var globals = {
	flPrefsChanged: false,
	flDraftChanged: false,
	theDraft: undefined,
	autosaveClock: new Date (0),
	siteList: undefined,
	theEditor: undefined, //the hidden textarea backing the Gutenberg editor
	savingStatusMessage: undefined,
	lastEditorContent: undefined
	}

//prefs
	function prefsChanged () {
		globals.flPrefsChanged = true;
		}
	function readPrefs (callback) {
		const whenstart = new Date ();
		myWordpress.readUserDataFile (appConsts.fnamePrefs, true, function (err, theSavedPrefs) {
			if (err) {
				console.log ("readPrefs: err.message == " + err.message);
				if (callback !== undefined) {
					if (err.code == 404) {
						callback (undefined, appPrefs);
						}
					else {
						callback (err);
						}
					}
				}
			else {
				var thePrefs = new Object (), flJsonError = false;
				try {
					thePrefs = JSON.parse (theSavedPrefs.filecontents);
					}
				catch (err) {
					console.log ("readPrefs: err.message == " + err.message);
					flJsonError = true;
					}
				if (!flJsonError) {
					for (var x in thePrefs) {
						appPrefs [x] = thePrefs [x];
						}
					}
				console.log ("readPrefs: " + secondsSince (whenstart) + " secs");
				if (callback !== undefined) {
					callback (err, theSavedPrefs);
					}
				}
			});
		}
	function savePrefs (callback) {
		const jsontext = jsonStringify (appPrefs), whenstart = new Date ();
		myWordpress.writeUniqueFile (appConsts.fnamePrefs, jsontext, "application/json", true, function (err, data) {
			if (err) {
				console.log ("savePrefs: err.message == " + err.message);
				}
			else {
				console.log ("savePrefs: " + secondsSince (whenstart) + " secs");
				}
			if (callback !== undefined) {
				callback (err, data);
				}
			});
		}
	function checkPrefsChanged () {
		if (globals.flPrefsChanged) {
			globals.flPrefsChanged = false;
			savePrefs ();
			}
		}
//drafts
	function draftChanged () {
		globals.flDraftChanged = true;
		globals.autosaveClock = new Date ();
		}
	function newDraft () {
		const theUserInfo = myWordpress.getUserInfoSync ();
		const theDraft = {
			title: "",
			content: "", //block markup at runtime
			categories: [],
			idPost: undefined,
			idSite: undefined,
			flEnablePublish: false,
			author: {
				id: theUserInfo.idUser,
				username: theUserInfo.username,
				name: theUserInfo.name
				},
			whenCreated: new Date ()
			}
		return (theDraft);
		}
	function readDraft (idDraft, callback) {
		myWordpress.readDraft (idDraft, function (err, data) {
			if (err) {
				callback (err);
				}
			else {
				try {
					const theDraft = JSON.parse (data.filecontents);
					theDraft.idDraft = idDraft;
					callback (undefined, theDraft);
					}
				catch (err) {
					callback (err);
					}
				}
			});
		}
	function readGutenbergSource (idSite, idPost, callback) {
		const options = {
			idsite: idSite,
			idpost: idPost
			};
		myWordpress.readUserDataFile (appConsts.fnameSourceGutenberg, true, function (err, data) {
			if (err) {
				console.log ("readGutenbergSource: not found, falling back to draft.json content");
				callback (err);
				}
			else {
				try {
					const gutenbergSource = JSON.parse (data.filecontents);
					console.log ("readGutenbergSource: loaded " + gutenbergSource.content.length + " chars");
					callback (undefined, gutenbergSource);
					}
				catch (err) {
					callback (err);
					}
				}
			}, options);
		}
	function saveGutenbergSource (draftInfo, callback) {
		if (draftInfo.idSite === undefined || draftInfo.idPost === undefined) {
			if (callback !== undefined) {
				callback (undefined);
				}
			return;
			}
		const blockMarkup = globals.theEditor.val ();
		const gutenbergSource = {
			content: blockMarkup,
			contentType: "gutenberg"
			};
		const jsontext = jsonStringify (gutenbergSource);
		const options = {
			idsite: draftInfo.idSite,
			idpost: draftInfo.idPost
			};
		const whenstart = new Date ();
		myWordpress.writeUniqueFile (appConsts.fnameSourceGutenberg, jsontext, "application/json", true, function (err, data) {
			if (err) {
				console.log ("saveGutenbergSource: err.message == " + err.message);
				}
			else {
				console.log ("saveGutenbergSource: " + blockMarkup.length + " chars, " + secondsSince (whenstart) + " secs.");
				}
			if (callback !== undefined) {
				callback (err, data);
				}
			}, options);
		}
	function blocksToMarkdown (blockMarkup) {
		if (!blockMarkup || blockMarkup.trim () === "") {
			return ("");
			}
		const html = blockMarkup.replace (/<!--[\s\S]*?-->/g, "").trim ();
		const turndownService = new TurndownService ();
		return (turndownService.turndown (html));
		}
	function buildSaveableDraft (draftInfo) { //WordLand-compatible format -- markdown content, no runtime fields
		const saveableDraft = {
			title: draftInfo.title,
			content: blocksToMarkdown (globals.theEditor ? globals.theEditor.val () : draftInfo.content),
			contentType: "markdown",
			categories: draftInfo.categories,
			author: draftInfo.author,
			whenCreated: draftInfo.whenCreated
			};
		if (draftInfo.idDraft !== undefined) {
			saveableDraft.idDraft = draftInfo.idDraft;
			}
		if (draftInfo.idPost !== undefined) {
			saveableDraft.idPost = draftInfo.idPost;
			}
		if (draftInfo.idSite !== undefined) {
			saveableDraft.idSite = draftInfo.idSite;
			}
		if (draftInfo.whenPublished !== undefined) {
			saveableDraft.whenPublished = draftInfo.whenPublished;
			}
		if (draftInfo.url !== undefined) {
			saveableDraft.url = draftInfo.url;
			}
		return (saveableDraft);
		}
	function saveDraft (draftInfo, callback) {
		var options = {
			idsite: draftInfo.idSite,
			idpost: draftInfo.idPost
			};
		if (draftInfo.idDraft !== undefined) {
			options.iddraft = draftInfo.idDraft;
			}
		const saveableDraft = buildSaveableDraft (draftInfo);
		const jsontext = jsonStringify (saveableDraft), whenstart = new Date ();
		myWordpress.writeUserDataFile ("draft.json", jsontext, "application/json", true, function (err, data) {
			if (err) {
				console.log ("saveDraft: err.message == " + err.message);
				}
			else {
				const nowstring = new Date ().toLocaleTimeString ();
				console.log (nowstring + ": saveDraft: " + saveableDraft.content.length + " chars markdown, " + secondsSince (whenstart) + " secs.");
				if (data.id !== undefined) {
					draftInfo.idDraft = data.id;
					if (appPrefs.idLastDraft != data.id) {
						appPrefs.idLastDraft = data.id;
						prefsChanged ();
						}
					}
				if (data.whenCreated !== undefined) {
					draftInfo.whenCreated = data.whenCreated;
					}
				if (data.whenUpdated !== undefined) {
					draftInfo.whenUpdated = data.whenUpdated;
					}
				}
			if (callback !== undefined) {
				callback (err, draftInfo);
				}
			}, options);
		}
	function publishDraft (draftInfo, callback) {
		if (draftInfo.idPost === undefined) {
			myWordpress.addPost (appPrefs.idLastSiteChosen, draftInfo, function (err, theNewPost) {
				callback (err, theNewPost);
				});
			}
		else {
			myWordpress.updatePost (draftInfo.idSite, draftInfo.idPost, draftInfo, function (err, theUpdatedPost) {
				callback (err, theUpdatedPost);
				});
			}
		}
//commands, button clicks
	function aboutCommand () {
		alertDialog (appConsts.aboutText);
		}
	function newDraftCommand () {
		console.log ("newDraftCommand");
		confirmDialog ("Create a new post?", function () {
			globals.theDraft = newDraft ();
			appPrefs.idLastDraft = undefined;
			appPrefs.idLastSiteChosen = undefined;
			appPrefs.nameLastSiteChosen = undefined;
			prefsChanged ();
			resetGutenberg ();
			updateStatus ();
			});
		}
	function chooseSiteButtonClick () {
		console.log ("chooseSiteButtonClick");
		function sortSiteList (theSites, sortBy="name", flReverseSort=false) {
			theSites.sort (function (a, b) {
				switch (sortBy) {
					case "name":
						var alower = a.name.toLowerCase (), val;
						var blower = b.name.toLowerCase ();
						if (flReverseSort) {
							let tmp = alower;
							alower = blower;
							blower = tmp;
							}
						if (alower.length == 0) {
							return (1);
							}
						if (blower.length == 0) {
							return (-1);
							}
						if (alower == blower) {
							val = 0;
							}
						else {
							if (blower > alower) {
								val = -1;
								}
							else {
								val = 1;
								}
							}
						return (val);
					}
				});
			}
		function viewSitelist (userOptions) {
			var options = {
				whereToAppend: $(".divSitelistContainer"),
				sortBy: "name",
				flReverseSort: false
				}
			mergeOptions (userOptions, options);
			const divSitelist = $("<div class=\"divSitelist\"></div>");
			function getFeedlandTimeString (when) {
				return (formatDate (when, "%b %Y"));
				}
			function getRow (item) {
				const theRow = $("<tr></tr>");
				function getSiteName () {
					const theCell = $("<td></td>");
					const shortenedname = maxStringLength (item.name, 65, true, true);
					const theName = $("<span class=\"spSitename\">" + shortenedname + "</span>");
					addToolTip (theName, item.description);
					theCell.append (theName);
					theCell.click (function () {
						console.log (shortenedname);
						appPrefs.idLastSiteChosen = item.idSite;
						appPrefs.nameLastSiteChosen = item.name;
						prefsChanged ();
						theDialog.modal ("hide");
						});
					return (theCell);
					}
				theRow.append (getSiteName ());
				return (theRow);
				}
			const theList = myWordpress.getSiteList ();
			sortSiteList (theList, options.sortBy, options.flReverseSort);
			theList.forEach (function (item) {
				divSitelist.append (getRow (item));
				});
			return (divSitelist);
			}
		$(".divSitelistContainer").empty ();
		const dialogBody = viewSitelist ();
		const dialogOptions = {
			dialogBody,
			prompt: "Choose a site for this post..",
			flOkButton: false,
			flCancelButton: false
			};
		const theDialog = runModalDialog (dialogOptions);
		}
	function publishButtonClick () {
		const theDraft = globals.theDraft;
		globals.savingStatusMessage = "PUBLISHING";
		publishDraft (theDraft, function (err, theNewPost) {
			if (err) {
				alertDialog ("Couldn't publish because =\"" + err.message + ".\"");
				}
			else {
				theDraft.idPost = theNewPost.idPost;
				theDraft.idSite = theNewPost.idSite;
				theDraft.url = theNewPost.url;
				theDraft.whenCreated = theNewPost.whenCreated;
				theDraft.whenPublished = theNewPost.whenPublished;
				theDraft.author = theNewPost.author;
				theDraft.flEnablePublish = false;
				globals.theDraft = theDraft;
				saveDraft (theDraft, function (err, data) {
					if (!err) {
						saveGutenbergSource (theDraft, function (err, data) {
							if (!err) {
								speakerBeep ();
								}
							});
						}
					});
				}
			globals.savingStatusMessage = undefined;
			});
		}
	function setTitleCommand () {
		const defaultValue = globals.theDraft.title;
		askDialog ("Title for the post:", defaultValue, "This is where you enter the title of the freaking post.", function (newTitle, flcancel) {
			if (!flcancel) {
				globals.theDraft.title = newTitle;
				saveDraft (globals.theDraft, function (err, data) {
					if (!err) {
						updateStatus ();
						}
					});
				}
			});
		}
	function viewPostCommand () {
		if (globals.theDraft.url === undefined) {
			alertDialog ("Can't view the post because it hasn't been published yet.");
			}
		else {
			window.open (globals.theDraft.url);
			}
		}
	function logOffWordpressCommand () {
		confirmDialog ("Log off WordPress.com?", function () {
			myWordpress.logOffWordpress ();
			});
		}
//updating display
	function updateDraftViewer () {
		const divDraftDataViewer = $(".divDraftDataViewer");
		const saveableDraft = buildSaveableDraft (globals.theDraft);
		saveableDraft.content = globals.theEditor ? globals.theEditor.val () : "";
		saveableDraft.contentType = "gutenberg";
		const draftViewerText = jsonStringify (saveableDraft);
		if (draftViewerText != divDraftDataViewer.text ()) {
			divDraftDataViewer.text (draftViewerText);
			}
		}
	function updateTitleViewer () {
		if (globals.theDraft.title !== undefined) {
			$(".divEditorContainer .divTitle").text (globals.theDraft.title);
			}
		}
	function updateForLogin (flConnected) {
		var idActive, idOther;
		if (flConnected === undefined) {
			flConnected = myWordpress.userIsSignedIn ();
			}
		if (flConnected) {
			idActive = "#idSignedOn";
			idOther = "#idSignedOff";
			}
		else {
			idActive = "#idSignedOff";
			idOther = "#idSignedOn";
			}
		if ($(idActive).css ("display") != "block") {
			$(idActive).css ("display", "block");
			}
		if ($(idOther).css ("display") != "none") {
			$(idOther).css ("display", "none");
			}
		if (flConnected) {
			$("#idMainMenu").css ("display", "block");
			}
		else {
			$("#idMainMenu").css ("display", "none");
			}
		}
	function updateStatus () {
		function setTextItem (nameObject, theText) {
			if ($(nameObject).text () != theText) {
				$(nameObject).text (theText);
				}
			}
		function updateSavingStatus () {
			var theText;
			if (globals.savingStatusMessage === undefined) {
				if (globals.flDraftChanged) {
					theText = "NOT SAVED";
					}
				else {
					theText = "SAVED";
					}
				}
			else {
				theText = globals.savingStatusMessage;
				}
			setTextItem (".divSavingMessage", theText);
			}
		function enablePublishButton () {
			var flDisabled = getBoolean (globals.theDraft.flEnablePublish) ? false : true;
			if (appPrefs.idLastSiteChosen === undefined) {
				flDisabled = true;
				}
			$("#idPostButton").prop ("disabled", flDisabled);
			}
		function enableViewPostButton () {
			const flDisabled = getBoolean (globals.theDraft.url !== undefined) ? false : true;
			$("#idViewPostButton").prop ("disabled", flDisabled);
			}
		const siteName = (appPrefs.nameLastSiteChosen === undefined) ? "Choose site.." : "Site: " + appPrefs.nameLastSiteChosen;
		setTextItem ("#idChooseSiteButton", siteName);
		updateDraftViewer ();
		updateTitleViewer ();
		updateSavingStatus ();
		enablePublishButton ();
		enableViewPostButton ();
		}

function everyMinute () {
	}
function everySecond () {
	updateForLogin ();
	updateStatus ();
	checkPrefsChanged ();
	if (globals.theEditor !== undefined) { //detect content changes from Gutenberg
		const currentContent = globals.theEditor.val ();
		if (currentContent !== globals.lastEditorContent) {
			globals.lastEditorContent = currentContent;
			textChanged ();
			}
		}
	if (globals.flDraftChanged) {
		if (secondsSince (globals.autosaveClock) > appPrefs.minSecsBetwSave) {
			globals.flDraftChanged = false;
			saveDraft (globals.theDraft, function (err) {
				if (!err) {
					saveGutenbergSource (globals.theDraft);
					}
				});
			updateDraftViewer ();
			}
		}
	}

function textChanged () {
	const theDraft = globals.theDraft;
	theDraft.content = globals.theEditor.val (); //block markup
	theDraft.flEnablePublish = true;
	draftChanged ();
	}

function resetGutenberg () {
	$(".divEditor").empty ();
	globals.theEditor = undefined;
	globals.lastEditorContent = "";
	startGutenberg ({initialContent: "", whereToAppend: $(".divEditor")});
	}

function startGutenberg (userOptions) {
	var options = {
		initialContent: undefined,
		whereToAppend: undefined
		}
	mergeOptions (userOptions, options);

	const theTextarea = $("<textarea></textarea>");
	options.whereToAppend.append (theTextarea);
	globals.theEditor = theTextarea;
	globals.lastEditorContent = options.initialContent || "";

	if (options.initialContent !== undefined) {
		theTextarea.val (options.initialContent);
		}

	wp.attachEditor (theTextarea [0]); //transforms textarea into Gutenberg editor

	return (theTextarea);
	}

function checkForSourceConflict (idSite, idPost, callback) {
	myWordpress.getSourceFiles (idSite, idPost, function (err, theFiles) {
		if (err || theFiles.length === 0) {
			callback (false);
			return;
			}
		const foreignFiles = theFiles.filter (function (f) {
			return (f.relpath !== appConsts.fnameSourceGutenberg);
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
			callback (true);
			}
		});
	}

function startup () {
	console.log ("startup");
	const wpOptions = {
		serverAddress: "https://wordland.dev/",
		urlChatLogSocket: "wss://wordland.dev/",
		flMarkdownProcess: false
		}
	myWordpress = new wordpress (wpOptions);
	myWordpress.startup (function (err) {
		if (err) {
			alertDialog ("Can't run the app because there was an error starting up.");
			}
		else {
			if (myWordpress.userIsSignedIn ()) {
				hitCounter ();
				readPrefs (function (err, theSavedPrefs) {
					if (err) {
						console.log ("startup: Can't run the app because there was an error loading your preferences.");
						$("body").text ("");
						updateForLogin ();
						}
					else {
						appPrefs.ctStarts++;
						appPrefs.whenLastStart = new Date ();
						prefsChanged ();

						const editorOptions = {
							initialContent: undefined,
							whereToAppend: $(".divEditor")
							}

						updateForLogin ();

						if (appPrefs.idLastDraft !== undefined) {
							readDraft (appPrefs.idLastDraft, function (err, theDraft) {
								if (err) {
									console.log ("startup: err.message == " + err.message);
									startGutenberg (editorOptions);
									globals.theDraft = newDraft ();
									}
								else {
									globals.theDraft = theDraft;
									if (theDraft.idSite !== undefined && theDraft.idPost !== undefined) {
										readGutenbergSource (theDraft.idSite, theDraft.idPost, function (err, gutenbergSource) {
											checkForSourceConflict (theDraft.idSite, theDraft.idPost, function (flCancelled) {
												if (flCancelled) {
													globals.theDraft = newDraft ();
													startGutenberg (editorOptions);
													}
												else {
													editorOptions.initialContent = err ? theDraft.content : gutenbergSource.content;
													startGutenberg (editorOptions);
													}
												updateDraftViewer ();
												updateTitleViewer ();
												});
											});
										}
									else {
										editorOptions.initialContent = theDraft.content;
										startGutenberg (editorOptions);
										updateDraftViewer ();
										updateTitleViewer ();
										}
									}
								updateForLogin ();
								});
							}
						else {
							startGutenberg (editorOptions);
							globals.theDraft = newDraft ();
							updateDraftViewer ();
							updateTitleViewer ();
							updateForLogin ();
							}

						$(".divTitle").click (function () {
							setTitleCommand ();
							});
						$(".btn").click (function () {
							this.blur ();
							});

						self.setInterval (everySecond, 1000);
						runEveryMinute (everyMinute);
						}
					});
				}
			else {
				updateForLogin ();
				}
			}
		});
	}
