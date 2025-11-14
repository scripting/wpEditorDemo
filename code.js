const appConsts = {
	productName: "demoland",
	fnamePrefs: "demoland/prefs.json",
	aboutText: "Drafts are saved to the same wpIdentity server that WordLand uses. Choose a site, click the Publish button to post to WordPress. The second box, below the editor, is a live readout of the data we're keeping for the post you're editing. Useful for learning how wpIdentity works.",
	placeholderForTextarea: "This is a simple HTML textarea. You can write using Markdown. The box below the editor is a live readout of the data we're keeping for the current post."
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
	theEditor: undefined,
	savingStatusMessage: undefined
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
					if (err.code == 404) { //first-time user
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
				console.log ("readPrefs: appPrefs == " + jsonStringify (appPrefs));
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
				console.log ("savePrefs: err.message == " +  err.message);
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
		if (globals.flPrefsChanged) { //4/12/24 by DW
			globals.flPrefsChanged = false;
			savePrefs ();
			}
		}
//drafts
	function draftChanged (draftInfo) { 
		globals.flDraftChanged = true;
		globals.autosaveClock = new Date ();
		}
	function newDraft () {
		const theUserInfo = myWordpress.getUserInfoSync ();
		const theDraft = {
			title: "",
			content: "", //11/3/25 by DW
			categories: [],
			idPost: undefined,
			idSite: undefined,
			flEnablePublish: false,
			whichEditor: "markdown",
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
				var theDraft;
				try {
					const theDraft = JSON.parse (data.filecontents);
					theDraft.idDraft = idDraft;
					
					if (theDraft.contentType == "html") { //10/12/24 by DW
						theDraft.content = getMarkdownFromHtml (theDraft.content);
						theDraft.contentType = "markdown";
						}
					
					callback (undefined, theDraft);
					}
				catch (err) {
					callback (err);
					}
				}
			});
		}
	function saveDraft (draftInfo, callback) { 
		var options = {
			idsite: draftInfo.idSite,
			idpost: draftInfo.idPost
			};
		if (draftInfo.idDraft !== undefined) { //5/11/24 by DW
			options.iddraft = draftInfo.idDraft;
			}
		const jsontext = jsonStringify (draftInfo), whenstart = new Date ();
		myWordpress.writeUserDataFile ("draft.json", jsontext, "application/json", true, function (err, data) {
			if (err) {
				console.log ("saveDraft: err.message == " +  err.message);
				}
			else {
				const nowstring = new Date ().toLocaleTimeString ();
				console.log (nowstring + ": saveDraft: " + draftInfo.content.length + " chars, " + secondsSince (whenstart) + " secs.");
				if (data.id !== undefined) {
					draftInfo.idDraft = data.id;
					if (appPrefs.idLastDraft != data.id) { //10/17/24 by DW
						appPrefs.idLastDraft = data.id;
						prefsChanged ();
						}
					}
				if (data.whenCreated !== undefined) {
					draftInfo.whenCreated = data.whenCreated;
					}
				if (data.whenUpdated !== undefined) { //5/18/24 by DW
					draftInfo.whenUpdated = data.whenUpdated;
					}
				draftInfo.flDraftChanged = false; 
				}
			if (callback !== undefined) {
				callback (err, draftInfo);
				}
			}, options);
		}
	function publishDraft (draftInfo, callback) {
		if (draftInfo.idPost === undefined) {
			myWordpress.addPost (appPrefs.idLastSiteChosen, draftInfo, function (err, theNewPost) { //5/7/25 by DW
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
			
			globals.theEditor.val (globals.theDraft.content)
			
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
						if (flReverseSort) { //7/11/22 by DW
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
			
			function getFeedlandTimeString (when, flLongStrings=false) {
				const options = {
					flBriefYearDates: true,
					nowString: "now"
					};
				
				var s = formatDate (when, "%b %Y");  //Feb 2022
				
				
				return (s);
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
				function getSiteId () {
					const theCell = $("<td>" + item.idSite + "</td>");
					return (theCell);
					}
				function getDateValue (when, meaning) {
					const theCell = $("<td></td>");
					const whenstring = getFeedlandTimeString (when);
					const theDate = $("<span class=\"spSitedate\">" + whenstring + "</span>");
					addToolTip (theDate, "When the site was " + meaning + ".");
					theCell.append (theDate);
					return (theCell);
					}
				theRow.append (getSiteName ());
				return (theRow);
				}
			
			const theList = myWordpress.getSiteList ();
			function sortTheList () {
				theList.sites.sort (function (a, b) {
					switch (options.sortBy) {
						case "name":
							var alower = a.name.toLowerCase (), val;
							var blower = b.name.toLowerCase ();
							if (options.flReverseSort) { //7/11/22 by DW
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
				theDraft.whenPublished = theNewPost.whenPublished; //5/17/24 by DW
				theDraft.author = theNewPost.author;
				theDraft.flEnablePublish = false;
				globals.theDraft = theDraft;
				saveDraft (theDraft, function (err, data) { 
					if (!err) {
						speakerBeep ();
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
		divDraftDataViewer = $(".divDraftDataViewer");
		const d = globals.theDraft;
		function ifNotUndefined (val) {
			if (val) {
				return (val);
				}
			else {
				return (undefined);
				}
			}
		const properlyOrderedObject = {
			title: ifNotUndefined (d.title),
			content: ifNotUndefined (d.content),
			contentType: ifNotUndefined (d.contentType),
			categories: ifNotUndefined (d.categories),
			author: ifNotUndefined (d.author),
			idDraft: ifNotUndefined (d.idDraft),
			idPost: ifNotUndefined (d.idPost),
			idSite: ifNotUndefined (d.idSite),
			flDraftChanged: ifNotUndefined (d.flDraftChanged),
			flEnablePublish: ifNotUndefined (d.flEnablePublish),
			url: ifNotUndefined (d.url),
			whenCreated: ifNotUndefined (d.whenCreated),
			whenUpdated: ifNotUndefined (d.whenUpdated),
			whenPublished: ifNotUndefined (d.whenPublished),
			whichEditor: ifNotUndefined (d.whichEditor),
			}
		const draftViewerText = jsonStringify (properlyOrderedObject);
		if (draftViewerText != divDraftDataViewer.text ()) {
			const d = globals.theDraft;
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
			flConnected = myWordpress.userIsSignedIn ()
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
			$(idActive).css ("display", "block")
			}
		if ($(idOther).css ("display") != "none") {
			$(idOther).css ("display", "none")
			}
		
		if (flConnected) { //11/12/25 by DW
			$("#idMainMenu").css ("display", "block")
			}
		else {
			$("#idMainMenu").css ("display", "none")
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
			$("#idPostButton").prop ("disabled", flDisabled)
			}
		function enableViewPostButton ()  {
			const flDisabled = getBoolean (globals.theDraft.url !== undefined) ? false : true;
			$("#idViewPostButton").prop ("disabled", flDisabled)
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
	if (globals.flDraftChanged) { //4/5/24 by DW
		if (secondsSince (globals.autosaveClock) > appPrefs.minSecsBetwSave) {
			globals.flDraftChanged = false;
			saveDraft (globals.theDraft);
			updateDraftViewer ();
			}
		}
	}

function startTextarea (userOptions) {
	var options = {
		initialContent: undefined,
		whereToAppend: undefined
		}
	mergeOptions (userOptions, options);
	
	const theEditor = $("<textarea></textarea>");
	theEditor.attr ("placeholder", encodeXml (appConsts.placeholderForTextarea));
	options.whereToAppend.append (theEditor);
	globals.theEditor = theEditor;
	
	function fixHeight (div) {
		div.css ("height", "auto"); //grow or shrink the box based on what has changed in the text 
		div.css ("height", div.prop ("scrollHeight") + "px"); 
		}
	function textChanged () { //10/9/25 by DW
		function setDraftinfoContent (mdtext) { 
			const theDraft = globals.theDraft;
			theDraft.content = mdtext;
			theDraft.contentType = "markdown";
			theDraft.flEnablePublish = true;
			draftChanged (theDraft);
			}
		setDraftinfoContent (theEditor.val ());
		fixHeight (theEditor);
		draftChanged ();
		}
	
	if (options.initialContent !== undefined) {
		theEditor.val (options.initialContent); 
		fixHeight (theEditor);
		}
	
	theEditor.on ("focusEditor", function () {
		theEditor.focus ();
		})
	theEditor.click (function () {
		theEditor.addClass ("editing");
		});
	theEditor.on ("input", function () { //the content we're editing has changed
		textChanged ();
		});
	theEditor.on ("paste", function (event) { //10/8/25 by DW
		const theTextArea = this;
		const clipboardData = event.originalEvent.clipboardData;
		const theText = clipboardData.getData ("text");
		if (beginsWith (theText, "http://") || beginsWith (theText, "https://")) {
			event.preventDefault ();
			const selstart = theTextArea.selectionStart, selend = theTextArea.selectionEnd;
			const selectedText = theEditor.val ().substring (selstart, selend);
			if (selectedText.length > 0) {
				const link = `[${selectedText}](${theText})`;
				
				theTextArea.focus ();
				theTextArea.setSelectionRange (selstart, selend);
				document.execCommand ("insertText", false, link);
				textChanged ();
				}
			else {
				document.execCommand ("insertText", false, theText);
				}
			}
		})
	theEditor.on ("set", function (event, theText) { 
		theEditor.val (theText); 
		textChanged ();
		});
	
	return (theEditor);
	}

function startup () {
	console.log ("startup");
	const wpOptions = {
		serverAddress: "https://wordland.dev/",
		urlChatLogSocket: "wss://wordland.dev/",
		flMarkdownProcess: false //if true it would convert content to html when we publish -- 10/10/24 by DW
		}
	myWordpress = new wordpress (wpOptions);
	myWordpress.startup (function (err) {
		if (err) {
			alertDialog ("Can't run the app because there was an error starting up.");
			}
		else {
			if (myWordpress.userIsSignedIn ()) {
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
									}
								else {
									globals.theDraft = theDraft;
									editorOptions.initialContent = theDraft.content;
									startTextarea (editorOptions); //start the content from the previous edit
									updateDraftViewer ();
									updateTitleViewer ();
									}
								updateForLogin (); 
								});
							}
						else {
							startTextarea (editorOptions); //start the area empty
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
