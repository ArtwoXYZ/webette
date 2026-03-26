# T6-S16 — Migration monorepo

Created: 2026-03-26
Closed: 2026-03-26
Acceptance: User

Status: Done, Validated

## Goal

Exécuter la migration monorepo définie dans T6-S12 : déplacer l'engine dans `packages/engine/`, créer le squelette `packages/app/`, déplacer la documentation dans `websites/documentation/`, configurer les Bun workspaces, et créer les workflows Spindles CI/Release.

Aucun code de l'engine n'est modifié — c'est un déplacement de fichiers + configuration.

---

## In scope

- Créer la structure `packages/engine/`, `packages/app/`, `websites/documentation/`, `.tangled/workflows/`
- Déplacer `src/` → `packages/engine/src/`
- Déplacer `locales/` → `packages/engine/locales/`
- Déplacer `webette.tool.ts` (racine) → `packages/engine/webette.tool.ts`
- Déplacer `webette-documentation/` → `websites/documentation/`
- Déplacer `website-example/` → `packages/app/tutorial/`
- Créer `packages/engine/package.json` (nom `webette`, `private: false`, `bin`, `exports`, version semver, script `typecheck`)
- Créer `packages/app/package.json` (squelette, `private: true`, dep `"webette": "workspace:*"`, script `typecheck`)
- Mettre à jour le `package.json` racine (workspaces, retrait des scripts `build/serve`, ajout script `typecheck`)
- Le `tsconfig.json` reste à la racine ; `packages/engine/tsconfig.json` étend la racine
- Créer `.tangled/workflows/ci.yml` et `.tangled/workflows/release.yml` selon D6
- Créer `CHANGELOG.md` à la racine (fichier vide ou placeholder)
- Supprimer `website-example-no-templates/` (contient uniquement `_public/` généré, pas de contenu source — voir Traps)
- Régénérer `bun.lock` via `bun install` depuis la racine

## Out of scope

- Aucun changement au code dans `src/`
- Pas de `packages/app/src/` (implémentation T7)
- Migration du contenu `docs/` vers `websites/documentation/` (story dédiée per D5)
- Configuration npm / premier publish
- Build des binaires

---

## Done when

1. `bun install` depuis la racine s'exécute sans erreur
2. `bun run --filter webette typecheck` passe sans erreur
3. `bun run --filter webette build` depuis la racine (ou `bun run build` depuis `packages/engine/`) lance le build webette sur le `websites/documentation/` déplacé sans erreur
4. La structure de fichiers correspond à D1 (T6-S12)
5. Les fichiers `ci.yml` et `release.yml` existent dans `.tangled/workflows/`

---

## Execution brief

### 1 — Structure cible rappel (D1)

```
webette/
├── packages/
│   ├── engine/
│   │   ├── package.json          (name: "webette", private: false)
│   │   ├── tsconfig.json         (extends: "../../tsconfig.json")
│   │   ├── src/                  ← depuis racine src/
│   │   ├── locales/              ← depuis racine locales/
│   │   └── webette.tool.ts       ← depuis racine webette.tool.ts
│   └── app/
│       ├── package.json          (private: true, dep workspace:*)
│       └── tutorial/             ← depuis racine website-example/
├── websites/
│   └── documentation/            ← depuis racine webette-documentation/
├── .tangled/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── docs/                         (inchangé, migration D5 séparée)
├── package.json                  (workspaces: ["packages/*"])
├── tsconfig.json                 (inchangé)
├── CHANGELOG.md                  (créé vide)
├── bun.lock                      (régénéré)
└── README.md, LICENSE, etc.      (inchangés)
```

### 2 — `packages/engine/package.json` cible (D2)

Version actuelle : `v0 2025.12.0` → mapping semver D2 → `0.2025.120`

```json
{
  "name": "webette",
  "version": "0.2025.120",
  "type": "module",
  "private": false,
  "bin": { "webette": "./src/cli.ts" },
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun run src/cli.ts build",
    "serve": "bun run src/cli.ts serve",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { ... },   ← reprendre depuis racine package.json actuel
  "optionalDependencies": { ... },
  "devDependencies": { "@types/bun": "latest" },
  "peerDependencies": { "typescript": "^5" }
}
```

### 3 — `packages/app/package.json` squelette (D3)

```json
{
  "name": "webette-app",
  "version": "0.2025.120",
  "type": "module",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "webette": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5"
  }
}
```

### 4 — `package.json` racine cible

