# T7-S02 — API engine locale

**Status:** Done
**Opened:** 2026-07-31
**Closed:** 2026-08-01

---

## Goal

Exposer une API HTTP locale depuis l'engine (`webette api`) permettant à toute interface (l'app desktop en premier) de piloter webette sans réintégrer sa logique : lancer un build, démarrer/arrêter un serve, consulter l'état et lire les logs en polling. L'engine reste l'outil complet et autonome ; l'app n'est qu'une télécommande.

## In scope

- Créer `packages/engine/src/index.ts` (point d'entrée public déclaré dans `exports` mais actuellement manquant) exposant au minimum `build`, `serve`, la version et les types associés.
- Refactor léger de `serve()` : retourner un handle contrôlable (`{ stop() }` — arrêt propre du serveur HTTP + watcher). Le CLI conserve son comportement bloquant actuel.
- Nouvelle commande CLI `webette api [--port <n>]` qui démarre le serveur API local.
- Endpoints (un seul site actif à la fois) :
  - `GET /status` → état global : version engine, site actif éventuel, serve actif (port), dernier build.
  - `POST /build` → body `{ rootDir, options? }` ; synchrone : répond à la fin du build avec un résumé (succès/erreurs/durée).
  - `POST /serve` → body `{ rootDir, options? }` ; démarre le serve via le handle ; erreur si un serve tourne déjà.
  - `POST /stop` → arrête le serve actif.
  - `GET /logs?since=<cursor>` → entrées de `.webette/logs.jsonl` du site actif depuis le curseur (polling).
- Réponses JSON homogènes (`{ ok, data }` / `{ ok: false, error }`) + codes HTTP corrects.
- Validation manuelle complète via `curl` sur `packages/app/tutorial`.

## Out of scope

- Streaming temps réel des logs (SSE/WebSocket) — c'est T7-S03.
- Intégration côté app (spawn du process, UI) — c'est T7-S04.
- Multi-sites simultanés (un seul site actif à la fois dans cette story).
- Build asynchrone avec jobs/queue (le build répond de façon synchrone).
- Authentification (API locale, bind sur 127.0.0.1 uniquement).

---

## Done when

1. `bun run packages/engine/src/cli.ts api` démarre le serveur API sur 127.0.0.1 (port par défaut ou `--port`).
2. `curl POST /build` sur `packages/app/tutorial` exécute un build complet et répond avec un résumé exact (succès, erreurs, durée).
3. `curl POST /serve` démarre le serve ; le site répond sur son port ; `GET /status` reflète l'état ; `POST /stop` l'arrête proprement (port libéré, watcher fermé) ; un second `/serve` sans stop renvoie une erreur claire.
4. `GET /logs?since=...` renvoie les nouvelles entrées de logs sans relire tout le fichier à chaque appel.
5. `webette build` et `webette serve` en CLI gardent exactement leur comportement actuel.
6. Typecheck vert ; build du tutorial identique à avant la story.

---

## Execution brief

### Étapes courtes et vérifiables

1. **`src/index.ts` public** — créer le point d'entrée manquant (exports : `build`, `serve`, types `BuildOptions`/`ServeOptions`, version). Vérif : `import { build } from "webette"` fonctionne depuis `packages/app`.
2. **Handle de serve** — refactor `core/serve.ts` : extraire le `keepProcessAlive` du cœur, retourner `{ port, stop(): Promise<void> }` (fermeture `Bun.serve` + `watcher.close()`). Le CLI appelle `serve(...)` puis attend indéfiniment comme avant. Vérif : `webette serve` inchangé + petit script qui start/stop deux fois de suite sans EADDRINUSE.
3. **Squelette `webette api`** — dispatch CLI + `Bun.serve` sur 127.0.0.1 + `GET /status` minimal. Vérif : `curl /status`.
4. **`POST /build`** — appel direct de `build()` avec le logger existant ; réponse synchrone avec résumé. Vérif : `curl` sur le tutorial, `_public` généré.
5. **`POST /serve` + `POST /stop`** — état interne (un seul site actif), utilisation du handle. Vérif : cycle serve → status → stop → serve.
6. **`GET /logs`** — lecture incrémentale de `.webette/logs.jsonl` (curseur = offset octets ou timestamp). Vérif : deux appels successifs, le second ne renvoie que le delta.
7. **Passe finale** — typecheck, build tutorial non modifié, doc rapide des endpoints dans la story.

### État interne de l'API (v1)

```ts
{
  activeSite: string | null,        // rootDir du site piloté
  serve: { handle, port } | null,   // serve en cours
  lastBuild: { at, ok, durationMs, errors } | null
}
```

---

## Constraints and traps

- `serve()` fait un build initial puis `Bun.serve` + `watch` : le stop doit fermer LES DEUX (serveur + watcher), sinon fuite de watcher et rebuilds fantômes après stop.
- Ne PAS lancer `serve` pendant les validations sans demande explicite de l'user (DECISIONS 2026-02-06) — les tests du cycle serve/stop se font avec son accord.
- `logs.jsonl` est en append : le curseur par offset d'octets est le plus simple, mais penser au cas où le fichier est recréé/tronqué (nouveau build) → si offset > taille du fichier, repartir de 0.
- Le logger écrit dans le `.webette/` du SITE, pas de l'engine : `GET /logs` dépend d'un site actif ; réponse claire si aucun site n'a encore été piloté.
- Bind exclusivement 127.0.0.1 (jamais 0.0.0.0) : API de pilotage local, pas de surface réseau.
- Un build via API pendant qu'un serve tourne sur le même site = écritures concurrentes dans `_public` : interdire (erreur claire) dans cette v1.
- Ports : le port de l'API et celui du serve sont distincts ; erreur explicite si le port serve est occupé.

## Checks to run

```
bun run typecheck
bun run packages/engine/src/cli.ts build packages/app/tutorial   # comportement CLI inchangé
bun run packages/engine/src/cli.ts api                            # puis, dans un autre terminal :
curl -s localhost:<port>/status
curl -s -X POST localhost:<port>/build -d '{"rootDir":"packages/app/tutorial"}'
curl -s -X POST localhost:<port>/serve -d '{"rootDir":"packages/app/tutorial"}'   # avec accord user
curl -s localhost:<port>/logs
curl -s -X POST localhost:<port>/stop
```

## Evidence expected

- Sorties `curl` des 5 endpoints (status/build/serve/stop/logs) sur le tutorial.
- Démonstration du cycle serve → stop → serve sans erreur de port.
- Typecheck vert + build CLI inchangé.

## Documentation impact

- Site de doc : nouvelle page "Local API" (commande `webette api`, endpoints, exemples curl) — à traiter dans le batch doc habituel (T9), pas dans cette story.
- `ArPiDev/CODEMAP.md` : ajouter la commande `api` dans "How to run" et le module dans le component map à la clôture.

---

## Dev log

### 2026-07-31

**Cadrage (Pilot + user)**

Décisions validées ensemble :
- Architecture : commande `webette api` (process séparé) plutôt qu'API in-process dans l'app. Raison : l'engine reste l'outil complet utilisable en CLI ; l'app est une simple interface qui le pilote sans réintégrer sa logique.
- Un seul site actif à la fois (multi-sites hors scope v1).
- Refactor de `serve()` en handle contrôlable plutôt que spawn de process enfant.
- `POST /build` synchrone (pas de job queue) — un build tutorial ≈ 2 s, un spinner suffit côté UI.
- Découverte au cadrage : `packages/engine/package.json` déclare `"exports": { ".": "./src/index.ts" }` mais le fichier n'existe pas — sa création intègre le scope.

### 2026-08-01

**Implémentation complète (Dev + user)**

Étapes réalisées dans l'ordre du brief :

1. **`src/index.ts` public** — créé : exporte `build`, `serve`, `createProjectLogger`, `loadVersion` + types `BuildOptions`/`ServeOptions`/`ServeHandle`/`Logger`. Vérifié par import réel depuis `packages/app` (`import { build } from "webette"` → OK, version 0.2025.120).
2. **Handle de serve** — `serve()` retourne désormais `ServeHandle { port, stop() }`. `stop()` ferme le timer de rebuild, tous les watchers (`FSWatcher[]` désormais référencés) puis `server.stop(true)` ; flag `stopped` pour bloquer les rebuilds fantômes ; idempotent. `keepProcessAlive` déplacé dans le CLI (comportement bloquant inchangé). Nouvelle clé i18n `serve.stopped` (en/fr). Vérifié : deux cycles start→stop consécutifs sans EADDRINUSE, port réellement fermé après stop.
3. **`webette api`** — nouveau module `core/api.ts` (`startApiServer`), commande CLI `api [--port <n>]` (défaut 4177), bind exclusif 127.0.0.1, logger console-only pour l'API elle-même (chaque site piloté garde son logger projet dans son `.webette/`). Clés i18n `api.listening`/`api.stopped`/`api.request`/`cli.help.api` (en/fr).
4. **Endpoints** — `GET /status`, `POST /build` (synchrone, résumé `{ at, ok, durationMs, errors }`), `POST /serve`, `POST /stop`, `GET /logs?since=<offset octets>`. Réponses homogènes `{ ok, data }` / `{ ok: false, error }` ; 400 body invalide, 404 route inconnue, 409 conflits (double serve, build pendant serve, stop sans serve, logs sans site actif), 500 inattendu.
5. **`GET /logs`** — lecture incrémentale par offset d'octets ; ne consomme que les lignes complètes (la ligne partielle reste pour le poll suivant) ; si offset > taille du fichier (recréation/troncature) → repart de 0 avec `reset: true`.

**Evidence (curl sur packages/app/tutorial, API port 4177) :**

- `/status` initial : `{"ok":true,"data":{"version":"0.2025.120","activeSite":null,"serve":null,"lastBuild":null}}`
- `/build` : `{"ok":true,"data":{"at":"2026-08-01T12:31:03.716Z","ok":true,"durationMs":6716,"errors":[]}}`
- `/logs?since=0` → 203 entrées, cursor 41225 ; second appel avec ce cursor → 0 entrée (delta seul) ; `since=999999999` → `reset: true`, relecture depuis 0.
- Cycle serve : `/serve` → site 200 sur 4173 → `/status` reflète `serve.port` → second `/serve` → 409 clair → `/build` pendant serve → 409 clair → `/stop` → re-`/serve` OK → `/stop` → `/stop` sans serve → 409 → port 4173 réellement fermé.
- Erreurs : rootDir inexistant → 400 ; body non-JSON → 400 ; route inconnue → 404.

**Non-régression :**

- `webette build packages/app/tutorial` : inchangé, exit 0, build 6.1s.
- `webette serve` : comportement bloquant conservé (keepalive côté CLI).
- Typecheck monorepo vert (engine + app).
- Test handle : 2 cycles start/stop programmatiques sans erreur de port.

**Choix d'implémentation notés :**

- Port API par défaut : 4177 (constante `DEFAULT_API_PORT`, pas de nouvelle entrée env pour cette v1).
- `idleTimeout: 255` sur le serveur API (builds synchrones potentiellement longs).
- `/build` répond 200 avec `ok: false` + erreurs dans le résumé si le build échoue (l'appel API a réussi, c'est le build qui a échoué) ; les 4xx/5xx restent pour les erreurs de requête/API.
- `rootDir` résolu en chemin absolu côté API (comparaisons d'état fiables).

**Révision post-review (user) — codes d'erreur stables :**

Les erreurs API ne passent pas par l'i18n : ce sont des messages de protocole machine-à-machine, pas de la sortie console. Décision (avec user) : chaque erreur porte un `code` stable (`ApiErrorCode` exporté : `invalid_json_body`, `invalid_root_dir`, `serve_already_running`, `no_serve_running`, `no_active_site`, `unknown_route`, `internal_error`, etc.) sur lequel le client matche et traduit lui-même ; le champ `error` reste un message anglais de debug/fallback. Format : `{ ok: false, code, error }`. Vérifié au curl sur 3 cas (route inconnue, stop sans serve, body invalide).

---

## Commit proposal

**Title:** `feat(cli): local control API (webette api) and controllable serve handle`

**Description:**

- Add `webette api [--port <n>]` starting a local HTTP control API bound to 127.0.0.1 (default port 4177) with GET /status, POST /build (synchronous summary), POST /serve, POST /stop and GET /logs?since=<byte-offset> (incremental JSONL reading with truncation reset).
- Refactor `serve()` to return a controllable handle `{ port, stop() }` closing the HTTP server, all file watchers and the rebuild timer; the CLI keeps its blocking behavior.
- Create the missing public entrypoint `packages/engine/src/index.ts` (build, serve, logger, version and related types) declared in `exports`.
- Enforce single-active-site guards with uniform responses: `{ ok, data }` on success, `{ ok: false, code, error }` on failure with stable machine-readable codes (409 on double serve, build during serve, stop without serve).
- Validate with curl on packages/app/tutorial (all endpoints, serve→stop→serve cycle without port errors), unchanged CLI build/serve behavior and green monorepo typecheck.

---

## Pilot exchange

*(à compléter pendant l'exécution)*

