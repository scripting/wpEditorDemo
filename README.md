# wpEditorDemo

Fully functional browser-based editor that plugs into WordPress via  <a href="https://github.com/scripting/wpIdentity">wpIdentity</a>. 

From this demo it should be easy to adapt any browser-based text editor to work with WordPress in the same way WordLand does. 

<a href="http://scripting.com/">DW</a>

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

### Demo

This repo contains the source code to a very plain textarea that you can edit text in. 

You can try the demo here: <a href="https://demo.wpidentity.org/">demo.wpidentity.org</a>.

To get started click the button to log on to WordPress.com. 

Tour of the user interface.

* New post button -- with confirmation it replaces the post you're editing with a new empty post. 

* Choose site button -- you can't publish a post until you've chosen which site it will be posted to. 

* View post button -- if you're published the post you're editing, it will open it in a new browser tab.

* Publish button -- only enabled if you've chosen a site and the text of the post has changed since the last publish.

* Set title menu command -- titles are optional. You can also set the title by clicking in the title area above the editing box.

* Log off WordPress.com -- when you're finished with the demo. 

Here's a <a href="https://imgs.scripting.com/2025/11/14/editorDemoScreen.png">screen shot</a>.

