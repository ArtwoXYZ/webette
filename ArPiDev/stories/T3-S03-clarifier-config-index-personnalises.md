# T3-S03 — Clarifier la config d’index personnalisés (root/collection)

Created: 2026-02-17 02h50m00s
Closed:
Acceptance: User

Status: To Do, Waiting for Validation

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
- (none yet)

## Dev log
- (none yet)