```json
{
  "name": "webette-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "typecheck": "bun run --filter '*' typecheck"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

### 5 — `packages/engine/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json"
}
```

### 6 — Workflows (D6)

Contenu exact défini dans T6-S12 (voir story T6-S12 sections D6).

---

## Files / areas likely involved

- `package.json` (racine) — remplacé
- `webette.tool.ts` (racine) — déplacé
- `src/` — déplacé en bloc
- `locales/` — déplacé en bloc
- `webette-documentation/` — déplacé en bloc
- `website-example/` — déplacé en bloc
- `website-example-no-templates/` — supprimé (voir Traps)
- `bun.lock` — régénéré
- `node_modules/` — régénéré

---

## Constraints and traps

**Imports internes** : tous les imports dans `src/` sont relatifs → aucun changement nécessaire après déplacement.

**`webette.config.ts` dans les sites déplacés** : ces fichiers font référence à des chemins relatifs (`_templates/`, contenu). Après déplacement, les chemins restent valides car on déplace le dossier entier (pas de remontée de niveau).

**`website-example-no-templates/`** : ne contient que `_public/` (output généré), pas de source. À supprimer proprement. Si l'user veut le garder, le déplacer dans `packages/engine/` comme fixture de test.

**`bun.lock` et `node_modules/`** : après mise à jour du `package.json` racine (workspaces), il faut supprimer `node_modules/` et relancer `bun install` pour que les workspaces soient correctement liés.

**`tsconfig.json`** : reste unique à la racine. `packages/engine/tsconfig.json` doit l'étendre. Pas de tsconfig dans `packages/app/` pour l'instant (pas de code source app).

**Script `typecheck`** : le `tsconfig.json` racine a `noEmit: true` et `allowImportingTsExtensions: true`. `tsc --noEmit` dans `packages/engine/` doit pointer sur les sources engine. Si `tsc` ne trouve pas les fichiers avec `extends`, ajouter un `include: ["src/**/*"]` dans `packages/engine/tsconfig.json`.

**`docs/` et `ArPiDev/`, `ArPiDoc/`** : restent à la racine, inchangés.

---

## Checks to run

```bash
# Depuis la racine du monorepo
bun install

# Typecheck engine
bun run --filter webette typecheck

