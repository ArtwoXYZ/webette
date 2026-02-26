# T4-S08 — Campagne de tests de confiance du système récursif

Created: 2026-02-26 21h05m29s
Closed:
2026-02-26 22h11m10s
Acceptance: User

Status: Done, Validated

## Context
`T4-S02` à `T4-S07` ont refondu puis stabilisé le modèle arborescent récursif de Webette, avec non-régression vérifiée sur `website-example` et un fixture récursif de validation.

Le système fonctionne, mais avant de clôturer le chantier T4 il faut une campagne de confiance plus large (checks techniques + validations ciblées) pour réduire le risque de régression sur des cas réels/edge cases.

## Rationale
Les stories précédentes ont déjà produit des preuves par étapes, mais elles étaient orientées implémentation/refactor. Cette story centralise une validation plus large et documentée, pour sortir de T4 avec un niveau de confiance explicite.

## Goal
Exécuter et documenter une campagne de tests de confiance du nouveau système récursif (build/serve/checks ciblés HTML + `_model/site.json` + cas limites représentatifs), en distinguant clairement ce qui est validé, ce qui reste à surveiller, et ce qui dépend d’un test manuel user.

## In scope
- Builds et exports modèle sur `website-example`.
- Builds et exports modèle sur fixture récursif (`/tmp/webette-t4-s02-fixture`).
- Création/ajustement de fixtures de test locaux si nécessaire pour couvrir des edge cases non présents dans `website-example`.
- Vérifications HTML ciblées (navigation, menus, `prev/next`, root entries, nested collections).
- Vérifications `_model/site.json` ciblées (`site.structure`, `rootEntries`, `ignoredFolders`, routes, cohérence générale).
- Smoke `serve` si l’environnement le permet (ou documentation claire de la limitation environnementale si non).
- Checklist manuelle user/IA pour les points difficiles à prouver automatiquement.

## Out of scope
- Nouvelles fonctionnalités produit.
- Refactors structurels supplémentaires.
- ArPiDoc final (la doc user-facing sera faite en batch après consolidation).
- Benchs de performance détaillés (sauf observation légère si utile).

## Execution brief
- Rejouer un socle de checks automatisés sur `website-example` et fixture récursif.
- Compléter avec des spot checks HTML/_model plus variés que dans les stories d’implémentation.
- Couvrir explicitement les cas de structure (entries racine, plusieurs niveaux de collections, dossiers ignorés, folder blocks dans entry).
- Tenter un smoke `serve`; si bind impossible dans cet environnement, documenter proprement la limitation et s’appuyer sur les builds + validation user.
- Produire une synthèse de confiance avec limites/risques résiduels.

