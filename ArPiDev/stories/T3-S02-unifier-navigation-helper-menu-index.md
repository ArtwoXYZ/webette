# T3-S02 - Unifier navigation.webt et helper menu/index

Created: 2026-02-17 01h02m43s
Closed: 2026-02-17 02h45m00s
Acceptance: User

Status: Done, Validated

## Context
Il y a deux sources de navigation: `navigation.webt` (plan manuel) et le helper `menu` (auto-list depuis collections/entries). Les templates doivent gerer deux shapes distinctes, ce qui rend le rendu fragile. Il manque aussi un moyen coherent d'appliquer auto-list, exclusions et etats (current/active) dans un seul contrat.

## Rationale
Un contrat unique simplifie les templates, garantit un rendu coherent et permet d'ajouter des regles (auto list, exclusions, etats/classes) sans dupliquer la logique.

## Goal
Definir un contrat unique de navigation, puis aligner `navigation.webt` et le helper menu/index dessus (auto list + exclusions + etats/classes), et mettre a jour templates/exemples.

## In scope
- Choisir un contrat canonique base sur une liste d'items (type, title, link, route, children, state).
- Etendre `navigation.webt` pour produire ce contrat avec etats (isCurrent/isActive) et profondeur (depth).
- Aligner le helper `menu` sur le meme contrat (ou introduire un helper unique) avec options coherentes.
- Auto list parametree: collections/entries, includeUnlisted/includeDrafts, et exclusions explicites.
- Exclusions explicites: par slug/id (collections et entries), avec listes separables.
- Ajouter des flags/utilitaires standardises pour le rendu (kind, isCurrent, isActive, depth, link).
- Mettre a jour les partials/templates par defaut pour n'avoir qu'un seul rendu (plus de branchement par shape).
- Mettre a jour `website-example` et `webette-documentation` pour illustrer le contrat unifie.

## Out of scope
- Refonte complete de navigation UI/UX.
- Nouveau systeme d'index ou changement du modele de donnees.
- Pluginisation ou format de config global.

## Documentation impact
- To document: contrat unique `items[]` pour `navigation.webt` **et** `menu`, plus le mapping des champs:
  - `kind` (`title`/`collection`/`entry`), `title`, `route`, `link`, `children[]`.
  - `collection` (id, name, displayName, slug, route, entriesCount, description, isUnlisted, assets, createdAt, updatedAt).
  - `entry` (id, name, displayName, slug, route, description, isDraft, isUnlisted, createdAt, updatedAt).
  - flags standard: `isCurrent`, `isActive`, `depth`.
- To document: options d’auto‑list unifiées (helper `menu` + `navigation.webt` auto list):
  - `includeUnlisted`, `includeDrafts` (bool), `excludeCollections`, `excludeEntries` (liste ou CSV).
  - Format d’exclusion accepté: `entry` ou `collection/entry`.
  - `hideCollections`, `hideEntries`, `collectionsLink`, `entriesLink` (bool).
  - Comportement par défaut en `serve`: si le modèle contient des drafts, `includeDrafts` est implicite (sauf si explicitement false).
- To document: `navigation.webt` options d’entête supportées (name, mode: collection, collection: <slug>, include/exclude/hide/link flags).
- To document: la puissance du bloc `navigation.webt` (auto‑list vs manuel, filtres applicables sur les deux modes, états `isCurrent/isActive/depth`).
- To document: comment créer un layout/partial de navigation basé sur `items[]` (exemple de rendu + classes d’état).
- To document: rendu templates unifié (plus de branchement par shape) et partials `navigation-items` basés sur `items[]`.
- To document: exemples de snippets (layouts) basés sur `items[]`:
  - Partial `navigation-items.hbs` (rendu récursif):
    - À utiliser comme rendu générique unique pour `menu` **et** `navigation.webt` (évite de dupliquer les templates).
    ```hbs
    <ul class="nav">
      {{#each items}}
        <li class="nav-item nav-item--{{kind}} nav-item--depth-{{depth}}{{#if isCurrent}} is-current{{/if}}{{#if isActive}} is-active{{/if}}">
          {{#if (eq kind "title")}}
            <span class="nav-title">{{title}}</span>
          {{else}}
            {{#if link}}
              <a class="nav-link" href="{{route}}">
                {{#if (eq kind "collection")}}{{displayName collection}}{{/if}}
                {{#if (eq kind "entry")}}{{displayName entry}}{{/if}}
              </a>
            {{else}}
              <span class="nav-link">
                {{#if (eq kind "collection")}}{{displayName collection}}{{/if}}
                {{#if (eq kind "entry")}}{{displayName entry}}{{/if}}
              </span>
            {{/if}}
          {{/if}}

          {{#if children}}
            {{> navigation-items items=children}}
          {{/if}}
        </li>
      {{/each}}
    </ul>
    ```
  - Layout “collection index only” (avec `menu`):
    - À utiliser sur une page d’index de collection pour ne lister **que** les entrées de la collection courante.
    ```hbs
    {{#menu}}
      {{#if collection}}
        <section class="navigation">
          <h2>Collection: {{displayName collection}}</h2>
          {{#each items}}
            {{#if (eq kind "collection")}}
              {{#if isCurrent}}
                {{> navigation-items items=children}}
              {{/if}}
            {{/if}}
          {{/each}}
        </section>
      {{/if}}
    {{/menu}}
    ```
  - Layout “root index only” (liste des collections):
    - À utiliser sur l’index racine pour afficher **toutes** les collections (sitemap global).
    ```hbs
    {{#menu}}
      {{#unless collection}}
        <section class="navigation">
          <h2>Collections</h2>
          {{> navigation-items items=items}}
        </section>
      {{/unless}}
    {{/menu}}
    ```

