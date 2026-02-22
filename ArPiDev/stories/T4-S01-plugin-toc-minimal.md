# T4-S01 — Plugin TOC (spec + plugin minimal + doc d’usage)

Created: 2026-02-22 21h37m41s
Closed:
Acceptance: User

Status: To Do, Waiting for Validation

## Context
La roadmap beta impose une capacité plugin minimale, avec un premier cas concret TOC (table des matières). Aujourd’hui, cette capacité n’est pas cadrée de façon exécutable dans une story dédiée.

## Rationale
Commencer par un plugin TOC minimal permet de valider l’ergonomie plugin sur un besoin réel, sans étendre le scope à un système plugin complet.

## Goal
Définir et implémenter un plugin TOC minimal utilisable sur du contenu markdown, avec une documentation d’usage claire.

## In scope
- Définir la spec minimale du plugin TOC (entrée, options, sortie attendue).
- Implémenter un plugin TOC minimal branché sur les hooks plugin existants.
- Générer une structure TOC à partir des headings markdown (niveau configurable minimal).
- Exposer le résultat dans le modèle/rendu de manière exploitable par templates.
- Ajouter une documentation d’usage concise avec exemple de configuration.
- Vérifier le fonctionnement sur `website-example` (build + rendu observé).

## Out of scope
- Refondre l’architecture plugin globale.
- Ajouter plusieurs plugins dans la même story.
- Ajouter une UI de configuration plugin.
- Cibler tous les cas edge markdown avancés (scope minimal beta).

## Documentation impact
- To document: configuration minimale du plugin TOC.
- To document: format de sortie TOC exploitable en template.
- To document: exemple d’activation + exemple de rendu.

## Ready when
- Goal est un seul résultat clair.
- In scope / Out of scope explicites.
- Done when testable.
- Acceptance owner est défini.
- Rationale est présente.

## Done when
- Une spec minimale du plugin TOC est écrite dans la story (comportement + options supportées).
- Le plugin TOC est implémenté et activable via configuration.
- Un build de `website-example` confirme la présence des données TOC attendues.
- Un exemple de rendu TOC est visible (modèle exporté ou rendu HTML selon implémentation).
- Une doc d’usage courte est ajoutée et vérifiée.
- Commandes de vérification et résultats sont consignés dans le `Dev log`.

## Pending reason
- 

## Remaining work
- 

## Resume condition
- 

## Commit proposal
Title:
Description:
- 
Scope(s):
- 
Why these scopes:
- 

## Pilot exchange
- 2026-02-22 21h37m41s — Pilot -> User — Story créée après validation de T3-S04. Merci de valider le contenu avant activation Dev.

## Dev log
- (à compléter par Dev pendant l’implémentation)