## Checks to run
- `bun run src/cli.ts build website-example`
- `bun run src/cli.ts build website-example --skip-content`
- `bun run src/cli.ts build website-example --export-model-only --skip-content`
- `bun run src/cli.ts build website-example --include-drafts`
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --skip-content`
- `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content`
- Vérifications ciblées HTML / `_model/site.json` (grep + lecture)
- `bun run src/cli.ts serve website-example` (smoke) si possible

## Test matrix (à couvrir explicitement)
### A. Cas de base (référence)
- `website-example` build complet (rendu HTML + sitemap + `_model`).
- `website-example` export modèle seul (`--export-model-only --skip-content`).
- `website-example` build `--skip-content` (scan/routing/export sans lecture contenu).
- `website-example` build avec brouillons (`--include-drafts`) pour vérifier que la bascule T4 n’a pas cassé ce mode.

### B. Structure récursive (fixtures / cas ciblés)
- Entry à la racine (root entry) rendue et routée correctement (`/home/` ou équivalent).
- Plusieurs entries à la racine (ordre, menu, routes, absence de collision évidente).
- Collection imbriquée sur 2 niveaux (`/blog/specials/...`) avec index et entry enfant.
- Collection imbriquée sur 3+ niveaux (au moins un cas) pour valider la récursivité réelle et pas seulement 2 niveaux.
- Coexistence racine mixte `root entries + collections` (cas principal de la nouvelle architecture).
- Folder block dans une entry (dossier interprété comme bloc, pas collection).
- Folder blocks imbriqués (si supporté par le système; sinon documenter la limite observée).
- Collection avec `_assets` (si utilisé/supporté) sans mauvaise classification en entry.

### C. Classification / règles / warnings
- Dossier vide hors entry -> ignoré avec warning non bloquant (`scan.folderIgnored`).
- Dossier “meta-only” hors entry (ex: `name.webt`, `description.webt`, `ignore.webt`, sans blocks) -> ignoré avec warning non bloquant.
- Fichiers non pertinents à la racine -> ignorés (pas de crash, pas de pollution du modèle).
- Dossier classé `entry` dès présence de block, avec sous-dossiers traités comme blocks (pas comme sous-collection).
- Vérification qu’un dossier structurel (collection) n’ingère pas accidentellement des blocks.

### D. Routing / index / rendu HTML
- Root index (`/`) reste correct sur `website-example`.
- Index de collection (top-level) contient navigation/liste attendue.
- Index de collection imbriquée (nested) généré et relié correctement.
- Entry standard dans collection: page HTML, menu, breadcrumb/back-link (si présent), navigation.
- Root entry: page HTML + intégration dans navigation/menu/site index.
- `prev/next` sur entries d’une collection (ordre cohérent, pas de régression).
- `navigation.webt` / helper `menu` : état courant (`aria-current` / classes actives) sur pages clés.
- `sitemap.xml` inclut routes collections, nested collections, root entries.
- Absence de routes orphelines évidentes après rebuild (prune/overwrite comportement nominal).

### E. Export `_model/site.json`
- Présence de `site.structure` (source de vérité).
- Cohérence des nœuds `collection` / `entry` (kind, path, route, children, blocks).
- `rootEntries` présent quand il y a des entries racine; absent/vide cohérent sinon.
- `ignoredFolders` présent et renseigné sur fixtures dédiés.
- Routes attendues présentes pour:
  - entries racine,
  - collections imbriquées,
  - entries imbriquées profondes.
- Cohérence minimale des métadonnées (`createdAt`, `updatedAt`) sur fixtures où disponibles.
- Projection plate consommée (`collections`, `entries`) toujours exploitable par les templates (tant qu’elle existe).

### F. Modes d’exécution / serve
- `serve` : build initial en mode serve passe (scan -> resolve -> render -> export `_model`).
- `serve` : bind HTTP réussi si l’environnement le permet; sinon limitation environnementale documentée.
- `serve` : une modification de fichier dans une entry met bien à jour la page concernée (test manuel user si nécessaire).
- `serve` : ajout/suppression d’une entry (ou root entry) provoque une reconstruction cohérente (test manuel user si nécessaire).
- `serve` : ajout d’une sous-collection/niveau imbriqué met à jour routes/index (test manuel user si nécessaire).

### G. Cas de robustesse utiles (pertinents T4)
- Slugs potentiellement similaires / collisions de noms (au moins observation, même si non corrigé ici).
- Entries/collections avec noms ordonnés (`01_`, `02_`) vs noms “propres” (ordre/routing stable).
- Brouillons/unlisted dans structure récursive (root entries et nested entries si fixture disponible).
- Références cross-entry (`T3-S04`) toujours résolues sur un site non trivial (`website-example` smoke ciblé).
- Warnings connus non bloquants (ex: refs vers draft, favicon `.ico`) restent identifiés comme non liés à T4.

## Manual user/IA checklist (à préparer / cocher pendant la campagne)
- Lancer `serve` localement et vérifier navigation visuelle sur `website-example` (root index -> collection -> entry -> retour).
- Créer temporairement une root entry dans un site de test et vérifier:
  - route générée,
  - présence dans le menu/index,
  - absence de casse sur les collections existantes.
- Créer temporairement une sous-collection supplémentaire (niveau 3+) et vérifier:
  - index nested,
  - route de l’entry profonde,
  - sitemap.
- Créer un dossier vide et un dossier meta-only hors entry pour confirmer warnings non bloquants.
- Vérifier qu’un dossier dans une entry est bien rendu comme folder block (et non collection).
- Noter tout écart entre “ça build” et “le rendu est intuitif” (UX/navigation), même si non bloquant.

## Evidence expected
- Tableau/listing de checks passés (website-example + fixture).
- Matrice de couverture cochée (ou statut explicite: fait / non fait / bloqué environnement).
- Preuves HTML ciblées couvrant les cas clés du système récursif.
- Preuves `_model/site.json` couvrant `structure`, `rootEntries`, `ignoredFolders` et routes.
- Note claire sur `serve` (confirmé ici / limité par environnement / confirmé par user).
- Résultats des tests manuels user/IA (si partiels, préciser lesquels).
- Liste de risques résiduels réalistes après campagne.

## Files/areas likely involved
- `website-example/_public/**`
- `website-example/_public/_model/site.json`
- `/tmp/webette-t4-s02-fixture/_public/**`
- `/tmp/webette-t4-s02-fixture/_public/_model/site.json`
- `website-example/.webette/logs.jsonl` (si smoke `serve`)
- `ArPiDev/stories/T4-S08-campagne-tests-confiance-systeme-recursif.md`

## Constraints and traps
- Ne pas confondre “plus de checks” avec “couverture exhaustive”.
- Bien séparer bug produit vs limitation de l’environnement de test (notamment `serve`).
- Ne pas dériver vers des corrections de code hors bug évident bloquant la campagne.

## Documentation impact
- ArPiDev story: oui (preuves de confiance T4).
- `DECISIONS.md`: seulement si un nouveau comportement/risque doit être figé.
- ArPiDoc: préparer une checklist des points user-facing à documenter, sans écrire la doc finale ici.

## Ready when
- `T4-S07` est validée.
- Le périmètre couvre explicitement HTML + `_model/site.json` + `serve` smoke (ou sa limitation).

## Done when
- La campagne de checks est exécutée et documentée.
- La matrice de tests est couverte avec statut explicite par item important (ou regroupements clairs).
- Les preuves couvrent `website-example` + fixture récursif.
- Les limites/risques résiduels sont explicités.
- La story est prête pour validation user.

## Pending reason
- 

## Remaining work
- Ouvrir le chantier suivant (`T5-S01` Plugin TOC)

## Resume condition
- User requests additional follow-up after T4 closure, otherwise proceed to `T5-S01`

## Commit proposal
Title:
docs(arpidev): record T4 recursive-system confidence test campaign
Description:
- Document the T4-S08 confidence campaign across `website-example`, the original recursive fixture, and a richer T4-S08 edge-case fixture
- Record matrix coverage (done / partial / blocked by environment) for recursive structure, rendering, `_model`, and `serve`
- Capture residual risks and manual follow-up checks for user/IA collaboration
Scope(s):
- docs/arpidev
Why these scopes:
- This story is a validation/documentation step consolidating test evidence; no production code changes are required

## Pilot exchange
- 2026-02-26 21h05m29s — Pilot -> User — Story créée pour clôturer T4 avec une campagne de confiance (checks techniques + validations ciblées IA/user) après la validation du refactor `T4-S07`.
- 2026-02-26 21h06m16s — User -> Pilot — Demande d’une liste de tests beaucoup plus exhaustive et explicite (entries racine, niveaux multiples de collections, edge cases de classification, tests manuels user/IA).
- 2026-02-26 22h11m10s — User -> Pilot — Validation de `T4-S08` et demande de clôture du chantier T4 + proposition de commit global T4.

## Dev log
- 2026-02-26 21h06m16s — Kickoff Dev
  Why this way:
  - Observed need: la story a maintenant une matrice large; il faut une campagne structurée, pas juste rejouer les builds déjà faits.
  - Constraint: couvrir explicitement des cas non présents dans `website-example` (entries racine multiples, profondeur 3+, folder blocks, `_assets`, dossiers ignorés).
  - Chosen approach: combiner `website-example`, le fixture récursif existant et un fixture `T4-S08` enrichi pour les edge cases de structure/classification.
  Commands/tests: pending
- 2026-02-26 21h16m25s — Campagne de confiance exécutée (website-example + fixtures) avec matrice de couverture
  Summary:
  - `website-example` : builds de référence OK (`build`, `--skip-content`, `--export-model-only --skip-content`) + smoke `serve` (build initial OK, bind HTTP bloqué par environnement/port).
  - `website-example --include-drafts` : flag accepté par le CLI mais sans effet en mode `build` (brouillons toujours exclus) — comportement attendu au regard du parseur actuel, à documenter.
  - Fixture récursif d’origine (`/tmp/webette-t4-s02-fixture`) : build/skip/export OK, preuves HTML/sitemap/_model confirmées.
  - Fixture enrichi (`/tmp/webette-t4-s08-fixture`) : build/skip/export OK, couverture des cas structurels/edge cases T4 (multi root entries, profondeur 3+, `_assets`, folder blocks, dossiers ignorés, draft/unlisted).

  Fixture `T4-S08` (créé pour la campagne):
  - Base: copie de `/tmp/webette-t4-s02-fixture`
  - Ajouts principaux:
    - root entries multiples (`06 About`, `07 Draft Root`, `08 Unlisted Root`, `09 Gallery Page`)
    - collection `_assets` (`10 Docs/_assets/*` + `10 Docs/01 Welcome`)
    - récursivité 3+ niveaux (`02 Blog/04 Year 2026/02 Events/01 Conf/01 Recap`)
    - nested entry sibling (`.../02 Meetup`)
    - draft nested (`02 Blog/05 Drafts/01 Secret Draft/draft.webt`)
    - unlisted collection (`11 Hidden Collection/unlisted.webt`)
    - dossiers ignorés supplémentaires (`12 Empty Again`, `13 MetaOnly2`)
    - fichier racine non pertinent (`README.tmp`)
    - folder block avec sous-folder block (`09 Gallery Page/01 Gallery/02 Nested`)

  Matrix coverage status (this run):
  - A. Cas de base (référence): `DONE`
    - `website-example` build complet ✅
    - `website-example` `--skip-content` ✅
    - `website-example` export modèle seul ✅
    - `website-example --include-drafts` exécuté ✅ (observé: brouillons toujours exclus en `build`; flag sans effet pratique)

  - B. Structure récursive (fixtures / cas ciblés): `DONE (sauf 1 item partiel)`
    - Entry racine routée/rendue (`/home/`) ✅ (`T4-S02` + `T4-S08`)
    - Plusieurs root entries (`/home/`, `/about/`, `/gallery-page/`) ✅ (`T4-S08`)
    - Collections imbriquées 2 niveaux (`/blog/specials/...`) ✅
    - Collections imbriquées 3+ niveaux (`/blog/year-2026/events/conf/recap/`) ✅
    - Coexistence root entries + collections à la racine ✅ (`T4-S08`)
    - Folder block dans une entry ✅ (`09 Gallery Page/01 Gallery` -> bloc `folder` dans `_model`)
    - Folder blocks imbriqués ✅ (`.../01 Gallery/02 Nested` -> `subBlocks`)
    - Collection avec `_assets` ✅ (`10 Docs` reste collection; `assets` présents dans `_model`)

  - C. Classification / règles / warnings: `DONE`
    - Dossier vide hors entry -> warning non bloquant ✅ (`03 Empty`, `12 Empty Again`)
    - Dossier meta-only hors entry -> warning non bloquant ✅ (`04 MetaOnly`, `13 MetaOnly2`)
    - Fichier racine non pertinent ignoré ✅ (`README.tmp` non routé / non visible dans `_model` ciblé)
    - Dossier entry avec sous-dossiers traités comme blocks ✅ (`Gallery Page`)
    - Dossier structurel n’ingère pas des blocks par erreur ✅ (`10 Docs` classé collection avec `assets`, entry enfant distincte)

  - D. Routing / index / rendu HTML: `DONE (sur coverage ciblée)`
    - Root index `website-example` OK ✅
    - Index collection top-level `website-example` (`/playground/`) ✅
    - Index nested fixture (`/blog/specials/`, `/blog/year-2026/events/conf/`) ✅
    - Entry standard + back-link/navigation ✅ (`/blog/specials/deep-post/`)
    - Root entry HTML + intégration dans navigation (`prev/next` root entries) ✅ (`/home/`, `/about/`, `/gallery-page/`)
    - `prev/next` cohérent sur root entries ✅ (`Home -> About -> Gallery Page`, draft/unlisted exclus)
    - `navigation.webt` / menu / `aria-current` sur `website-example` ✅
    - `sitemap.xml` inclut routes nested + root entries visibles ✅
    - Prune/orphans: comportement nominal observé ✅ (suppression orphelins vue dans logs)

  - E. Export `_model/site.json`: `DONE`
    - `site.structure` présent ✅ (`website-example`, fixtures)
    - Cohérence `collection` / `entry` (kind/path/route/children/blocks) ✅ (spot checks ciblés)
    - `rootEntries` présent quand attendu / absent si non applicable ✅
    - `ignoredFolders` présent et renseigné ✅ (`T4-S02`, `T4-S08`)
    - Routes root/nested/deep attendues ✅
    - `createdAt` / `updatedAt` : `PARTIAL` (vérifié auparavant sur `T4-S05`; pas re-greppé exhaustivement dans cette passe)
    - Projection plate (`collections` + `entries`) exploitable ✅ (build/rendu templates OK)

  - F. Modes d’exécution / serve: `PARTIAL (limitation environnement + points manuels)`
    - Build initial `serve` sur `website-example` ✅ (scan -> resolve -> render -> `_model` -> sitemap)
    - Bind HTTP ❌ dans cet environnement (port 4173 occupé / limitation session) — message runtime corrigé et cohérent
    - Modification live d’un fichier en `serve` : `NOT RUN HERE` (manuel user/IA)
    - Ajout/suppression entry/root entry en `serve` : `NOT RUN HERE` (manuel user/IA)
    - Ajout sous-collection/niveau imbriqué en `serve` : `NOT RUN HERE` (manuel user/IA)

  - G. Cas de robustesse utiles (pertinents T4): `PARTIAL`
    - Noms ordonnés (`01_`, `02_`) / ordre/routing stable ✅ (fixtures riches numérotés)
    - Brouillons/unlisted dans structure récursive ✅ (root + nested + collection unlisted via fixture `T4-S08`)
    - Références cross-entry (`website-example`) ✅ smoke (warnings connus `reference.targetNotFound` inchangés)
    - Warnings connus non bloquants (refs draft, favicon `.ico`) ✅ observés et non attribués à T4
    - Collisions de slugs: `NOT RUN` (hors bug observé; à couvrir si on veut pousser davantage la campagne)

  Key evidence (selected):
  - `website-example` HTML:
    - `Collection contents`, `aria-current=\"page\"`, `prev-next` présents sur pages de référence.
  - `website-example` `_model/site.json`:
    - `site.structure` présent ; routes `/playground/` et `/playground/introduction/` présentes.
  - `/tmp/webette-t4-s02-fixture`:
    - HTML `/home/` + `/blog/specials/deep-post/` OK ; `sitemap.xml` contient root/nested routes.
    - `_model/site.json` contient `structure`, `ignoredFolders`, `rootEntries`.
  - `/tmp/webette-t4-s08-fixture`:
    - `_model/site.json` contient `structure`, `ignoredFolders`, `rootEntries`, `isDraft`, `isUnlisted`.
    - Routes profondes et mixtes présentes (`/about/`, `/gallery-page/`, `/blog/year-2026/events/conf/recap/`, `/docs/welcome/`).
    - `Gallery Page` classée en entry avec folder blocks imbriqués (`type: \"folder\"` + `subBlocks`).
    - `10 Docs` reste collection avec `assets` et entry `/docs/welcome/`.
    - `sitemap.xml` inclut root entries visibles / nested routes et exclut `draft` + `unlisted`.

  Serve smoke note:
  - `bun run src/cli.ts serve website-example` a bien exécuté le build initial (avec `Brouillons conservés (serveur)` et sitemap `22 urls`), puis a échoué au bind HTTP (`port 4173 déjà utilisé`) dans cet environnement.
  - Cela confirme la chaîne `serve` jusqu’au lancement serveur; les tests live restent à faire côté user/IA local si souhaité.

  Residual risks / follow-up suggestions (non bloquants T4):
  - Cas collisions de slugs non exercés explicitement dans cette campagne.
  - Scénarios live-reload `serve` sur changements structurels (ajout/suppression root entry / nested collection) non exécutés ici.
  - Les warnings de dimensions d’images vides dans le fixture `T4-S08` sont attendus (fixtures avec fichiers image vides), sans impact T4.

  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `bun run src/cli.ts build website-example --skip-content`
  - `bun run src/cli.ts build website-example --export-model-only --skip-content`
  - `bun run src/cli.ts build website-example --include-drafts`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --skip-content`
  - `bun run src/cli.ts build /tmp/webette-t4-s02-fixture --export-model-only --skip-content`
  - `bun run src/cli.ts build /tmp/webette-t4-s08-fixture`
  - `bun run src/cli.ts build /tmp/webette-t4-s08-fixture --skip-content`
  - `bun run src/cli.ts build /tmp/webette-t4-s08-fixture --export-model-only --skip-content`
  - `bun run src/cli.ts build /tmp/webette-t4-s08-fixture --include-drafts`
  - `bun run src/cli.ts serve website-example` (smoke; bind failed after initial build)
  - `find /tmp/webette-t4-s08-fixture/_public -name 'index.html' | sort`
  - `rg -n 'Collection contents|aria-current=\"page\"|prev-next|/playground/edit-your-text/' website-example/_public/index.html website-example/_public/playground/index.html website-example/_public/playground/introduction/index.html`
  - `rg -n '\"structure\"|\"route\": \"/playground/\"|\"route\": \"/playground/introduction/\"|\"rootEntries\"' website-example/_public/_model/site.json`
  - `rg -n '<loc>.*(/home/|/blog/specials/|/blog/specials/deep-post/)</loc>|Back to collection|class=\"is-current\"' /tmp/webette-t4-s02-fixture/_public/sitemap.xml /tmp/webette-t4-s02-fixture/_public/home/index.html /tmp/webette-t4-s02-fixture/_public/blog/specials/deep-post/index.html`
  - `rg -n '\"structure\"|\"ignoredFolders\"|\"rootEntries\"|\"route\": \"/home/\"|\"route\": \"/blog/specials/deep-post/\"' /tmp/webette-t4-s02-fixture/_public/_model/site.json`
  - `rg -n '\"structure\"|\"ignoredFolders\"|\"rootEntries\"|\"isDraft\"|\"isUnlisted\"|\"route\": \"/about/\"|\"route\": \"/gallery-page/\"|\"route\": \"/blog/year-2026/events/conf/recap/\"|\"route\": \"/docs/welcome/\"|\"route\": \"/hidden-collection/child/\"' /tmp/webette-t4-s08-fixture/_public/_model/site.json`
  - `rg -n '\"subBlocks\"|\"type\": \"folder\"|\"path\": \"09 Gallery Page/01 Gallery\"|\"path\": \"09 Gallery Page/01 Gallery/02 Nested\"' /tmp/webette-t4-s08-fixture/_public/_model/site.json`
  - `rg -n '\"assets\"|\"path\": \"10 Docs\"|\"route\": \"/docs/\"|\"route\": \"/docs/welcome/\"' /tmp/webette-t4-s08-fixture/_public/_model/site.json`
  - `rg -n '<loc>.*(/home/|/about/|/gallery-page/|/docs/welcome/|/blog/year-2026/events/conf/recap/|/hidden-collection/child/|/draft-root/|/secret-draft/)' /tmp/webette-t4-s08-fixture/_public/sitemap.xml`
  - `rg -n '/draft-root/|/secret-draft/|/unlisted-root/|/hidden-collection/' /tmp/webette-t4-s08-fixture/_public/sitemap.xml || true`
  - `rg -n 'scan.folderIgnored|Entrée brouillon ignorée|Collection .* sans entrée' /tmp/webette-t4-s08-fixture/.webette/logs.jsonl | tail -n 20`
  - `sed -n '1,220p' /tmp/webette-t4-s08-fixture/_public/index.html`
  - `sed -n '1,220p' /tmp/webette-t4-s08-fixture/_public/home/index.html`
  - `sed -n '1,260p' /tmp/webette-t4-s08-fixture/_public/blog/index.html`
- 2026-02-26 21h25m39s — Finding manuel user + fix appliqué: root entries absentes du menu principal du wrapper `website-example`
  Finding (manual user test):
  - Ajout d’une entry racine dans `website-example` (`00 entry test/00 test.md`) : route/rendu/navigations `navigation.webt` OK, mais absence dans le menu principal (top tabs).
  Diagnosis:
  - Le helper `menu` exposait déjà les `rootEntries` (`kind: "entry"`), mais le `wrapper.hbs` rendait seulement les items `kind: "collection"` dans `top-menu-tabs`.
  Fix applied:
  - `website-example/_templates/wrapper/wrapper.hbs`: ajout du rendu des items `kind: "entry"` comme tabs liens (même logique visuelle qu’un item direct).
  - `webette-documentation/_templates/wrapper/wrapper.hbs`: même ajustement pour cohérence des templates du repo.
  Verification:
  - `bun run src/cli.ts build website-example` ✅ (avec root entry de test; scan = `18 entrées`, `42 blocs`)
  - `website-example/_public/index.html`: lien `/entry-test/` visible dans les tabs ✅
  - `website-example/_public/entry-test/index.html`: tab root entry marqué `is-current` + `aria-current=\"page\"` ✅
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `rg -n 'href=\"/entry-test/\"|entry test' website-example/_public/index.html website-example/_public/entry-test/index.html`
  - `rg -n 'top-menu-tab.*is-current|aria-current=\"page\"' website-example/_public/entry-test/index.html | head -n 20`
- 2026-02-26 21h33m30s — Finding manuel user + fix appliqué: masquer `prev/next` sur root entries dans les layouts par défaut
  Finding (manual user test):
  - Avec plusieurs root entries dans `website-example` (`00 entry test`, `00 Entry2`), la navigation `prev/next` s’affichait entre elles.
  - Le comportement interne peut être utile, mais la règle UX souhaitée pour les templates par défaut est: afficher `prev/next` seulement pour des entries ayant une vraie collection.
  Diagnosis:
  - Le calcul `prev/next` est interne et inclut volontairement les `rootEntries`.
  - Les partials `prev-next.hbs` affichaient le bloc dès qu’un `prevEntry`/`nextEntry` existait, sans condition sur `collection`.
  Fix applied (template-level guard):
  - `website-example/_templates/partial/prev-next.hbs`: ajout d’un guard `{{#if collection}} ... {{/if}}`.
  - `webette-documentation/_templates/partial/prev-next.hbs`: même guard pour cohérence.
  Verification:
  - `bun run src/cli.ts build website-example` ✅ (avec 2 root entries de test; scan = `19 entrées`, `43 blocs`)
  - `website-example/_public/entry-test/index.html` et `/entry2/index.html`: plus de bloc `prev-next` ✅
  - `website-example/_public/playground/introduction/index.html`: `prev-next` toujours présent ✅
  Notes:
  - Le calcul interne `prev/next` pour root entries reste inchangé (choix volontaire pour l’instant); seul l’affichage par défaut est masqué.
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `find website-example/_public -maxdepth 2 -type f -path '*/index.html' | rg 'entry'`
  - `rg -n 'prev-next' website-example/_public/entry-test/index.html website-example/_public/entry2/index.html || true`
  - `rg -n 'prev-next' website-example/_public/playground/introduction/index.html`
