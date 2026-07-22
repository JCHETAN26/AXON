/**
 * Key under which the user's theme preference is persisted.
 * Shared by the inline init script and the ThemeProvider.
 */
export const THEME_STORAGE_KEY = "axon-theme";

/**
 * Inline script injected into <head> before hydration. It resolves the stored
 * preference (light | dark | system) against the OS preference and stamps the
 * resolved theme onto <html data-theme> before first paint, so the page never
 * flashes the wrong theme.
 */
export const themeInitScript = `(function () {
  try {
    var preference = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (preference !== "light" && preference !== "dark" && preference !== "system") {
      preference = "system";
    }
    var resolved =
      preference === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (error) {
    /* storage or matchMedia unavailable: CSS falls back to the OS preference */
  }
})();`;
