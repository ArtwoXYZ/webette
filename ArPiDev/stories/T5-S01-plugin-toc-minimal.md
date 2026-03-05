# T5-S01 — Plugin TOC (spec + plugin minimal + doc d'usage)

Created: 2026-02-22 21h37m41s
Closed:
Acceptance: User

Status: Ready for Development

## Context
La roadmap beta impose une capacité plugin minimale, avec un premier cas concret TOC (table des matières). Aujourd'hui, cette capacité n'est pas cadrée de façon exécutable dans une story dédiée. Ce plugin servira d'exemple de référence pour la structure et l'intégration des futurs plugins Webette.

## Rationale
Commencer par un plugin TOC minimal permet de valider l'ergonomie plugin sur un besoin réel, sans étendre le scope à un système plugin complet. Ce plugin doit démontrer :
1. L'utilisation correcte des hooks plugin existants (`transformEntry` par exemple, mais pas que.)
2. L'intégration propre dans le modèle de données
3. La fourniture de partials pour le rendu
4. La documentation minimale requise pour les plugins

## Goal
Définir et implémenter un plugin TOC minimal utilisable sur du contenu markdown, avec une documentation d'usage claire. Ce plugin servira d'exemple de référence pour la structure et l'intégration des futurs plugins Webette.

## Technical Specification

**Note importante** : Tous les exemples de code dans cette section sont fournis à titre illustratif pour clarifier les attentes. L'implémentation finale doit suivre les patterns et conventions de la codebase Webette existante, utiliser les APIs disponibles, et respecter l'architecture actuelle.

### Architecture
Le plugin TOC suit l'architecture plugin existante de Webette :
- Fichier principal : `_plugins/toc/toc.js` (ESM)
- Configuration : uniquement via `webette.config.ts`
- Activation sélective : via fichier marqueur `toc.webt` dans les entries
- Hook utilisé : `transformEntry` pour ajouter les données TOC au modèle

### Configuration (webette.config.ts)
```typescript
export default {
  plugins: ["_plugins/toc/toc.js"],
  pluginConfig: {
    toc: {
      // Si false, le plugin ne s'applique qu'aux entries avec toc.webt
      forAllEntries: false,
      
      // Niveau minimum des headings à inclure (default: 2)
      minLevel: 2,
      
      // Niveau maximum des headings à inclure (default: 4)
      maxLevel: 4,
      
      // Chemin vers un partial custom (optionnel)
      // Si non spécifié, utilise le partial par défaut du plugin
      partialPath: "_templates/partials/custom-toc.hbs"
    }
  }
}
```

### Activation Sélective
- **Mode global** : `forAllEntries: true` → TOC généré pour toutes les entries
- **Mode sélectif** : `forAllEntries: false` → TOC généré uniquement pour les entries contenant un fichier `toc.webt` (fichier vide)

### Structure du Plugin
```
_plugins/
└── toc/
    ├── toc.js            # Point d'entrée du plugin (ESM)
    ├── partials/
    │   └── toc.hbs       # Partial par défaut pour le rendu
    └── README.md         # Documentation en anglais (modèle pour les futurs plugins)
```

### Données TOC dans le Modèle
Le plugin ajoute les données TOC directement dans le modèle de l'entry :
```typescript
interface TocItem {
  level: number;        // Niveau du heading (2, 3, 4...)
  text: string;         // Texte du heading
  slug: string;         // Ancrage HTML (pour les liens)
  children?: TocItem[];  // Sous-sections
}

// Ajouté à l'entry par transformEntry
interface Entry {
  // ... champs existants
  toc?: {
    items: TocItem[];    // Structure hiérarchique
    html: string;        // Rendu HTML prêt à l'emploi
  };
}
```

### Hooks Implémentés
**Exemple illustratif** - L'implémentation doit utiliser les APIs réelles de Webette :

