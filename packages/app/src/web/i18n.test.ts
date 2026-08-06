import { afterEach, describe, expect, test } from "bun:test";
import { setLocale, t } from "./i18n";

afterEach(() => setLocale("en"));

describe("app i18n", () => {
  test("switches the active catalog immediately", () => {
    setLocale("fr");
    expect(t("label.settings")).toBe("Réglages");

    setLocale("en");
    expect(t("label.settings")).toBe("Settings");
  });

  test("interpolates translated messages", () => {
    setLocale("fr");
    expect(t("build.completed", { duration: "1.4" })).toBe(
      "Site généré en 1.4s"
    );
  });

  test("translates stable API error codes", () => {
    setLocale("fr");
    expect(t("api.invalid_root_dir")).toBe(
      "Le dossier de site sélectionné est invalide"
    );
  });
});
