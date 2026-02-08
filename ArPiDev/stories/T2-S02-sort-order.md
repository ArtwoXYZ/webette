# T2-S02 — Sort order asc/desc

Created: 2026-02-08 18h29m55s
Closed:
Acceptance: User

Status: Active

## Context
L'ordre des collections/entries est implicite et ne peut pas etre inverse facilement sans renommer les dossiers.

## Rationale
Un simple toggle asc/desc permet d'adapter l'ordre sans toucher a la structure des fichiers.

## Goal
Ajouter une option de configuration pour choisir le tri asc/desc des collections et des entries.

## In scope
- Option de config au niveau du site (webette.config.ts) pour choisir l'ordre (asc/desc).
- Application du tri aux collections et aux entries dans le pipeline.
- Comportement par defaut inchange si l'option est absente.

## Out of scope
- Tri par dates (story suivante).
- Tri personnalise par collection.
- Tri manuel par liste explicite.

## Ready when
- Goal est un seul resultat clair
- In scope / Out of scope explicites
- Done when testable
- Acceptance owner defini
- Rationale presente

## Done when
- L'option est disponible dans la config du site et documentee.
- Le tri des collections et entries respecte asc/desc.
- Aucun changement si l'option est desactivee ou absente.
- Validation manuelle sur un site d'exemple.

## Blocker

## Remaining work

## Reopen when

## Dev log
