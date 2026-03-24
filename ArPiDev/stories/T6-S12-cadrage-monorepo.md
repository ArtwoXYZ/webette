# T6-S12 — Cadrage monorepo (structure, distribution, CI)

Created: 2026-03-24 14h00m00s
Closed: 2026-03-24 15h30m00s
Acceptance: User

Status: Done, Validated

## Goal

Fixer toutes les décisions structurelles du monorepo webette avant la migration T6-S15 : organisation des packages, stratégie de distribution, workflows CI, et process de release.

Ce document est la référence unique pour T6-S15 (migration) et les tâches suivantes (T7 app, T8 starters).

## Contexte

Webette est aujourd'hui un repo plat (tout dans `src/`, un seul `package.json`). Pour la beta, il faut séparer l'engine (le SSG) de l'app (UI desktop + tutorial), organiser la documentation, et mettre en place la distribution.

---

## Décisions actées

### D1 — Monorepo Bun workspaces

Structure cible :

```
webette/                            (monorepo root)
├── packages/
│   ├── engine/                     (→ npm "webette")
│   │   ├── package.json            (name: "webette", private: false)
│   │   ├── src/                    (code actuel de src/)
│   │   ├── locales/
│   │   └── webette.tool.ts         (fichier de config de l'outil)
│   └── app/                        (→ binaire compilé, pas npm)
│       ├── package.json            (private: true)
│       ├── src/                    (UI + API locale + glue)
│       ├── tutorial/               (ex website-example, transformé)
│       └── deps: "webette": "workspace:*"
├── websites/
│   └── documentation/              (webette-documentation, contenu seul, pas un package)
├── .tangled/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── package.json                    (workspaces: ["packages/*"])
├── tsconfig.json                   (unique, hérité par tous les packages)
├── CHANGELOG.md
├── README.md, LICENSE, CONTRIBUTING.md, TRADEMARKS.md, etc.
└── ...
```

**Pourquoi :**
- `packages/engine` contient le SSG, publiable sur npm
- `packages/app` contient l'app desktop, dépend de engine via `workspace:*`
- `websites/documentation` est du contenu pur (pas un workspace package), buildé par l'engine
- Les fichiers racine (license, readme, etc.) restent à la racine du monorepo
- `ArPiDev/` et `ArPiDoc/` restent à la racine sur la branche de dev uniquement

### D2 — Distribution engine : npm

L'engine est publiée sur npm sous le nom `webette`.

- Install pour les power users / devs : `bun add -g webette`
- Les non-power users passent par l'app (binaire), pas par npm
- Pas de binaire CLI séparé à compiler : les devs ont besoin de Bun installé, ce qui est cohérent avec le projet

**Maintenance npm :** quasi nulle — `bun publish` à chaque release, les `workspace:*` sont réécrits automatiquement en vraies versions.

**Mapping version webette → npm :**
npm exige du semver (3 segments entiers). Le format webette `vX YYYY.MM.N` est mappé ainsi :
- Formule : `<generation>.<année>.<mois×10 + increment>`
- Exemple : `v1 2026.03.0` → npm `1.2026.30`
- Exemple : `v1 2026.03.2` → npm `1.2026.32`
- Exemple : `v2 2026.12.0` → npm `2.2026.120`
- Limite : 10 releases max par mois (0-9), largement suffisant.

**Engine `package.json` (champs essentiels) :**
```json
{
  "name": "webette",
  "version": "1.2026.30",
  "type": "module",
  "bin": { "webette": "./src/cli.ts" },
  "exports": { ".": "./src/index.ts" },
  "private": false
}
```

### D3 — Distribution app : binaire compilé

L'app est compilée via `bun build --compile` et distribuée comme binaire standalone.