- 2026-02-26 21h45m33s — Finding manuel user + fix appliqué: hiérarchie des sous-collections dans le menu principal et `navigation.webt`
  Finding (manual user test):
  - Après ajout de `03 Credits/10 Sous Collection 1/01 Sous Collec 2/01 entry test/00 test.md`, le top menu affichait des tabs pour des sous-collections (`Sous Collection 1`, `Sous Collec 2`) au lieu de garder la hiérarchie sous `Credits`.
  - La navigation rendue par `navigation.webt` (ex: page `Unlist an entry`) listait aussi ces sous-collections de manière plate/incomplète (arborescence non correcte).
  Diagnosis:
  - `menu` helper et resolver `navigation` construisaient leurs items depuis `site.collections` à plat (sans reconstruire la hiérarchie parent/enfant des collections).
  - Le wrapper du top menu ne rendait que les enfants `entry` dans les panels (pas les enfants `collection`).
  Fix applied (internal + template):
  - `src/core/templates/menu.ts`: reconstruction d’une forêt de collections hiérarchique à partir de `collection.path` (collections imbriquées en `children` du parent).
  - `src/core/resolve/resolvers/navigation.ts`: même reconstruction hiérarchique pour `navigation.webt` (mode global et mode `collection`), avec profondeur/children corrects.
  - `website-example/_templates/wrapper/wrapper.hbs`: rendu des enfants `kind=\"collection\"` dans les panels du top menu (liens vers l’index de sous-collection).
  - `webette-documentation/_templates/wrapper/wrapper.hbs`: même ajustement pour cohérence.
  Verification:
  - `bun run src/cli.ts build website-example` ✅
  - Top menu `Credits`: `Sous Collection 1` apparaît dans le panel `Credits` et pointe vers `/credits/sous-collection-1/` ✅
  - Top menu tabs: `Sous Collec 2` n’apparaît plus comme tab indépendant ✅
  - `navigation.webt` (`/playground/unlist-an-entry/`): arborescence complète `Credits -> Sous Collection 1 -> Sous Collec 2 -> entry test` avec `navigation-item--depth-1/2/3` ✅
  - `Credits` index (`Collection contents`): sous-collections nested visibles avec bonnes profondeurs ✅
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `rg -n 'top-menu-tabwrap|top-menu-panel-credits|Sous Collection 1|Sous Collec 2|/credits/sous-collection-1/|/credits/sous-collection-1/sous-collec-2/' website-example/_public/credits/index.html | head -n 220`
  - `sed -n '60,180p' website-example/_public/credits/index.html`
  - `rg -n 'Sous Collection 1|Sous Collec 2|entry test|navigation-item--collection|navigation-item--depth-' website-example/_public/playground/unlist-an-entry/index.html | head -n 300`
