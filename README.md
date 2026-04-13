# wpEditorDemo

Fully functional browser-based editors that plugs into WordPress via  <a href="https://github.com/scripting/wpIdentity">wpIdentity</a>. 

This is the same API WordLand uses to connect to WordPress and any app that also supports this interface can replace WordLand. 

From these demos it should be easy to adapt any browser-based text editor to work with WordPress in the same way WordLand does. 

I want to create a community of writing tools that work with WordPress. WordLand was developed to help seed the process. 

<a href="http://scripting.com/">DW</a>

Updates as of April 2026

1. We now have a third app, one that lets the user edit their posts with the Gutenberg editor. 

2. I'm doing this project with Claude.ai. It's my first project managed with an AI app. It's a great experience, I plan to do more of this kind of work, after we're done with this adaptation. 

3. There's a new apps folder in this repo, and the first new app, for <a href="https://github.com/scripting/wpEditorDemo/tree/main/apps/gutenberg">Gutenberg</a>. The app and the docs were written by Claude.ai. I find its code very clear and understandable, and it's amazing to me that I barely had to even look at the code. It was adapted from the original demo app which I wrote in full myself.

4. There's a <a href="https://github.com/scripting/wpEditorDemo/tree/main/docs">docs folder</a> containing two files, an explainer for developers and one for their AI assistants. Both were written by Claude.ai. The idea of instructions for your AI helper are a new idea as far as I know. I plan to include one of these docs with every project I work on. 

### Demos

This repo contains the source code to a very plain editor and a Gutenberg-based editor. 

You can try the demo for the first app here: <a href="https://demo.wpidentity.org/">demo.wpidentity.org</a>.

And for the Gutenberg editor: <a href="https://demo.gutenberg.land/">demo.gutenberg.land</a>.

Tour of the user interface.

* New post button -- with confirmation it replaces the post you're editing with a new empty post. 

* Choose site button -- you can't publish a post until you've chosen which site it will be posted to. 

* View post button -- if you're published the post you're editing, it will open it in a new browser tab.

* Publish button -- only enabled if you've chosen a site and the text of the post has changed since the last publish.

* Set title menu command -- titles are optional. You can also set the title by clicking in the title area above the editing box.

* Log off WordPress.com -- when you're finished with the demo. 

Here's a <a href="https://imgs.scripting.com/2025/11/14/editorDemoScreen.png">screen shot</a>.

### Goals

For developers

1. API does all the networking, you can focus on editing.

3. Interop is easy because all editors use Markdown.

2. Users control the storage, you don't have to be a reseller, stick to what you do best.

For writers

3. Use your favorite editor, change your mind, use both.

4. Your files are yours, they don't belong to a single app.

### What this is

Assuming you want to create an editor that works alongside WordLand, editing text in Markdown, publishing to WordPress, this is the easiest way to get going. It's basically all the functionality I developed for WordLand put into a package that makes it easy to hook into an existing editor. 

Yes it needs a lot of docs. But it does what it  set out to do -- provides full example code for hooking a JS-based editor to WordPress via <a href="https://github.com/scripting/wpIdentity">wpIdentity</a>. And we can get started with the docs, by people adapting existing editors, and posting issues and we can work them out. 

Note I don't take pull requests, preferring well-written bug reports, and I'll make the fixes myself. There are a lot of interdependencies in code like this, and it's unreasonable to expect people to know how things fit together because they found a problem. Also I do all my editing in an outliner, and changes have to be made there before they go out via the flat text files. 

The outline source is also provided, in source.opml. 

I want this to be a big thing. It's a big part of what I did with WordLand, was create a way for lots of editors to work with WordPress posts. This a step in building a social web that has all replaceable parts. WordPress is a very strong foundation to build on. And it has a great API that makes a project like this possible. 

### Code-reading hint

Look for <i>myWordpress</i> in the code. Those are the points where this demo app connects to WordPress via wpIdentity. 

Here's a list of these calls, in alphabetic order, in the code as of November 14, 2025.

* myWordpress.addPost

* myWordpress.connectWithWordpress

* myWordpress.deleteSourceFiles

* myWordpress.getSiteList

* myWordpress.getSourceFiles

* myWordpress.getUserInfoSync

* myWordpress.logOffWordpress

* myWordpress.readDraft

* myWordpress.readUserDataFile

* myWordpress.startup

* myWordpress.updatePost

* myWordpress.userIsSignedIn

* myWordpress.writeUniqueFile

* myWordpress.writeUserDataFile

The source code for the <i>wordPress</i> object is in <a href="https://github.com/scripting/wpIdentity/blob/main/client/api2.js">api2.js</a> in wpIdentity. 