- Cibles : linux-x64, darwin-x64, darwin-arm64, windows-x64
- Le binaire embarque l'engine + le tutorial
- Au premier lancement, l'app copie le tutorial dans un dossier local pour que l'utilisateur puisse le modifier
- Les binaires sont hébergés sur le site webette.org (pas sur Tangled pour l'instant)
- Les tags Tangled contiennent le changelog + les liens de téléchargement vers les binaires

### D4 — Tutorial (ex website-example)

- `website-example/` est renommé et déplacé vers `packages/app/tutorial/`
- Il sert de site de tutoriel avec exercices pour apprendre webette
- Il est embarqué dans le binaire de l'app
- Au premier lancement, il est copié chez l'utilisateur pour qu'il puisse le modifier
- La transformation en vrai tutoriel est le travail de T7

### D5 — Documentation interne (docs/)

- Le contenu de `docs/` sera migré vers le site de documentation (`websites/documentation/`) avant la beta
- `websites/documentation/` n'est pas un workspace package, c'est un dossier de contenu buildé par l'engine
- Migration planifiée dans une story dédiée (hors T6-S14 qui concerne les conventions de commentaires)

### D6 — Workflows Spindles (CI + Release)

Deux workflows séparés, deux intentions différentes :

**Workflow CI — contrôle qualité courant :**
```yaml
# .tangled/workflows/ci.yml
when:
  - event: ["push", "pull_request"]
    branch: main

engine: nixery

dependencies:
  nixpkgs/nixpkgs-unstable:
    - bun

steps:
  - name: install
    command: bun install

  - name: typecheck
    command: bun run --filter '*' typecheck

  - name: test
    command: bun test
```

**Workflow Release — validation avant publish :**
```yaml
# .tangled/workflows/release.yml
when:
  - event: ["push"]
    tag: ["v*"]

engine: nixery

dependencies:
  nixpkgs/nixpkgs-unstable:
    - bun

steps:
  - name: install
    command: bun install

  - name: typecheck
    command: bun run --filter '*' typecheck

  - name: test
    command: bun test
```

**CI :** tourne sur chaque push/PR, vérifie que le code est sain.
**Release :** tourne uniquement sur tag `v*`, sert de feu vert avant le publish npm et la compilation des binaires (faits manuellement pour l'instant). Quand Spindles supportera les secrets et l'upload d'artifacts, les étapes de publish/compilation pourront être ajoutées directement dans ce workflow.

### D7 — Process de release (checklist manuelle)

Chaque release suit cette procédure :

1. Mettre à jour les versions dans les `package.json` (engine + app)
2. Mettre à jour `CHANGELOG.md`
3. Commit des changements de version
4. Créer un tag annoté avec le changelog :
   ```bash
   git tag -a vX.YYYY.MM.N -m "vX.YYYY.MM.N

   ## Nouveautés
   - ...

   ## Corrections
   - ...

   ## Téléchargements
   - Linux x64: https://webette.org/releases/vX.YYYY.MM.N/webette-linux-x64
   - macOS ARM: https://webette.org/releases/vX.YYYY.MM.N/webette-darwin-arm64
   - macOS x64: https://webette.org/releases/vX.YYYY.MM.N/webette-darwin-x64
   - Windows x64: https://webette.org/releases/vX.YYYY.MM.N/webette-windows-x64.exe
   "
   ```
5. Push le tag → le CI Spindles tourne automatiquement
6. Si CI vert : `bun publish` depuis la machine locale (publie l'engine sur npm)
7. `bun build --compile` les binaires de l'app (4 cibles)
8. Upload des binaires sur webette.org
9. Les liens dans le tag Tangled pointent vers les binaires hébergés

**Automatisation future :** quand Tangled supportera l'upload d'artifacts custom sur les tags et les secrets dans Spindles, les étapes 6-8 pourront être automatisées.

---

## In scope

- Toutes les décisions ci-dessus (D1-D7)
- Ce document sert de plan de migration pour T6-S15

## Out of scope

- Exécution de la migration (T6-S15)
- Transformation de website-example en vrai tutoriel (T7)
- Migration du contenu docs/ vers le site de documentation
- Setup du compte npm et premier publish
- Build réel des binaires de l'app
- Configuration OpenBao/secrets dans Spindles

## Done when

- Ce document est validé par l'utilisateur
- Les décisions D1-D7 sont claires et actionnables pour T6-S15

## Execution brief

- Story de cadrage uniquement (Pilot) — pas de code produit
- Le document résume les échanges user/Pilot et fixe les décisions

## Checks to run

- Aucun (pas de code)

## Evidence expected

- Ce document validé par l'utilisateur

## Commit proposal

Title: `docs(arpidev): T6-S12 cadrage monorepo — structure, distribution, CI`
Description:
- Define monorepo structure with Bun workspaces (packages/engine + packages/app + websites/documentation).
- Choose npm distribution for engine (`webette`) and compiled binary for app (4 OS targets).
- Define version mapping from webette format (vX YYYY.MM.N) to npm semver (X.YYYY.MN).
- Plan Spindles CI (push/PR) and Release (tag v*) workflows.
- Document manual release checklist (version bump → tag → CI → npm publish → compile → upload).
Scope(s):
- arpidev
Why these scopes:
- Story de cadrage uniquement, seul le dossier ArPiDev est impacté (story file + TASKS.md).

## Pilot exchange

- 2026-03-24 14h00m00s — Pilot — Discussion approfondie avec l'utilisateur sur la structure monorepo, la stratégie de distribution (npm vs binaire vs les deux), le CI Spindles, et le process de release. Recherche web sur Bun workspaces et Tangled Spindles/tags. Toutes les décisions documentées dans D1-D7.

## Dev log

N/A — story Pilot uniquement, pas d'implémentation.
