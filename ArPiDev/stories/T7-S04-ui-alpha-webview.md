# T7-S04 — UI alpha (webview)

**Status:** Active
**Opened:** 2026-08-01
**Closed:** —

---

## Goal

Première interface fonctionnelle de l'app desktop : intégrer la maquette `appTheme/` (console de jeu, HTML/CSS pur, zéro JS aujourd'hui) dans la webview Electrobun et la câbler sur l'API locale (T7-S02). L'utilisateur peut monter un site (tutorial ou dossier au choix), lancer un build, démarrer/arrêter le serve et ouvrir le site servi — le tout dans le design final, pour juger l'interface en conditions réelles.

## In scope

- **Intégration du thème** : déplacer `appTheme/` (index.html, style.css, init.css, fonts, assets SVG) dans `packages/app/src/web/` ; la webview affiche la console au lancement ; suppression du dossier `appTheme/` racine.
- **Lifecycle API** : le process principal (bun) spawne `webette api` au démarrage de l'app et tue le process proprement à la fermeture (y compris serve actif → `POST /stop` puis kill).
- **Séquence d'allumage** (~1 s max au démarrage) : sprites "éteints" (transparents) → petit son 8bit → les sprites des boutons s'allument, un des 3 sprites bebette (random) s'allume, son `::after` clignote à ~170 BPM (prévu pour être calé plus tard sur une musique de fond).
- **Sons 8bit programmatiques** (Web Audio, pas d'assets) : son d'allumage, son d'erreur sur action invalide. Le bouton Mute devient fonctionnel (coupe les sons).
- **Survol des boutons on-screen** : les `::after` du bouton survolé s'allument.
- **Popups infos diégétiques** (sur l'écran LCD) :
  - Website cliqué sans site lié/serveur : "aucun site web lié ou serveur lancé".
  - Boutons du device dans un contexte invalide : son d'erreur + popup contextuelle ("Choisissez un dossier pour commencer", "Paramétrez un hébergeur"…).
- **États des boutons selon l'étape** : chaque bouton non utilisable dans le contexte courant est désactivé, avec un indicateur visuel subtil (sprite atténué/éteint) ; le clic reste capté pour jouer le son d'erreur + la popup explicative. Exemples : Test/Build désactivés sans site monté, Website désactivé sans serve actif, tout désactivé pendant un build.
- **Folder** : popup pour choisir un dossier ou monter le site tutorial (remplace l'écran d'accueil imposé — le choix se fait via ce bouton).
- **Séquence Test (serve)** : Test s'allume → alternance bebette-work / bebette-read avec `::after` clignotants pendant le démarrage, barre de loading progressive → serveur lancé : barre pleine puis se vide d'un coup, bebette-magic animée (via `::after`), "Ready" apparaît, Website devient cliquable.
- **Câblage des contrôles** :
  - Bouton **Build** → `POST /build` ; feedback pendant le build (bebette-work, loading de l'écran) ; résumé à la fin (durée, erreurs).
  - Bouton **Test** → toggle serve : `POST /serve` / `POST /stop` ; le label change quand le serveur tourne (+ léger glow du bouton) ; état reflété via `GET /status`.
  - **open-website** → ouvre le navigateur par défaut sur `http://localhost:<port serve>` (actif seulement si serve en cours ; sinon popup infos).
  - **open-folder** → popup choix dossier/tutorial ; une fois monté, réouvre l'explorateur sur le dossier du site.
  - **Version** engine affichée (via `GET /status`).
  - États **bebette** pilotés par l'activité : magic (idle), work (build/serve en cours de démarrage), read (serve actif) — mapping ajustable pendant l'exécution.
- Polling léger de `GET /status` (et `/logs` si utile pour les états) pour tenir l'UI à jour.

## Out of scope

- **Musique de fond** : hors scope (le clignotement à ~170 BPM est posé pour pouvoir s'y caler plus tard).
- **Settings** : bouton présent mais décoratif dans cette alpha (Mute devient fonctionnel, lui).
- **Fenêtres extra-diégétiques** (logs détaillés, menus style JV) : vision notée au cadrage, stories futures — l'écran LCD reste diégétique (états, pas de flux de logs).
- Streaming logs temps réel (T7-S03) — le polling suffit ici.
- Packaging multi-OS (T7-S05).
- Éditeur de config (T7-S06).
- Multi-sites simultanés (l'API est mono-site, l'UI aussi).

---

## Done when

1. `bun run dev:app` ouvre la fenêtre native avec le design console complet (fonts, assets, mascotte) et joue la séquence d'allumage (~1 s : sprites éteints → son 8bit → boutons allumés, bebette random qui clignote à ~170 BPM).
2. Le bouton Folder ouvre la popup "choisir un dossier / monter le tutorial" ; le choix est reflété dans l'UI ; les actions invalides (Website sans serveur, boutons hors contexte) déclenchent son d'erreur + popup infos contextuelle.
3. Build : clic → build réel du site monté (via API), feedback visuel pendant, résumé après (durée/erreurs) ; `_public/` généré.
4. Test : toggle serve/stop fonctionnel avec la séquence complète (alternance work/read + loading progressif → barre pleine → vidage → bebette-magic + "Ready"), label + glow selon l'état, site accessible pendant le serve ; open-website ouvre le navigateur sur le bon port ; second toggle arrête proprement (port libéré).
5. open-folder ouvre l'explorateur sur le dossier monté ; la version engine s'affiche ; Mute coupe/réactive les sons.
6. Fermeture de l'app : le process `webette api` (et un serve actif éventuel) sont arrêtés — aucun process orphelin.
7. Typecheck vert ; `appTheme/` racine supprimé sans perte (tout vit dans `packages/app`).

---

## Execution brief

### Étapes courtes et vérifiables

1. **Intégration statique** — déplacer la maquette dans `packages/app/src/web/`, ajuster les chemins (fonts/assets), vérifier le rendu dans la webview Electrobun (parité visuelle avec `appTheme/serve.ts`).
2. **Spawn API** — le main process lance `webette api` (port dédié) via `Bun.spawn`, attend `/status` OK, kill à la fermeture (hook quit + arrêt du serve actif). Vérif : lancer/fermer l'app deux fois, aucun port occupé ni process orphelin.
3. **Pont webview ↔ API** — décider (au début de l'exécution) si la webview fetch directement `127.0.0.1:<port>` ou passe par RPC Electrobun ; implémenter un petit client API typé (réutiliser `ApiErrorCode`).
4. **Écran d'accueil + popups infos** — système de popup diégétique sur l'écran LCD (infos contextuelles) + popup Folder (sélecteur natif via le main process / monter tutorial), état site monté.
5. **Allumage + sons 8bit** — séquence de boot (~1 s), sons programmatiques Web Audio (allumage, erreur), Mute fonctionnel, clignotements `::after` à ~170 BPM, hover des boutons on-screen.
6. **Build + états bebette** — câbler Build, loading/feedback, résumé, bebette-work pendant l'opération.
7. **Toggle Test + open-website/open-folder** — cycle serve/stop complet depuis l'UI avec la séquence loading/Ready, label + glow, ouverture navigateur/explorateur.
8. **Passe finale** — fermeture propre (kill API + serve), typecheck, suppression `appTheme/`, mise à jour CODEMAP à la clôture.

## Constraints and traps

- La maquette est **CSS pur sans JS** : tous les comportements (states LCD, loading, toggles) sont à écrire — vérifier quelles classes CSS existent déjà pour les états (`lcd-active`, etc.) avant d'en inventer.
- **Web Audio et autoplay** : les webviews bloquent souvent l'audio avant le premier geste utilisateur — le son d'allumage au boot peut être muet au premier lancement ; prévoir un fallback gracieux (la séquence visuelle ne doit jamais dépendre du son).
- Un seul `webette api` par app : choisir un port dédié (éviter 4177 par défaut si l'user utilise aussi le CLI ? à trancher à l'exécution) et gérer le cas port occupé (message clair).
- Kill du process API à la fermeture : Electrobun/Windows — s'assurer que le child process ne survit pas (pas de detach), tester le scénario fermeture pendant un serve actif.
- Le serve du tutorial utilise le port 4173 (webette.tool.ts) : open-website doit lire le port depuis la réponse `/serve`/`/status`, jamais en dur.
- Ne PAS lancer serve pendant les validations sans accord explicite de l'user (DECISIONS 2026-02-06).
- Chemins : l'app tourne depuis `packages/app` — résoudre `packages/app/tutorial` de façon robuste (chemin absolu côté main process).
- Pas de rétro-compat à préserver sur le squelette POC (`src/bun/index.ts`, `src/web/index.ts`) : le remplacer sans béquille.

## Checks to run

```
bun run typecheck
bun run --cwd packages/app dev          # fenêtre + design + accueil
# puis manuellement dans l'app : monter tutorial → build → test (serve) → open-website → stop → fermer
# vérifier après fermeture : aucun process bun/webette orphelin, ports 4173/API libérés
```

## Evidence expected

- Capture/description de la fenêtre avec le design console intégré.
- Cycle complet dans l'app : monter site → build (résumé) → serve → site ouvert dans le navigateur → stop → fermeture propre.
- Vérification process/ports après fermeture.
- Typecheck vert, `appTheme/` supprimé.

## Documentation impact

- `ArPiDev/CODEMAP.md` : retirer la mention "appTheme PAS ENCORE intégrée", mettre à jour la structure monorepo et le component map (app UI) à la clôture.
- Site de doc : rien pour l'instant (app en alpha, doc au packaging T7-S05).

---

## Dev log

### 2026-08-01

**Cadrage (Pilot + user)**

Décisions validées ensemble :
- Ordre inversé S03/S04 : l'UI alpha d'abord — le polling `/logs` suffit pour l'alpha, et l'usage réel de l'UI informera le besoin exact du streaming (T7-S03).
- Intégration du thème `appTheme/` dans cette story (pas d'alpha brute) : l'objectif est de juger l'interface en conditions réelles.
- Sélection du site : via le bouton Folder — popup "choisir un dossier / monter le tutorial" (sélecteur natif).
- Bouton Test = toggle serve/stop, le texte change quand le serveur tourne + léger glow.
- Logs détaillés : hors scope — vision de fenêtres "extra-diégétiques" style menus de JV (popup logs, etc.) pour des stories futures ; l'écran LCD reste diégétique (états seulement).
- Settings décoratif dans cette alpha ; Mute fonctionnel (sons 8bit).
- Découverte au cadrage : la maquette est HTML/CSS pur, zéro JS — toute la logique UI est à écrire.

**Vision UX détaillée (user) :**
- Allumage simulé ~1 s max : sprites éteints (transparents) → son 8bit → sprites boutons allumés + un des 3 sprites bebette (random) avec `::after` clignotant à ~170 BPM (à caler plus tard sur une musique de fond, hors scope ici).
- Survol d'un bouton on-screen : ses `::after` s'allument.
- Website sans site lié/serveur : popup infos "aucun site web lié ou serveur lancé".
- Boutons device hors contexte : son d'erreur + popup infos contextuelle ("Choisissez un dossier pour commencer", "Paramétrez un hébergeur"…).
- Séquence Test : Test s'allume → alternance bebette work/read avec `::after` clignotants + barre de loading progressive jusqu'au serveur lancé → barre pleine, puis se vide d'un coup, bebette magic animée, "Ready" apparaît, Website cliquable.
- Boutons non utilisables selon l'étape : désactivés avec indication visuelle subtile (le clic reste capté → son d'erreur + popup explicative).
- Sons : générés programmatiquement en Web Audio (pas d'assets audio), style 8bit.
- L'ensemble reste ajustable pendant l'intégration.

### 2026-08-01 (2) — Exécution : intégration + câblage complets, debug session réelle

**Fait (Done-when 1 à 5 et 7 validés en session réelle par l'user) :**
- Maquette `appTheme/` déplacée dans `packages/app/src/web/` (git mv, `appTheme/` racine supprimé) ; `electrobun.config.ts` copie html/css/fonts/assets ; `app.css` séparé pour les styles pilotés par l'état (style.css reste la maquette pure).
- **Déviation validée par l'user** : pas de `Bun.spawn("webette api")` — l'API tourne **in-process** via `startApiServer({ port: 0 })` dans le main process (engine déjà dépendance workspace). Port choisi par l'OS (zéro conflit avec le CLI sur 4177), zéro risque d'orphelin : tout meurt avec le process. L'API engine reste indépendante pour le CLI.
- Pont webview ↔ API : proxy RPC (`apiFetch` côté bun) car l'origine de la webview ne peut pas fetch 127.0.0.1 (CORS) ; client typé `src/web/api.ts` (réutilise `ApiErrorCode`) ; `maxRequestTime` 10 min pour les gros builds.
- UI complète `src/web/index.ts` : machine à états (booting/idle/mounted/building/starting/serving), gating des boutons (désactivés visuellement mais clic capté → son d'erreur + popup contextuelle), popup diégétique LCD, popup Folder (Tutorial / dossier natif / annuler), séquence Test (alternance work/read + loading progressif → barre pleine → vidage → magic + Ready), toggle serve/stop, open-website/open-folder, Mute, polling status 2 s.
- Sons 8bit programmatiques Web Audio (`src/web/sounds.ts`) : boot, erreur, succès, clic.
- Cycle complet validé en session réelle : tutorial monté → build → serve (4174) → site ouvert dans le navigateur → stop → re-serve → open-folder → fermeture propre (ports libérés, aucun orphelin). Typecheck vert.

**Trois bugs de rendu résolus (Windows/WebView2) :**
1. **MIME types electrobun** : le handler `views://` de WebView2 ne connaît que js/css/png et sert tout le reste en `text/html` → SVG (tous les sprites) et woff2 cassés. Cause confirmée dans la source native d'electrobun (aucune version corrigée, y c. betas 1.18.4). **Workaround** : l'UI est servie par un mini serveur HTTP 127.0.0.1 in-process (`Bun.serve`, port 0, protection path traversal) — MIME corrects via Bun.file, meurt avec l'app.
2. **Quirks mode** : la maquette n'avait pas de `<!DOCTYPE html>` et dépendait de `body { height: 100% }` façon quirks. Avec le doctype ajouté : `html { height: 100% }` + `overflow: hidden` dans app.css.
3. **Layout initial** : le webview calcule son premier layout avant que le conteneur natif se stabilise (barre de titre) → léger débordement au lancement. Workaround : "nudge" de taille (setSize ±1px) ~600 ms après création.

**Fix engine au passage** : `sharp.d.ts` stub obsolète supprimé (il masquait les vrais types de sharp dans le projet engine mais pas depuis l'app → mystère de typecheck croisé) ; `sharp-loader.ts` aligné sur les vrais types (`typeof import("sharp").default`).

**Reste à faire (prochaine session) :**
- **Son au boot toujours bloqué** malgré `--autoplay-policy=no-user-gesture-required` via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` (posé avant l'import electrobun dans `src/bun/env.ts`) : le jingle ne part qu'après un premier clic. À creuser (l'env var n'atteint peut-être pas la création de l'environnement WebView2).
- ~~La popup Folder doit **toujours** proposer le tutorial, même si un site a déjà été monté.~~ Réalisé et validé le 2026-08-05.
- ~~Bouton "ouvrir le dossier" (explorateur) dans la popup de confirmation de build.~~ Ajouté le 2026-08-05.
- Version engine affichée : `vunknown` actuellement — corriger la remontée de version via `/status`.
- `sharp` indisponible depuis l'app (installs isolées Bun : binaire natif win32-x64 non résolu depuis `packages/app`) → images du tutorial non optimisées ; à régler (dépendance côté app ?).
- Commencer les **settings** (bouton aujourd'hui décoratif).
- ~~Petite **musique de fond**~~ → piste lead intégrée et validée le 2026-08-02 (voir plus bas) ; pistes restantes à ajouter.

**Ajouts au backlog de la story (user, 2026-08-02) :**
- **i18n** : tous les textes de l'app (popups, messages contextuels, labels dynamiques) doivent passer par un système de traduction — s'appuyer sur / s'aligner avec l'i18n de l'engine (`locales/`).
- **Fenêtre sans chrome Windows** : essayer de retirer la barre de titre pour n'avoir que le device à l'écran. En conséquence, ajouter un **bouton marche/arrêt** sur la console — l'allumage deviendrait un geste utilisateur, ce qui réglerait au passage le blocage du son au boot.
- **Folder en mode serve** : quand le site est servi (mode test), le bouton on-screen Folder sert à ouvrir le dossier du site dans l'explorateur.
- ~~**Historique des dossiers** : le menu du bouton Folder affiche une liste des derniers dossiers ouverts avec l'app (persistance à prévoir).~~ Réalisé et validé le 2026-08-05.
- **Opacité des menus on-screen** : tester des popups/menus opaques sur l'écran LCD (lisibilité vs effet diégétique).

### 2026-08-02 — Musique de fond : piste lead intégrée et validée

**Fait :**
- Question user en amont : polyphonie possible ? conversion MIDI ? → Web Audio est nativement polyphonique ; le user fournit ses MIDI directement, Pilot les convertit en données dans le code.
- Piste lead fournie par le user (`webette-lead.mid`, 134 BPM) parsée (format 1, 96 ticks/noire, 185 notes) et convertie en triplets compacts `[tick, note MIDI, durée]` dans `src/web/sounds.ts`.
- Séquenceur "lookahead" : un timer léger (200 ms) planifie les notes 0,6 s à l'avance sur l'horloge audio → timing précis sans boucle active ; boucle infinie calée sur 25 mesures (9600 ticks).
- Structure multi-pistes prête (`MUSIC_TRACKS` : type d'onde + volume par piste) pour accueillir les prochaines pistes (basse, percussions…).
- Mute : coupe nette via un gain maître (silence aussi les notes déjà planifiées) ; un-mute reprend la boucle du début.
- Démarrage : `startMusic(1.2)` juste après le jingle de boot ; si l'autoplay a bloqué l'audio, la musique se rattrape automatiquement au premier clic.
- **Testé et validé par le user en session réelle.**

**Reste à faire (musique) :**
- Intégrer les **autres pistes** du morceau (le user fournira les MIDI restants : basse, etc.).
- Caler le clignotement CSS `fx-blink` (actuellement 170 BPM) sur les 134 BPM de la musique.

### 2026-08-03 — Alignement cross-platform des contrôles physiques

**Fait et validé par l'user sur macOS :**
- Séparation du socle extérieur et du masque intérieur des boutons via `.btn-clip` : le socle est désormais positionné explicitement sans perdre les contours, ombres et effets enfoncés fournis par `overflow: hidden`.
- Centrage horizontal explicite des socles pour supprimer la différence de position statique entre WebView2/Chromium et WKWebView/WebKit.
- Rayons et alignement vertical spécifiques aux petits boutons Mute/Settings, avec parité visuelle des trois couches (bouton, masque, socle).
- Ajustement vertical des cinq boutons en portrait sans modifier le rendu paysage validé.
- Au breakpoint portrait étroit, `#console-panel` est ancré aux quatre côtés du bezel afin d'éviter le dépassement WebKit causé par `height: 100%` dans un parent à hauteur automatique calculée par `aspect-ratio`.

**Validation :**
- Paysage et portrait validés visuellement par l'user dans l'app macOS.
- Portrait étroit contrôlé avec un inset identique sur les quatre côtés du bezel.
- `bun run typecheck` et `git diff --check` verts.

### 2026-08-04 — Version engine dans l'API embarquée

- Cause de `vunknown` confirmée : `loadVersion()` lisait `package.json` relativement à `import.meta.url`, qui désigne le fichier ElectroBun fusionné après bundling et non plus le module source de l'engine.
- La version reste définie uniquement dans `packages/engine/package.json`, importée statiquement par le module version de l'engine afin que Bun l'intègre au bundle.
- L'API reste la source de vérité pour l'UI : `GET /status` renvoie désormais `version: "0.2025.120"` depuis l'app macOS bundlée.
- Vérifications : version présente dans le bundle généré, réponse `/status` correcte, `bun run typecheck` et `git diff --check` verts.

### 2026-08-05 — Ouvrir le dossier après un build

- La confirmation d'un build réussi propose désormais « Ouvrir le dossier » en plus de « OK ».
- Après le premier test utilisateur, la cible a été corrigée : l'action ouvre le dossier de sortie généré, pas la racine du site.
- Le résumé de `POST /build` expose désormais le chemin `outputDir` calculé depuis `toolEnv.build.outputDirName` ; l'UI ne suppose donc jamais que le dossier s'appelle `_public`.
- L'action réutilise le pont natif `openPath`, tandis que le bouton Folder de l'écran continue d'ouvrir le dossier du site monté.
- Vérifications : `bun run typecheck` et `git diff --check` verts ; build API du tutorial réussi, réponse `outputDir: packages/app/tutorial/_public`, dossier et `index.html` présents.
- Validation utilisateur : la confirmation s'affiche correctement et « Ouvrir le dossier » ouvre bien le dossier défini par `outputDirName` dans l'explorateur macOS.

### 2026-08-05 — Menu Folder et dossiers récents

- Hors serve, le bouton on-screen Folder ouvre désormais toujours le menu de sélection, y compris lorsqu'un site est déjà monté ; le tutorial reste donc accessible à tout moment. En serve, le comportement validé reste l'ouverture directe du dossier courant dans l'explorateur.
- Lorsqu'un site est déjà monté, le message devient « Sélectionner un nouveau dossier ? » afin d'expliciter que l'action remplacera la sélection courante.
- Le menu contient une liste déroulante des cinq derniers dossiers choisis. Les chemins complets sont conservés en interne, tandis que l'interface affiche leurs noms en casse normale pour rester compacte et lisible.
- L'historique est dédupliqué, remis en tête lors d'une nouvelle sélection et persisté côté process principal dans `Utils.paths.userData/app-state.json`. Ce stockage natif a été préféré à `localStorage`, car l'UI HTTP démarre sur un port aléatoire et change donc d'origine entre les lancements.
- Vérifications : `bun run typecheck` et `git diff --check` verts ; comportement, persistance et rendu de la liste validés par l'user dans l'app macOS.

### 2026-08-06 — i18n de l’app et premier réglage fonctionnel

**Implémentation :**
- Ajout d’un catalogue UI strictement typé FR/EN, avec interpolation, et d’un type `Locale` partagé aligné sur les deux locales supportées par l’engine.
- Tous les libellés, popups, actions contextuelles, textes d’accessibilité et erreurs API visibles passent désormais par `t()` ; les erreurs du protocole sont traduites depuis leur `ApiErrorCode` stable et non depuis le message anglais de debug.
- Le bouton Settings ouvre maintenant un menu diégétique de langue ; le changement FR/EN est immédiat (`lang` du document compris) et confirmé dans la nouvelle langue.
- La langue initiale suit celle du système (`fr*` → FR, sinon EN), puis la préférence choisie est persistée dans `app-state.json`.
- La persistance native a été centralisée afin que l’écriture de la langue conserve les dossiers récents et réciproquement ; les éventuelles clés futures inconnues sont également préservées.

**Why this way :** commencer Settings par la langue donne une utilité réelle au bouton tout en empêchant que les prochains écrans multiplient les textes codés en dur. Le catalogue TypeScript impose la parité exacte des clés FR/EN au typecheck ; la persistance reste côté main process car le port HTTP aléatoire rend `localStorage` impropre, comme pour l’historique Folder.

**Vérifications :** `bun run typecheck`, `git diff --check` et 3 tests unitaires ciblés (changement de catalogue, interpolation, traduction d’un code d’erreur API) verts. Changement de langue à chaud, rendu FR/EN et persistance après relance validés par l'user dans l'app macOS.

**Ajustement après validation user :** le français conserve « Stop » et traduit systématiquement le vocabulaire de build par « Générer / génération » ; la confirmation devient « Site généré en … ». Ajustement retesté et validé par l'user.

---

## Pilot exchange

- **In-process vs spawn** : Pilot a proposé l'API in-process (engine déjà bundlé, zéro orphelin) au lieu du spawn prévu au cadrage ; validé par l'user — l'API HTTP reste la frontière, le CLI garde `webette api`.
- **Sonde de debug temporaire** (probe MIME/layout via RPC debugLog) utilisée pour diagnostiquer les 3 bugs de rendu, retirée avant commit (choix user).
- **UX validée en session réelle** par l'user : affichage OK après les fixes, cycle complet fonctionnel ; ajustements listés dans "Reste à faire".
