/**
 * Runs before paint (inline, blocking) so the page never flashes light then
 * dark. Reads the user's saved choice from localStorage; if they've never
 * toggled, defaults to light (the site's own default first impression —
 * not tied to OS prefers-color-scheme). Once someone explicitly toggles,
 * that choice sticks regardless of this default. Kept as its own tiny
 * component (not inlined in layout.tsx) so the script text is easy to find
 * and isn't duplicated if layout.tsx changes.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("bhojsetu-theme");
    var theme = saved === "light" || saved === "dark" ? saved : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
