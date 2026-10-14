/**
 * Electrobun `postWrap` hook: runs once the macOS app that people download
 * (the self-extracting wrapper) is assembled, before the disk image.
 *
 * The app is not signed with a Developer ID, and Electrobun leaves its
 * wrapper with no valid signature at all. macOS then calls a downloaded
 * copy "damaged" and offers no way to open it. An ad-hoc signature (no
 * identity) keeps the bundle sealed: macOS only warns that the developer
 * cannot be verified, and "Open Anyway" becomes available.
 */

const wrapper = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH;

if (process.env.ELECTROBUN_OS === "macos" && wrapper) {
  const sign = Bun.spawnSync(["codesign", "--force", "--deep", "--sign", "-", wrapper], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (sign.exitCode !== 0) process.exit(sign.exitCode ?? 1);
  console.log(`Signed ${wrapper} (ad-hoc)`);
}
