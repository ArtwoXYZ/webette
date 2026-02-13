# T2-S06 - Integrer Standard.site (Lexicon ATproto)

Created: 2026-02-13 00h27m22s
Closed: 2026-02-13 00h39m29s
Acceptance: User

Status: Pending

## Context
Standard.site (Lexicon ATproto) pourrait fournir un format d'interop pour decrire un site et ses metadonnees. Avant d'aller plus loin, on doit decider si cette integration apporte une valeur claire a webette et valider la faisabilite avec un POC minimal.

## Rationale
Un POC encadre et une decision explicite reduisent le risque d'investir dans une integration complexe sans benefice concret pour la beta.

## Goal
Decider si et comment integrer Standard.site, et livrer un POC minimal qui prouve l'integration choisie.

## In scope
- Lire le Standard.site Lexicon et identifier un subset de champs utiles pour webette (titres, descriptions, auteur, image sociale, liens).
- Proposer un mapping minimal vers le modele actuel de webette et le faire valider par l'utilisateur.
- Implementer un POC **opt-in** (flag experimental) qui charge un fichier Standard.site local et applique ce mapping.
- Valider le POC sur `website-example` avec un fichier de test et un build.
- Documenter dans la story les champs supportes et les limites du POC.

## Out of scope
- Support complet de tous les champs du Standard.site Lexicon.
- Chargement distant, resolvers, ou dependances reseau.
- UI ou gestion de profils multiples.
- Stabilisation d'API ou garantie de compatibilite long terme.

## Documentation impact
- To document: decision prise + format du fichier Standard.site supporte par le POC + flag opt-in et limites connues.

## Ready when
- Goal est un seul resultat clair.
- In scope / Out of scope explicites.
- Done when testable.
- Acceptance owner est defini.
- Rationale est presente.

## Done when
- Une decision claire d'integration est consignee dans `ArPiDev/DECISIONS.md`.
- Le POC est implemente derriere un flag opt-in et n'affecte pas le comportement par defaut.
- Le POC charge un fichier Standard.site local et mappe au moins les champs valides (titre, description, auteur, image sociale, liens).
- Un build `website-example` valide le comportement avec un fichier de test.
- La story contient les preuves de validation (commande + resultat).

## Pending reason
- Decision: integration should be a plugin; core POC deferred until plugin path is defined.

## Remaining work
- Define the plugin integration scope (Option A or A+B) and exact mapping.
- Draft the plugin-facing config and file locations.
- Implement and validate the opt-in behavior once plugin system is ready.

## Resume condition
- Plugin system is available (or a dedicated plugin story is scheduled) and user confirms the integration scope.

## Pilot exchange
- 2026-02-13 00h34m16s — Pilot -> User — Doc recap: Standard.site defines ATProto lexicons focused on metadata (content format is platform-defined), with publication + document records and verification via a `/.well-known/` file plus `<link>` tags in page head. Options for webette POC:
  - Option A (low risk): config-only, user provides publication/document AT-URIs; webette emits the `/.well-known/site.standard.publication` file and per-page head link tags.
  - Option B (medium): generate Standard.site lexicon JSON from webette model (needs exact schema/required fields).
  - Option C (high): publish records to a PDS (auth, conflicts, sync) — likely out of scope for this story.
  Questions: do we target A only, or A + B? where should the Standard.site file live, and which fields are mandatory for mapping?
- 2026-02-13 00h39m29s — Pilot -> User — Decision: integration should be a plugin; story set to Pending until plugin path is ready.

## Dev log
- (none yet)
