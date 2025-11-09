# wpEditorDemo

Fully functional browser-based editor that plugs into WordPress via the wpIdentity API. 

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

Yes it needs a lot of docs. But it does what it  set out to do -- provides full example code for hooking a JS-based editor to WordPress via wpIdentity. And we can get started with the docs, by people adapting existing editors, and posting issues and we can work them out. 

Note I don't take pull requests, preferring well-written bug reports, and I'll make the fixes myself. There are a lot of interdependencies in code like this, and it's unreasonable to expect people to know how things fit together because they found a problem. Also I do all my editing in an outliner, and changes have to be made there before they go out via the flat text files. 

The outline source is also provided, in source.opml. 

I want this to be a big thing. It's a big part of what I did with WordLand, was create a way for lots of editors to work with WordPress posts. This a step in building a social web that has all replaceable parts. WordPress is a very strong foundation to build on. And it has a great API that makes a project like this possible. 

