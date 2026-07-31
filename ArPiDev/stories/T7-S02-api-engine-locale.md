# T7-S02 — API engine locale

**Status:** In progress
**Opened:** 2026-07-31
**Closed:** —

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

---

## Pilot exchange

*(à compléter pendant l'exécution)*