- 2026-02-26 21h50m32s — Finding manuel user + fix appliqué: index de sous-collections vides (layout d’index)
  Finding (manual user test):
  - Les pages d’index de sous-collections (`/credits/sous-collection-1/`, `/credits/sous-collection-1/sous-collec-2/`) étaient vides par défaut, alors qu’elles devraient au minimum lister leur contenu.
  User clarification that helped:
  - Ce n’était pas seulement le cas d’une sous-collection sans entry directe (`Sous Collection 1`) ; `Sous Collec 2` (qui a une entry) était vide aussi.
  Diagnosis:
  - Le layout d’index (`index.hbs`) cherchait la collection courante via une boucle sur les `items` top-level du helper `menu`.
  - Après correction de la hiérarchie (collections imbriquées en `children`), les sous-collections ne sont plus top-level, donc le layout ne trouvait plus `isCurrent`.
  Fix applied (helper + layouts):
  - `src/core/templates/menu.ts`: exposition de `currentCollectionItem` (recherche récursive de la collection courante dans l’arbre du menu).
  - `website-example/_templates/layout/index.hbs`: rendu de `currentCollectionItem.children` pour `Collection contents`.
  - `webette-documentation/_templates/layout/index.hbs`: même ajustement pour cohérence.
  Verification:
  - `bun run src/cli.ts build website-example` ✅
  - `/credits/sous-collection-1/`: `Collection contents` affiche `Sous Collec 2` puis `entry test` ✅
  - `/credits/sous-collection-1/sous-collec-2/`: `Collection contents` affiche `entry test` ✅
  Notes:
  - Les profondeurs CSS (`navigation-item--depth-*`) reflètent actuellement la profondeur dans l’arborescence globale du menu, pas une profondeur “rebasée” locale à la page d’index. Le contenu est correct; on pourra ajuster la présentation si besoin.
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `rg -n 'Collection contents|Sous Collec 2|entry test|navigation-item--depth-' website-example/_public/credits/sous-collection-1/index.html | head -n 200`
  - `rg -n 'Collection contents|entry test|navigation-item--depth-' website-example/_public/credits/sous-collection-1/sous-collec-2/index.html | head -n 200`
