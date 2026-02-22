# T3-S03 — Clarifier la config d’index personnalisés (root/collection)

Created: 2026-02-17 02h50m00s
Closed: 2026-02-22 21h39m57s
Acceptance: User

Status: Done, Validated

## Context
Depuis T3-S01, les pages d’index reposent sur des dossiers d’index (par défaut `index`) et la config `site.indexFolderName`. Le fonctionnement est puissant mais peu explicite: où placer les dossiers, quel contenu est pris en compte, comment les layouts sont choisis, et quelles règles d’exclusion s’appliquent.

## Rationale
Documenter clairement les règles d’index réduit les erreurs d’usage et évite que les templates s’appuient sur des hypothèses implicites.

## Goal
Produire une documentation claire et actionnable sur la configuration des index root/collection et leur rendu, avec exemples concrets.

## In scope
- Documenter les conventions de dossiers d’index (root vs collection) et `site.indexFolderName` (valeur par défaut, matching, insensibilité à la casse + préfixes numériques).
- Expliquer le comportement: contenu d’index, exclusion des listes d’entries, priorité et doublons.
- Clarifier la distinction **contenu** vs **layout** (overrides de layout existants).
- Donner 2–3 exemples concrets (arborescence + snippet template/partial).
- Mettre à jour `webette-documentation` pour refléter ces règles.

## Out of scope
- Changer la logique de scan/build ou le modèle d’index.
- Ajouter de nouveaux niveaux de collections.
- Introduire un nouveau format de config.

## Documentation impact
- To document: règles d’index root/collection + `site.indexFolderName`.
- To document: distinction contenu/layout et impacts sur les templates.
- To document: exemples d’arborescence + snippets de layout.

## Ready when
- Goal est un seul resultat clair.
- In scope / Out of scope explicites.
- Done when testable.
- Acceptance owner est defini.
- Rationale est presente.

## Done when
- La documentation décrit clairement:
  - la convention des dossiers d’index (root vs collection),
  - `site.indexFolderName` (défaut et matching),
  - l’exclusion des index des listes d’entries et la gestion des doublons,
  - la distinction contenu vs layout.
- 2–3 exemples concrets sont fournis (arborescence + snippet template).
- Un build de `webette-documentation` valide la mise à jour (commande + résultat notés).

## Pending reason
- None (not pending).

## Remaining work
- None.

## Resume condition
- Not applicable.

## Pilot exchange
- 2026-02-22 21h39m57s — Pilot -> User — Story closed as validated after explicit user confirmation ("censée être closed et terminée").

## Commit proposal
Title: docs(indexes): add comprehensive index configuration documentation
Description:
- Add technical reference documentation for index configuration in reference/indexes/
- Add beginner-friendly guide for index usage in learn/navigation-indexes/
- Document index folder conventions, configuration options, and template overrides
- Include multiple examples showing basic usage, custom folder names, and template overrides
- Explain index exclusion rules and duplicate handling behavior
Scope(s):
- docs
Why these scopes:
- Primary impact is on documentation (docs scope per commit-scopes.md)
- No changes to core functionality, only documentation additions

## Dev log
- 2026-02-22 14h30m00s — Change: Added comprehensive index documentation to webette-documentation
  Why this way:
  - Observed issue: Index configuration was undocumented, making it difficult for users to understand how to customize index behavior
  - Root cause: Missing documentation files in both reference and learn sections
  - Chosen fix: Created two documentation files with different levels of detail:
    - `webette-documentation/03 reference/03 indexes/01 index.md`: Technical reference with complete API details
    - `webette-documentation/02 learn/06 navigation & indexes/01 index.md`: Beginner-friendly guide with practical examples
  - Why this option: Two-tiered documentation approach serves both beginners and advanced users
  - Evidence: Successfully built documentation site and verified HTML output contains properly rendered content
  Commands/tests: 
  - Created documentation files with detailed index configuration explanations
  - Ran `bun run build webette-documentation` to verify build success
  - Verified HTML output contains expected content sections
  - Tested both reference and learn documentation pages

- 2026-02-22 14h45m00s — Change: Enhanced documentation with concrete collection custom layout examples
  Why this way:
  - Observed issue: User requested specific examples for collection custom layouts (not just root index)
  - Root cause: Initial examples only showed root index customization, missing collection-specific cases
  - Chosen fix: Added detailed examples showing how to configure custom layouts for individual collections
    - Updated reference documentation with full configuration example including blog and products collections
    - Updated learn documentation with practical collection custom layout example
    - Added explanation of slug-based mapping between collections and custom layouts
  - Why this option: Provides complete, actionable examples that users can directly apply to their projects
  - Evidence: Rebuilt documentation and verified new content appears correctly in HTML output
  Commands/tests: 
  - Enhanced both documentation files with collection-specific custom layout examples
  - Ran `bun run build webette-documentation` to verify changes
  - Confirmed HTML output includes the new examples with proper formatting
