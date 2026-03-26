# T7-S01 — POC ElectroBun

**Status:** Done, Validated
**Opened:** 2026-03-26
**Closed:** 2026-03-27

---

## Goal

Valider qu'ElectroBun peut servir de base pour l'app desktop Webette : ouvrir une fenêtre native avec webview, importer l'engine depuis le process principal, et faire communiquer les deux via RPC. Identifier les blockers éventuels (Windows 10 notamment) avant d'investir dans l'API.

## In scope

- Créer `packages/desktop` comme nouveau workspace Bun avec ElectroBun.
- Ouvrir une `BrowserWindow` avec une webview HTML minimale.
- Importer `loadVersion()` (ou toute fonction simple) depuis `packages/engine` dans le main process — prouver que le lien workspace fonctionne.
- Afficher la version de l'engine dans la webview via RPC (main → webview).
- Ajouter un bouton dans la webview qui déclenche un appel RPC vers le main process et reçoit une réponse.

## Out of scope

- Tout appel à `build` ou `serve` réel (c'est T7-S02).
- UI design.
- Packaging/distribution (c'est T7-S05).
- Tests automatisés.

---

## Done when

1. `bun dev` dans `packages/desktop` ouvre une fenêtre native.
2. La webview affiche la version de l'engine (importée depuis `packages/engine` dans le main process, passée via RPC).
3. Un bouton dans la webview déclenche un ping RPC → le main process répond → la webview affiche la réponse.
4. Aucune erreur dans les logs de démarrage.
5. Fonctionne sur la machine de dev (Windows 10) — ou blocker documenté si Windows 10 est hors support.

---

## Execution brief

### Structure cible

```
packages/desktop/
  electrobun.config.ts
  package.json           (name: "webette-desktop", dep: "webette": "workspace:*")
  src/
    bun/
      index.ts           (main process : BrowserWindow + RPC handlers)
    web/
      index.html         (webview : bouton + affichage réponse)
      index.ts           (Electroview + RPC calls)
```

Ajouter `packages/desktop` aux workspaces dans le `package.json` racine.

### Main process (`src/bun/index.ts`)

```ts
import { BrowserWindow } from "electrobun/bun";
import { loadVersion } from "webette"; // import engine via workspace

const win = new BrowserWindow({
  url: "views://index.html",
  rpc: {
    getVersion: () => loadVersion(),
    ping: () => "pong",
  },
});
win.show();
```

### Webview (`src/web/index.ts`)

```ts
import { Electroview } from "electrobun/electroview";
const rpc = new Electroview(/* config */);

// Afficher la version au chargement
const version = await rpc.getVersion();
document.getElementById("version").textContent = version;

// Bouton ping
document.getElementById("btn").addEventListener("click", async () => {
  const result = await rpc.ping();
  document.getElementById("result").textContent = result;
});
```

### Workspace

Ajouter dans `package.json` racine :
```json
"workspaces": ["packages/*", "packages/desktop"]
```
(si `packages/*` ne couvre pas déjà les sous-dossiers directs — à vérifier).

---

## Constraints and traps

- **Windows 10** : ElectroBun supporte officiellement Windows 11+. Tester en premier sur la machine de dev. Si ça bloque, documenter le blocker et décider si on cible Windows 11 uniquement ou si on cherche un workaround.
- **Prérequis Windows** : Visual Studio Build Tools + CMake sont nécessaires pour le packaging final (T7-S05), probablement pas pour `bun dev` (binaires natifs pré-compilés téléchargés via `bun install`). Ne pas bloquer le POC sur ça.
- **Export de l'engine** : vérifier que `loadVersion` (ou la fonction choisie) est bien exportée depuis le point d'entrée de `packages/engine` (son `package.json` → `"main"` ou `"exports"`).
- **RPC typé** : la config RPC d'ElectroBun est typée — les fonctions main et webview doivent être déclarées des deux côtés. Suivre la doc exacte pour éviter les erreurs silencieuses.
- Ne pas sur-ingénierer : c'est un POC, pas la vraie architecture — juste valider que ça fonctionne ensemble.

---

## Checks to run

```
# Prérequis
bun --version            # suffit pour le dev

# Setup
cd packages/desktop
bun install
bun dev                  # doit ouvrir une fenêtre native

# Dans la fenêtre
# → version de l'engine visible
# → clic sur le bouton → "pong" affiché
```

## Evidence expected

- Screenshot de la fenêtre native ouverte avec la version affichée et la réponse du ping.
- Ou, si Windows 10 bloque : message d'erreur exact + analyse go/no-go.

---

## Dev log

### 2026-03-27

**Setup packages/app**

Ajout de `electrobun: "^1.16.0"` dans `packages/app/package.json` + script `"dev": "electrobun dev"`. Création de `electrobun.config.ts` : app `Webette` / `org.webette.desktop` / `0.1.0`, entrypoints `./src/bun/index.ts` + `./src/web/index.ts`, copy HTML `./src/web/index.html` → `views/main/index.html`.

**Blocker tar sur Windows (git-bash)**

`bunx electrobun init` et `bun run dev` échouent : le `@` dans `.bun/electrobun@1.16.0/` est interprété par git-bash tar comme `user@host`.
Fix : téléchargement manuel de `electrobun-cli-win-x64.tar.gz` via PowerShell vers `C:\Temp`, extraction là, copie de `electrobun.exe` vers `.bun/electrobun@1.16.0/node_modules/electrobun/bin/` et `.cache/`.

**Clarification architecture**

Démarré dans `packages/desktop` (erreur), corrigé vers `packages/app` après clarification user : `packages/app` est l'app desktop. Le dossier `tutorial/` sera bundlé avec l'app pour l'onboarding.

**Fenêtre noire**

La fenêtre s'ouvre mais noire. Cause : HTML non copié dans le build (`views/main/index.html` absent).
Fix : ajout de `copy: { "./src/web/index.html": "views/main/index.html" }` dans `electrobun.config.ts`.

**Version "unknown"**

Version reste "unknown". Cause : `loadVersion()` utilisait `import.meta.url` qui dans le bundle pointe vers `main.js`, pas vers le `package.json` source.
Fix : `import enginePkg from "../../../engine/package.json" with { type: "json" }` — résolution au bundle-time.

**Erreur `defineElectrobunRPC` côté webview**

`src/web/index.ts` utilisait `defineElectrobunRPC` depuis `electrobun/view` — non exporté côté browser. Seuls `createRPC` et `Electroview` sont disponibles dans le contexte webview.
Fix : réécriture avec `createRPC<LocalSchema, RemoteSchema>({})`.

**Résultat final validé (screenshots user)**

- Fenêtre native "Webette" ouverte sur Windows 10 ✓
- Version `0.2025.120` affichée via RPC ✓
- Bouton "Ping bun process" → "pong" ✓

---

## Pilot exchange

**Clarification architecture :** `packages/app` est l'app desktop (pas de `packages/desktop`). Le dossier `tutorial/` sera bundlé avec l'app et copié chez l'user lors de l'onboarding.

**Décisions :**
- JSON import assertion (`with { type: "json" }`) pour la version engine — résolution build-time, pas runtime (`import.meta.url` ne fonctionne pas dans un bundle ElectroBun).
- RPC typé via `ElectrobunRPCSchema` + `defineElectrobunRPC` côté bun, `createRPC<Local, Remote>` côté webview.
- Visual Studio Build Tools / CMake : pas nécessaires pour le mode dev (uniquement pour le packaging T7-S05). Corrigé dans la story.
- ElectroBun est officiellement Windows 11+ mais fonctionne sur Windows 10 — validé sur machine dev.

**Commit proposal :**

```
feat(app): POC ElectroBun — native window + webview + typed RPC

- Add electrobun.config.ts: app metadata, bun/web entrypoints, HTML copy.
- Add src/bun/index.ts: BrowserWindow + defineElectrobunRPC (getVersion, ping).
- Add src/web/index.ts: createRPC + Electroview, version on load + ping button.
- Add src/web/index.html: dark theme matching tutorial site colors.
- Engine version inlined at bundle time via JSON import assertion
  (avoids import.meta.url breakage in bundled ElectroBun context).
- Validated on Windows 10: window opens, version 0.2025.120 displays, ping/pong RPC works.
```
