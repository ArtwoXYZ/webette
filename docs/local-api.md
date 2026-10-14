# Local API

`webette api` starts a small HTTP server that lets another program drive the
engine: the desktop app, or a script. It listens on `127.0.0.1` only (default
port 4177, `--port <n>` to change it) and handles one active site at a time.

Code: `packages/engine/src/core/api.ts`.

## Responses

Every endpoint except the log stream answers in JSON:

- success: `{ "ok": true, "data": ... }`
- failure: `{ "ok": false, "code": "...", "error": "..." }`

`code` is stable and meant for programs (`ApiErrorCode` lists them all);
`error` is an English message for debugging.

## Endpoints

| Endpoint | What it does |
| --- | --- |
| `GET /status` | Engine version, active site, running serve, last build summary. |
| `POST /build` | Builds a site and answers once the build is over. Body: `{ "rootDir": "...", "options": { ... } }`. |
| `POST /serve` | Starts the dev server on a site. Same body as `/build`. |
| `POST /stop` | Stops the running serve. |
| `GET /logs?since=<cursor>` | Log entries written since the cursor (polling). |
| `GET /logs/stream` | Log entries as they are written (live stream). |

The active site is the last one given to `/build` or `/serve`. Both log
endpoints read its log file, `<site>/<logging.dirName>/logs.jsonl`
(see [logging.md](logging.md)).

## Logs: polling

`GET /logs?since=<cursor>` returns `{ entries, cursor, reset }`.

- `entries`: the log entries, as persisted in `logs.jsonl`.
- `cursor`: a byte offset in the log file. Send it back as `since` to get only
  what came after. `since` defaults to `0`, the top of the file.
- `reset`: `true` when the file became shorter than `since` (it was deleted or
  recreated); the entries then start again from the top.

It fails with `no_active_site` until a first `/build` or `/serve`.

## Logs: live stream

`GET /logs/stream` keeps the connection open and sends
[server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events).
It reads the same file as the polling endpoint, so both give the same entries
and the same cursors. Polling keeps working next to it.

```
id: 164
event: log
data: {"timestamp":"...","level":"info","scope":"webette.api.serve.serve","messageKey":"serve.initialBuild","params":{...}}
```

- `log`: one log entry. Its `id` is the cursor right after that entry, usable
  as `since` on either endpoint.
- `reset`: what was received so far no longer continues, either because
  another site became active or because the log file was recreated.
  `data` is `{ "site": "<rootDir>" }`. It carries no `id`.

Where the stream starts:

- without `since`, only entries written after the connection are sent;
- with `?since=<cursor>`, the entries after that cursor are sent first, then
  the live ones. `since=0` replays the whole file;
- an `EventSource` that reconnects sends its last `id` back in the
  `Last-Event-ID` header, which is read as `since`: nothing is lost in between.

The stream can be opened before any site is active. It then waits, and starts
with the first entry of the `/build` or `/serve` that makes a site active.
This is the way to follow a build from its first line, since `POST /build`
only answers at the end.

```
curl -N http://127.0.0.1:4177/logs/stream
```

The engine looks at the log file four times a second, so an entry shows up a
fraction of a second after it is written. During the heavy steps of a build
the entries can arrive in groups.