## Implementation notes (Dev)
- Definir le contrat canonique: `items[]` avec `kind` (`title`/`collection`/`entry`), `title`, `route`, `link`, `children[]`, plus flags `isCurrent`, `isActive`, `depth` (et eventuellement `name`).
- `navigation.webt`: conserver parsing actuel, mais enrichir chaque item avec `isCurrent`/`isActive` et `depth`.
- Helper `menu`: produire la meme shape `items[]` (au lieu de `collections[]`), avec options equivalentes.
- Options unifiees a supporter (helper + navigation.webt auto list):
  - `includeUnlisted`, `includeDrafts` (false par defaut).
  - `excludeCollections`, `excludeEntries` (liste de slug/id).
  - `hideCollections`, `hideEntries` (comportement identique a aujourd'hui).
  - `collectionsLink`, `entriesLink` (comportement identique a aujourd'hui).
- Templates: simplifier `navigation-items` pour ne gerer que `items[]` (supprimer la branche "menu shape").
- Exemples: ajouter un cas `navigation.webt` auto list + exclusions, et mettre a jour les wrappers pour utiliser le contrat unifie.

## Ready when
- Goal est un seul resultat clair.
- In scope / Out of scope explicites.
- Done when testable.
- Acceptance owner est defini.
- Rationale est presente.

## Done when
- `navigation.webt` et le helper menu/index exposent le meme contrat `items[]`.
- L'auto list est possible avec options `includeUnlisted/includeDrafts` et exclusions explicites.
- Les items exposent des flags coherents (kind, isCurrent, isActive, depth, link).
- Les templates/partials n'ont plus de branchement par shape.
- `website-example` et `webette-documentation` rendent la navigation avec le contrat unifie.
- La story contient les preuves de validation (commande + resultat).
- Validation inclut des `build` et des verifications manuelles des HTML rendus + du model exporte.

## Pending reason
- None (not pending).

## Remaining work
- None.

## Resume condition
- Not applicable.

## Commit proposal
Title: feat(templates): unify navigation items contract
Description:
- Align `navigation.webt` and `menu` on a shared `items[]` contract with depth/state flags and unified include/exclude options (drafts visible by default in serve models).
- Extract shared navigation helpers + dedicated `menu` module to reduce duplication and fix typing for partial items.
- Update default templates/partials and example wrappers to render the unified items shape and collection indexes (examples updated).
Scope(s):
- templates
Why these scopes:
- Primary impact is templates/partials and their rendering contract; secondary impacts (core navigation utilities/resolver and example content) are reflected in the description bullets.

## Pilot exchange
- 2026-02-17 01h02m43s - Pilot -> User - Story draft created for validation.
- 2026-02-17 01h20m06s - Pilot -> User - Story updated: contrat canonique `items[]`, unification menu/navigation, options d'auto list/exclusions et notes d'implementation.
- 2026-02-17 01h23m57s - User -> Pilot - Story validated.
- 2026-02-17 01h41m31s - Dev -> Pilot - To document: contrat `items[]` unifie (champs + flags), options `includeUnlisted/includeDrafts/excludeCollections/excludeEntries`, et mise a jour des templates/wrappers pour ce contrat.

## Dev log
- 2026-02-17 01h41m31s — Change: unification du contrat de navigation (items + etats/profondeur), alignement `navigation.webt`/`menu`, et mise a jour des templates + exemples.
  Why this way:
  - Observed issue: les templates devaient gerer deux shapes differentes et ne pouvaient pas appliquer exclusions/etats de maniere coherente.
  - Root cause: `navigation.webt` et le helper `menu` exposaient des contrats differents sans flags unifies.
  - Chosen fix: standardiser sur `items[]` avec `isCurrent/isActive/depth`, ajouter include/exclude options, puis mettre a jour les partials/wrappers et un exemple `navigation.webt`.
  - Why this option: reduit la complexite template tout en gardant auto-list et navigation manuelle coherentes.
  - Evidence: `bun run build website-example` et `bun run build webette-documentation` OK; verif HTML `website-example/_public/credits/index.html` (classes navigation + depth) et `webette-documentation/_public/pages/home/index.html` (exclusion `faq` + collection `internals` absente du bloc navigation); verif exports `_public/_model/site.json`.
  Commands/tests: `bun run build website-example` (OK, warnings: lien interne entry draft non resolu, `build.icons.icoFailed`), `bun run build webette-documentation` (OK).
- 2026-02-17 01h58m06s — Change: corrections post-TS + reorg des helpers + drafts visibles en serve.
  Why this way:
  - Observed issue: erreurs TS dues au passage d'objets partiels (collection/entry) et regression des drafts en menu serve + index de collection affichant toute la navigation.
  - Root cause: fonctions de filtrage typées `Collection/Entry` au lieu de types "light"; helper `menu` ne transmettait plus `collection/current` et filtrait les drafts par defaut.
  - Chosen fix: types utilitaires partages (`CollectionLike/EntryLike`) + extraction du helper `menu` dans un module dedie, avec contexte `collection/entry/current` et includeDrafts implicite si le modele contient des drafts.
  - Why this option: corrige les erreurs, reduit la duplication, et restaure le comportement attendu en serve sans casser le build.
  - Evidence: `bun run build website-example` et `bun run build webette-documentation` OK; verif HTML `webette-documentation/_public/pages/index.html` (liste entries uniquement pour l'index de collection) et `webette-documentation/_public/pages/home/index.html` (exclusions maintenues).
  Commands/tests: `bun run build website-example` (OK, warnings: lien interne entry draft non resolu, `build.icons.icoFailed`), `bun run build webette-documentation` (OK).
- 2026-02-17 02h05m00s â€” Change: correction des types de filtrage dans `menu` + rebuild.
  Why this way:
  - Observed issue: erreurs TS restantes lors de lâ€™usage des items `collection/entry` partiels dans le helper `menu`.
  - Root cause: callbacks de filtrage typÃ©s en `Collection/Entry` au lieu des types "light".
  - Chosen fix: basculer les signatures internes vers `CollectionLike/EntryLike`.
  - Why this option: rÃ©duit le bruit TS sans toucher au runtime ni au contrat `items[]`.
  - Evidence: `bun run build website-example` et `bun run build webette-documentation` OK.
  Commands/tests: `bun run build website-example` (OK, warnings: lien interne entry draft non resolu, `build.icons.icoFailed`), `bun run build webette-documentation` (OK).
- 2026-02-17 02h12m30s â€” Change: entÃªtes + commentaires pour nouveaux helpers, et contenu overview pour l'exemple.
  Why this way:
  - Observed issue: nouveaux fichiers TS sans entÃªte/commentaires, et un overview vide dans les exemples.
  - Root cause: ajout rapide des modules `menu`/`navigation` sans entÃªte standard, et contenu exemple non rempli.
  - Chosen fix: ajouter une entÃªte de fichier + commentaires sur les portions non Ã©videntes, et remplir les overviews de collection.
  - Why this option: amÃ©liore la lisibilitÃ© sans changer le comportement.
  - Evidence: fichiers mis Ã  jour pour `menu.ts`, `navigation/utils.ts`, et overviews example/credits.
  Commands/tests: not run (documentation/commentaires uniquement).
- 2026-02-17 02h18m00s â€” Change: commentaires supplÃ©mentaires sur la logique d'indentation, d'exclusion et de contexte menu.
  Why this way:
  - Observed issue: certaines rÃ¨gles (indentation, format d'exclusion, contexte renvoyÃ©) n'Ã©taient pas explicites pour un dev.
  - Root cause: commentaires insuffisants sur les portions non Ã©videntes.
  - Chosen fix: ajouter des commentaires ciblÃ©s lÃ  oÃ¹ lâ€™intention nâ€™est pas dÃ©ductible du code.
  - Why this option: rend la lecture plus rapide sans alourdir le code.
  - Evidence: commentaires ajoutÃ©s dans `navigation.ts`, `navigation/utils.ts`, `menu.ts`.
  Commands/tests: not run (commentaires uniquement).
- 2026-02-17 02h27m00s â€” Change: ajout de snippets de layout/partial dans `Documentation impact`.
  Why this way:
  - Observed issue: exemples demandés pour guider la documentation des layouts de navigation.
  - Root cause: absence de snippets prêts à l’emploi dans la section documentation.
  - Chosen fix: inclure des blocs `hbs` (partial, collection index, root index) à documenter.
  - Why this option: rend la doc plus actionnable pour un dev.
  - Evidence: section `Documentation impact` enrichie avec snippets.
  Commands/tests: not run (doc story uniquement).
- 2026-02-17 02h35m00s â€” Change: ajout des cas d’usage associés à chaque snippet.
  Why this way:
  - Observed issue: les snippets n’avaient pas d’indication sur quand les utiliser.
  - Root cause: absence d’explication contextuelle dans `Documentation impact`.
  - Chosen fix: ajouter une ligne “cas d’usage” par snippet.
  - Why this option: aide à choisir le bon layout rapidement.
  - Evidence: lignes d’explication ajoutées sous chaque snippet.
  Commands/tests: not run (doc story uniquement).