- 2026-02-26 21h53m38s — Retouche esthétique (layout): sous-collections du top menu en capitales
  Request:
  - Différencier visuellement les sous-collections des entries dans les panels du menu principal en les affichant en capitales.
  Fix applied:
  - `website-example/_templates/wrapper/wrapper.hbs` et `webette-documentation/_templates/wrapper/wrapper.hbs` :
    - ajout d’une classe dédiée `top-menu-entry--collection` sur les liens d’items `kind="collection"` (sous-collections dans les panels)
  - `website-example/_templates/assets/css/style.css` et `webette-documentation/_templates/assets/css/style.css` :
    - `text-transform: uppercase` pour `.top-menu-entry--collection`
  Verification:
  - `bun run src/cli.ts build website-example` ✅
  - `website-example/_public/credits/index.html` : la classe `top-menu-entry--collection` est présente uniquement sur `Sous Collection 1` (pas sur les entries) ✅
  Commands/tests:
  - `bun run src/cli.ts build website-example`
  - `rg -n 'top-menu-entry--collection' website-example/_public/credits/index.html | head -n 20`
- 2026-02-26 22h03m16s — Fix DX/références: support explicite `collection: root` + documentation
  Request:
  - Pouvoir référencer un block/entry d’une root entry (sans collection) depuis markdown ou `reference.webt` avec une syntaxe explicite.
  Decision:
  - Réserver `collection: root` pour cibler explicitement les root entries.
  What changed (code):
  - `src/core/targets.ts`: ajout de `isRootCollectionName()` (`root` réservé).
  - `src/core/resolve/resolvers/reference.ts`: `collection: root` force la résolution sur `site.rootEntries` (entry/block), sans fallback ambigu vers la collection courante.
  - `src/core/postprocess/markdown-links.ts`: support `collection: root` pour `entry:` / `block:` dans les liens markdown internes.
  - `src/core/postprocess/markdown-images.ts`: support `collection: root` pour `entry:` / `block:` dans les images markdown internes.
  What changed (docs):
  - `website-example/01 Playground/12 Cross-Entry References/00 index.md`: section “Root Entries” avec exemple `collection: root`.
  Verification (fixture local):
  - Fixture `/tmp/webette-root-ref-fixture` (collection entry + root entry) :
    - lien markdown implicite `entry:home` depuis une collection reste non résolu (attendu) ✅
    - lien markdown explicite `collection: root, entry: home` résolu en `/home/` ✅
    - `reference.webt` explicite `collection: root, entry: home, block: 00 intro.md` injecte bien le block cible ✅
  Commands/tests:
  - `bun run src/cli.ts build website-example --skip-content`
  - `bun run src/cli.ts build /tmp/webette-root-ref-fixture`
  - `rg -n 'Home\\]|/home/|entry:home|Home root|Root references test' /tmp/webette-root-ref-fixture/_public/blog/first-post/index.html`
