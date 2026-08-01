/**
 * Must run before electrobun is imported: the WebView2 runtime reads
 * this env var when its environment is created (during electrobun
 * init), and it lets the boot jingle play without a user gesture.
 */
process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = [
  process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS,
  "--autoplay-policy=no-user-gesture-required",
]
  .filter(Boolean)
  .join(" ");
