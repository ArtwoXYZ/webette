# What webette exposes on your machine

webette works on folders of your computer and starts small local servers.
This page says what each of them opens, writes and launches. The default is
always the private one.

## Local servers

| Server | Started by | Answers |
| --- | --- | --- |
| Site preview (`serve`) | `webette serve`, the app's Test button | this machine only (`127.0.0.1`) |
| Control API | `webette api`, the desktop app | this machine only (`127.0.0.1`), local programs only |
| App interface | the desktop app | this machine only (`127.0.0.1`) |

### Sharing a preview on your network

`serve` stays on your machine unless you ask otherwise:

```
webette serve my-site/ --share
```

With `--share`, other devices on the same network (a phone, another computer)
can open the site. webette logs the addresses to use and a warning: everything
in the output folder becomes readable by anyone on that network, drafts
included, until you stop the server. Only use it on a network you trust.

The desktop app never shares a preview. Programs driving the control API can
ask for it with `options.share` in `POST /serve`.

### Control API

The control API can build and serve any folder of the machine, so it is kept
out of reach:

- It binds to `127.0.0.1`; there is no option to change that.
- It refuses requests sent by web pages. A browser on the same machine can
  reach `127.0.0.1`, so any site could otherwise post to the API. Requests
  carrying an `Origin` header, or addressed to a host name other than
  `127.0.0.1` / `localhost`, get a `403` with the code `forbidden_caller` and
  a warning in the logs.

The desktop app runs its own API on a port chosen by the system and talks to
it from its main process, never from the web view.

`bun run preview:app --host <address>` is a development tool that puts the app
interface, and through it the control API, on the network. It also shares the
previews it starts. Keep it for networks you trust.

## What webette writes

- The engine writes in two folders, both inside the site folder: the output
  (`_public/`) and the logs (`.webette/`). Their names can be changed in
  `webette.tool.ts`, but only to a name inside the site folder: an absolute
  path or a `..` is refused with a warning and the default is used.
- `overwrite: "replace-all"` empties the output folder before a build. The
  rule above is what keeps that from ever reaching another folder.
- The desktop app keeps its own state (recent folders, language) in the
  system's user data folder for `org.webette.desktop`.

`webette.config.ts`, `webette.tool.ts` and plugins are programs: they run with
your rights and can do anything you can. Read them before building a site or a
starter you did not write. In the same spirit, the image, audio and video
output folders of `webette.config.ts` accept an absolute path, which is then
used as given.

## What the desktop app opens outside its window

Two buttons leave the app, and say so when hovered:

- **Website** opens the running preview in your web browser.
- **Folder**, while a preview runs, opens the site folder in the file
  explorer.

The app's main process refuses anything else: only `http` and `https`
addresses go to the browser, and only existing folders go to the file
explorer (never a file, which would launch the program tied to it).

webette's own code sends nothing over the Internet: no telemetry, no update
check.