# Build webette sur un site — commande à lancer depuis packages/engine/
# (chemin relatif depuis packages/engine/ ; -v optionnel pour le verbose)
bun run build ../../websites/documentation
```

---

## Evidence expected

- Output `bun install` sans erreur, workspace engine résolu
- Output `typecheck` : 0 erreurs
- Output `build` : pages générées dans `_public/` du site cible
- `ls packages/engine/src/` montre les fichiers engine
- `ls websites/documentation/` montre le contenu doc déplacé
- `ls packages/app/tutorial/` montre le contenu website-example déplacé
- `.tangled/workflows/ci.yml` et `release.yml` présents

---

## Commit proposal

Title: `refactor(core): migrate to monorepo structure (packages/engine + packages/app)`
Description:
- Move `src/`, `locales/`, `webette.tool.ts` into `packages/engine/`; move `webette-documentation/` to `websites/documentation/` and `website-example/` to `packages/app/tutorial/`.
- Configure Bun workspaces at root; create `packages/engine/package.json` (name `webette`, version `0.2025.120`, bin, exports) and `packages/app/package.json` skeleton.
- Add `mdast` and `hast` devDeps (missing from original package.json); fix 3 pre-existing type errors uncovered by new typecheck script (`locale: Locale`, `Processor` cast, `@ts-expect-error` on `Bun.build` write option).
- Add `.tangled/workflows/ci.yml` and `release.yml` (Spindles CI/Release per D6).
- Update `.claude/launch.json` to new site path (`packages/app/tutorial`).
Scope(s):
- core
Why these scopes:
- Migration structurelle de l'engine (src/, configs, workspaces) — impact principal sur core. Workflows et launch.json sont des fichiers de config repo sans scope dédié.

---

## Pilot closure tasks

- Mettre à jour `ArPiDev/CODEMAP.md` : chemins `src/**` → `packages/engine/src/**`, `locales/**` → `packages/engine/locales/**`, `webette.tool.ts` → `packages/engine/webette.tool.ts`, section "How to run" (commandes depuis racine ou depuis `packages/engine/`), section "Entry points".

---

## Pilot exchange

- 2026-03-26 — Dev — Escalade : migration structurelle terminée, `bun install` OK. 3 erreurs typecheck pré-existantes bloquent `Done when` #2 — toutes dans `src/`, hors scope story. (1) `output.ts` : `locale: string` vs `Locale` dans `build/types.ts` — 1 ligne. (2) `html.ts` : type générique `Processor` unified incorrect après `.use()` — cast nécessaire. (3) `load-module.ts` : `write: false` absent des types `@types/bun@1.3.2` — `@ts-expect-error` ou upgrade bun types. **Question :** étendre le scope T6-S16 pour ces 3 fixes `src/`, ou créer une micro-story dédiée ?

- 2026-03-26 — Pilot — Recon sur l'état repo (structure racine, package.json, tsconfig.json, webette.tool.ts, contenu website-example et webette-documentation). Mapping complet vers D1. `website-example-no-templates/` identifiée comme output pur sans source → suppression recommandée. `website-example/` → `packages/app/tutorial/`, `webette-documentation/` → `websites/documentation/`. Version semver calculée : `0.2025.120`.

## Dev log

### 2026-03-26 — Migration structurelle complète, typecheck bloqué sur 3 erreurs pré-existantes

**Ce qui a été fait :**
- Dossiers créés : `packages/engine/`, `packages/app/`, `websites/documentation/`, `.tangled/workflows/`
- `src/` → `packages/engine/src/`, `locales/` → `packages/engine/locales/`, `webette.tool.ts` → `packages/engine/webette.tool.ts`
- `webette-documentation/` → `websites/documentation/`, `website-example/` → `packages/app/tutorial/`
- `website-example-no-templates/` supprimé (que du `_public/`)
- `packages/engine/package.json` créé (version `0.2025.120`, bin, exports, scripts, deps du package.json racine)
- `packages/app/package.json` créé (squelette, `workspace:*`)
- `packages/engine/tsconfig.json` créé (extends racine, include `src/**/*`)
- `package.json` racine mis à jour (workspaces, script typecheck)
- `.tangled/workflows/ci.yml` et `release.yml` créés selon D6
- `CHANGELOG.md` créé
- `bun install` : OK (318 packages installés, workspaces résolus)
- `mdast` et `hast` ajoutés aux devDeps engine (absents du package.json original — jamais détecté, pas de typecheck avant)

**Erreurs typecheck pré-existantes bloquantes (3) — dans `src/`, hors scope story :**
1. `src/core/build/output.ts(42,62)` — `locale: string` dans `BuildConfig` passé à `t(locale: Locale)` → mismatch `string` vs `"en"|"fr"`. Fix : changer `locale: string` en `locale: Locale` dans `build/types.ts`.
2. `src/core/build/utils/html.ts(28,34)` — Le `Processor` unified change de type générique après `.use(rehypeFormat)` ; la variable de cache n'a pas le type correct. Fix : cast ou typage explicite.
3. `src/utils/load-module.ts(55)` — `write: false` absent des types `@types/bun` installés. Le code a déjà un commentaire qui reconnaît le problème. Fix : `// @ts-expect-error` ou mettre à jour `@types/bun` (1.3.2 installé, 1.3.11 disponible).

**Ces erreurs existaient avant la migration** — jamais détectées car aucun script `typecheck` n'existait.

**Fixes src/ (scope étendu, accord Pilot) :**
- `build/types.ts` : import `Locale` depuis `i18n`, `locale: string` → `locale: Locale`
- `html.ts` : cast `as unknown as Processor` sur l'assignation du cache (type générique unified change à chaque `.use()`, incompatible avec `Processor` sans params)
- `load-module.ts` : `// @ts-expect-error` positionné sur la ligne `write: false` (la propriété existe en runtime, absente des types `@types/bun@1.3.2`)

**Vérifications finales :**
- `bun install` : OK — 318 packages, workspaces résolus
- `bun run --filter webette typecheck` : 0 erreur
- `bun run build ../../websites/documentation` depuis `packages/engine/` : OK — 5 collections, 35 entrées, pages générées dans `websites/documentation/_public/`
- `bun run serve:tutorial` depuis la racine : OK — site visible sur port 4173

**Fix post-clôture — `bun.lock` :**
`"mdast": "^1.0.0"` avait résolu vers l'ancien package CLI `mdast@1.2.0` (2014, plein de dépendances) au lieu du type-only `mdast@3.0.0`. Corrigé en `"^3.0.0"` → bun.lock +190 lignes → +41 lignes (workspaces + 2 packages type-only sans dépendances). Typecheck toujours OK.