```javascript
export default {
  pluginId: "toc",
  
  transformEntry(entry, ctx) {
    // 1. Vérifier si le plugin doit s'appliquer à cette entry
    const shouldProcess = ctx.env.pluginConfig?.toc?.forAllEntries ||
                         entry.files.some(f => f.name === "toc.webt");
    
    if (!shouldProcess) return entry;
    
    // 2. Extraire les headings du contenu markdown
    //    → Utiliser les APIs de parsing markdown de Webette
    const headings = extractHeadings(entry, ctx);
    
    // 3. Générer la structure TOC
    //    → Respecter les interfaces de données existantes
    const toc = generateToc(headings, ctx.env.pluginConfig?.toc);
    
    // 4. Ajouter au modèle
    return { ...entry, toc };
  },
  
  extendTemplates(handlebars, ctx) {
    // Registrer le partial complet (inclut toute la structure HTML)
    // → Utiliser ctx.readFileSync ou équivalent disponible
    const tocPartial = ctx.readFileSync(path.join(__dirname, "..", "partials", "toc.hbs"));
    handlebars.registerPartial("toc-partial", tocPartial);
    
    // Registrer le helper simple qui utilise le partial complet
    handlebars.registerHelper("toc", function() {
      const entry = this;
      if (!entry?.toc) return "";
      
      // Passer les données TOC au partial complet
      const template = handlebars.compile(tocPartial);
      return new handlebars.SafeString(template({ toc: entry.toc }));
    });
    
    // Si un partial custom est configuré, le registrer aussi
    if (ctx.env.pluginConfig?.toc?.partialPath) {
      try {
        const customPartial = ctx.readFileSync(ctx.env.pluginConfig.toc.partialPath);
        handlebars.registerPartial("custom-toc", customPartial);
        
        // Helper pour le partial custom
        handlebars.registerHelper("customToc", function() {
          const entry = this;
          if (!entry?.toc) return "";
          return new handlebars.SafeString(customPartial(entry.toc));
        });
      } catch (e) {
        ctx.logger.warn("toc.customPartialNotFound", { path: ctx.env.pluginConfig.toc.partialPath });
      }
    }
  }
}
```

**Points d'attention pour l'implémentation :**
- Utiliser les APIs existantes de Webette pour le parsing markdown
- Respecter les interfaces de données (`Entry`, `Block`, etc.)
- Suivre les conventions de logging et d'erreurs
- Gérer les chemins de fichiers de manière robuste (utiliser `path.join`)
- Vérifier les permissions et existence des fichiers

### Utilisation dans les Templates
Le plugin fournit une intégration complète via un simple helper :

```handlebars
{{!-- Intégration complète - tout est géré par le plugin --}}
{{{toc}}}
```

