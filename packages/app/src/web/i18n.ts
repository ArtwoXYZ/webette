import { normalizeLocale, type Locale } from "../shared/locale";

const en = {
  "label.test": "Test",
  "label.stop": "Stop",
  "label.build": "Build",
  "label.host": "Host",
  "label.ready": "Ready",
  "label.website": "Website",
  "label.folder": "Folder",
  "label.mute": "Mute",
  "label.settings": "Settings",
  "a11y.powerOn": "Turn Webette on",
  "a11y.powerOff": "Turn Webette off",
  "a11y.logo": "Bebette, a stylized cute spider wearing a cap",
  "a11y.bebette.magic": "Small cartoon spider with a magic wand",
  "a11y.bebette.work": "Small cartoon spider working",
  "a11y.bebette.read": "Small cartoon spider reading",
  "common.ok": "OK",
  "common.cancel": "Cancel",
  "folder.recent": "Recent folders",
  "folder.recentPlaceholder": "Recent folders…",
  "folder.tutorial": "Tutorial",
  "folder.choose": "Choose a folder…",
  "folder.replacePrompt": "Select a new folder?",
  "folder.mountPrompt": "Choose a site to mount",
  "folder.open": "Open folder",
  "build.completed": "Build completed in {duration}s",
  "build.failed": "Build failed ({count} error(s))",
  "build.requestFailed": "Unable to build: {reason}",
  "serve.startFailed": "Unable to start the server: {reason}",
  "serve.stopFailed": "Unable to stop the server: {reason}",
  "action.buildRunning": "Build in progress…",
  "action.buildAlreadyRunning": "A build is already in progress…",
  "action.stopBeforeBuild": "Stop the server before starting a build",
  "action.chooseFolder": "Choose a folder to get started",
  "action.configureHost": "Configure a hosting provider (coming soon)",
  "action.noWebsite": "No website linked or server running",
  "action.operationRunning": "Operation in progress, please wait…",
  "settings.language": "Language",
  "settings.french": "Français",
  "settings.english": "English",
  "settings.languageChanged": "Language changed to English",
  "api.invalid_json_body": "The app sent an invalid request",
  "api.missing_root_dir": "No site folder was provided",
  "api.invalid_root_dir": "The selected site folder is invalid",
  "api.invalid_cursor": "The log position is invalid",
  "api.build_already_running": "A build is already in progress",
  "api.serve_already_running": "The server is already running",
  "api.build_running": "A build is in progress",
  "api.other_site_active": "Another site is currently active",
  "api.no_serve_running": "No server is running",
  "api.no_active_site": "No site is active",
  "api.serve_start_failed": "The server could not start",
  "api.unknown_route": "The app requested an unknown operation",
  "api.internal_error": "An internal error occurred",
} as const;

type MessageKey = keyof typeof en;
type Catalog = Record<MessageKey, string>;

const fr: Catalog = {
  "label.test": "Test",
  "label.stop": "Stop",
  "label.build": "Générer",
  "label.host": "Publier",
  "label.ready": "Prêt",
  "label.website": "Site web",
  "label.folder": "Dossier",
  "label.mute": "Muet",
  "label.settings": "Réglages",
  "a11y.powerOn": "Allumer Webette",
  "a11y.powerOff": "Éteindre Webette",
  "a11y.logo": "Bebette, une jolie araignée stylisée portant une casquette",
  "a11y.bebette.magic": "Petite araignée dessinée avec une baguette magique",
  "a11y.bebette.work": "Petite araignée dessinée en train de travailler",
  "a11y.bebette.read": "Petite araignée dessinée en train de lire",
  "common.ok": "OK",
  "common.cancel": "Annuler",
  "folder.recent": "Dossiers récents",
  "folder.recentPlaceholder": "Dossiers récents…",
  "folder.tutorial": "Tutoriel",
  "folder.choose": "Choisir un dossier…",
  "folder.replacePrompt": "Sélectionner un nouveau dossier ?",
  "folder.mountPrompt": "Choisissez un site à monter",
  "folder.open": "Ouvrir le dossier",
  "build.completed": "Site généré en {duration}s",
  "build.failed": "Échec de la génération ({count} erreur(s))",
  "build.requestFailed": "Impossible de générer le site : {reason}",
  "serve.startFailed": "Serveur impossible à lancer : {reason}",
  "serve.stopFailed": "Arrêt du serveur impossible : {reason}",
  "action.buildRunning": "Génération en cours…",
  "action.buildAlreadyRunning": "Une génération est déjà en cours…",
  "action.stopBeforeBuild": "Arrêtez le serveur avant de générer le site",
  "action.chooseFolder": "Choisissez un dossier pour commencer",
  "action.configureHost": "Paramétrez un hébergeur (bientôt disponible)",
  "action.noWebsite": "Aucun site web lié ou serveur lancé",
  "action.operationRunning": "Opération en cours, patientez…",
  "settings.language": "Langue",
  "settings.french": "Français",
  "settings.english": "English",
  "settings.languageChanged": "Langue changée en français",
  "api.invalid_json_body": "L’application a envoyé une requête invalide",
  "api.missing_root_dir": "Aucun dossier de site n’a été fourni",
  "api.invalid_root_dir": "Le dossier de site sélectionné est invalide",
  "api.invalid_cursor": "La position dans les logs est invalide",
  "api.build_already_running": "Une génération est déjà en cours",
  "api.serve_already_running": "Le serveur est déjà lancé",
  "api.build_running": "Une génération est en cours",
  "api.other_site_active": "Un autre site est actuellement actif",
  "api.no_serve_running": "Aucun serveur n’est lancé",
  "api.no_active_site": "Aucun site n’est actif",
  "api.serve_start_failed": "Le serveur n’a pas pu démarrer",
  "api.unknown_route": "L’application a demandé une opération inconnue",
  "api.internal_error": "Une erreur interne est survenue",
};

const catalogs: Record<Locale, Catalog> = { en, fr };
let locale: Locale = normalizeLocale();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  locale = next;
}

export function t(
  key: MessageKey,
  params: Record<string, string | number> = {}
): string {
  return catalogs[locale][key].replace(/\{([^}]+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name])
  );
}

export type { Locale, MessageKey };