Le plugin gère automatiquement :
- La structure HTML complète (container, classes, etc.)
- La vérification de la présence de `entry.toc`
- Le rendu conditionnel (rien n'est affiché si pas de TOC)
- Les hooks de styling via des classes CSS standard

### Contenu du Partial par Défaut (`_plugins/toc/partials/toc.hbs`)
**Exemple illustratif** - Le partial final doit suivre les conventions de templating de Webette :

```handlebars
{{!-- Ce partial est complètement auto-suffisant --}}
{{#if toc}}
<nav class="webette-toc" aria-label="Table of contents">
  <div class="webette-toc__inner">
    {{!-- Rendu hiérarchique des items TOC --}}
    <ul class="webette-toc__list">
      {{#each toc.items}}
        <li class="webette-toc__item webette-toc__item--level-{{level}}">
          <a href="#{{slug}}" class="webette-toc__link">{{text}}</a>
          {{#if children}}
            <ul class="webette-toc__list">
              {{#each children}}
                <li class="webette-toc__item webette-toc__item--level-{{level}}">
                  <a href="#{{slug}}" class="webette-toc__link">{{text}}</a>
                </li>
              {{/each}}
            </ul>
          {{/if}}
        </li>
      {{/each}}
    </ul>
  </div>
</nav>
{{/if}}
```

**Notes sur l'implémentation :**
- Utiliser les helpers Handlebars existants de Webette
- Respecter les conventions de naming des classes
- Prévoir une structure accessible (aria-label, navigation sémantique)
- Gérer correctement l'échappement HTML

### Implémentation du Helper
```javascript
// Dans extendTemplates
extendTemplates(handlebars, ctx) {
  // Registrer le partial complet (inclut toute la structure HTML)
  const tocPartial = ctx.readFileSync(path.join(__dirname, "..", "partials", "toc.hbs"));
  handlebars.registerPartial("toc-partial", tocPartial);
  
  // Registrer le helper simple qui utilise le partial complet
  handlebars.registerHelper("toc", function() {
    const entry = this;
    if (!entry?.toc) return "";
    
    // Passer les données TOC au partial complet
    const template = handlebars.compile(tocPartial);
    return new handlebars.SafeString(template({ toc: entry.toc }));
  });
}
```

### Exemple de Fichier toc.webt
Fichier vide placé dans une entry pour activer le TOC en mode sélectif :
```
entry/
├── 01-content.md
└── toc.webt          # Fichier vide - active le TOC pour cette entry
```

## In scope
- Définir la spec minimale du plugin TOC (comportement + options supportées).
- Implémenter le plugin TOC dans `_plugins/toc/toc.js` en utilisant le hook `transformEntry`.
- Générer une structure TOC à partir des headings markdown.
- Intégrer les données TOC directement dans le modèle de l'entry.
- Fournir un partial par défaut dans `_plugins/toc/partials/toc.hbs`.
- Supporter un partial custom via configuration.
- Implémenter l'activation sélective via fichier `toc.webt`.
- Ajouter une documentation README en anglais dans `_plugins/toc/README.md`.
- Vérifier le fonctionnement sur `website-example` (build + rendu observé).

## Out of scope
- Refondre l'architecture plugin globale.
- Ajouter plusieurs plugins dans la même story.
- Ajouter une UI de configuration plugin.
- Cibler tous les cas edge markdown avancés (scope minimal beta).

## Documentation impact
- To document: configuration minimale du plugin TOC dans `webette.config.ts`.
- To document: format de sortie TOC et intégration dans le modèle d'entry.
- To document: activation sélective via `toc.webt` et option `forAllEntries`.
- To document: exemple d'activation + exemple de rendu avec le helper `{{toc}}`.
- To document: structure du plugin dans `_plugins/toc/` comme exemple de référence.
- To document: création d'un README en anglais dans `_plugins/toc/README.md`.
- To document: utilisation du helper `{{toc}}` qui inclut toute la structure HTML.
- To document: classes CSS fournies par le partial pour le styling (`webette-toc`, `webette-toc__item`, etc.).

## Ready when
- Goal est un seul résultat clair.
- In scope / Out of scope explicites.
- Done when testable.
- Acceptance owner est défini.
- Rationale est présente.

## Done when
- Une spec minimale du plugin TOC est écrite dans la story (comportement + options supportées).
- Le plugin TOC est implémenté dans `_plugins/toc/toc.js` avec les hooks appropriés.
- Les données TOC sont intégrées directement dans le modèle des entries.
- Le plugin fournit un partial complet dans `_plugins/toc/partials/toc.hbs` (inclut toute la structure HTML).
- Un helper `{{toc}}` est enregistré pour une intégration complète en une ligne.
- L'activation sélective via `toc.webt` est implémentée et fonctionnelle.
- Un build de `website-example` confirme la présence des données TOC attendues dans le modèle.
- Un exemple de rendu TOC est visible (utilisation du helper `{{toc}}`).
- Un README en anglais est présent dans `_plugins/toc/README.md` (modèle pour les futurs plugins).
- Commandes de vérification et résultats sont consignés dans le `Dev log`.
- Le plugin est structuré comme exemple de référence pour les futurs plugins.

## Pending reason
-

## Remaining work

### Future Enhancements

#### Plugin Directory Auto-Discovery System
**Description**: Implement directory-based plugin auto-discovery to simplify plugin configuration and management.

**Current Implementation**:
```typescript
// Explicit file configuration (current)
plugins: ['_plugins/toc/toc.js']
```

**Proposed Implementation**:
```typescript
// Directory-based configuration (future)
plugins: ['_plugins']  // Auto-discovers all plugins in directory
```

**Requirements**:
1. Modify `src/plugins/loader.ts` to support directory scanning
2. Implement recursive plugin discovery with proper error handling
3. Maintain backward compatibility with explicit file paths
4. Define plugin directory structure conventions
5. Add comprehensive testing for various scenarios

**Benefits**:
- Simpler configuration (specify directory, not individual files)
- Easier plugin management (add/remove directories instead of editing config)
- Better scalability for multiple plugins
- Improved developer experience

**Priority**: Medium (Enhancement for future iteration)

**Dependencies**:
- Core plugin loader modifications required
- Maintain backward compatibility

**Acceptance Criteria**:
- Plugins can be loaded by specifying directory only
- Existing explicit configurations continue to work
- Clear documentation on plugin directory structure
- Comprehensive error handling and reporting

**Notes**:
- Current TOC plugin implementation serves as reference for explicit configuration
- This enhancement would build on the existing robust plugin architecture
- Requires core system changes, not just plugin modifications

## Resume condition
-

## Commit proposal
Title: feat(plugin): implement TOC plugin with full configuration support

Description:
- Implements complete TOC (Table of Contents) plugin for Webette
- Supports h1-h6 heading levels with hierarchical nesting
- Respects configuration from webette.config.ts (minLevel, maxLevel, forAllEntries)
- Uses Webette's native slug generation system
- Provides clean CSS styling with BEM classes
- Supports both global and selective activation modes
- Includes comprehensive documentation and README

Scope(s):
- plugin
- toc
- template
- config

Why these scopes:
- plugin: Core plugin system integration
- toc: Table of Contents specific functionality
- template: Handlebars template and partial implementation
- config: Configuration system integration

## Pilot exchange
- 2026-02-22 21h37m41s — Pilot -> User — Story créée après validation de T3-S04. Merci de valider le contenu avant activation Dev.
- 2026-02-26 18h17m14s — Pilot -> User — Story renumérotée de `T4-S01` vers `T5-S01` après insertion d'un nouveau chantier `T4` (refonte du modèle arborescent).
- 2026-02-27 00h30m00s — Pilot -> User — Story complètement réécrite avec l'architecture plugin correcte basée sur le système existant et les requirements utilisateur. Merci de valider cette version.
- 2026-02-27 01h15m00s — Pilot -> User — Ajout d'une intégration template simplifiée avec helper `{{toc}}` pour une utilisation minimale sans balises supplémentaires. Conservation de la modification utilisateur sur les hooks (« transformEntry par exemple, mais pas que »).
- 2026-02-27 01h45m00s — Pilot -> User — Correction de l'approche : le plugin fournit maintenant un partial complet avec toute la structure HTML (container, classes, etc.) pour que `{{{toc}}}` soit complètement auto-suffisant. Suppression de l'option « avec balises personnalisées » qui n'a plus lieu d'être.
- 2026-02-27 02h00m00s — Pilot -> User — Ajout de notes claires indiquant que tous les exemples de code sont illustratifs et que l'implémentation doit suivre les APIs et conventions réelles de la codebase Webette. Story prête pour validation finale avant implémentation.
- 2026-02-27 02h15m00s — User -> Pilot — Validation de la story. Prêt pour l'implémentation Dev.

## Dev log
- 2026-03-05 15:00:00 — Dev -> Story — Implémentation initiale du plugin TOC avec génération de slugs personnalisés
- 2026-03-05 16:00:00 — Dev -> Story — Correction du système de slugs pour utiliser ceux générés par Webette (extraction depuis HTML)
- 2026-03-05 17:00:00 — Dev -> Story — Suppression de la fonction slugify redondante et nettoyage du code
- 2026-03-05 18:00:00 — Dev -> Story — Vérification que le plugin fonctionne sans modification du core (suppression de toc des PREFERRED_KEYS)
- 2026-03-05 19:00:00 — Dev -> Story — Documentation de l'amélioration future pour le chargement des plugins par dossier
- 2026-03-05 20:00:00 — Dev -> Story — Implémentation complète du plugin TOC avec support h1-h6, configuration respectée, template récursif et CSS fonctionnel
- 2026-03-05 20:30:00 — Dev -> Story — Vérification finale : build réussi, TOC généré correctement, configuration minLevel/maxLevel fonctionnelle, pas d'erreurs
