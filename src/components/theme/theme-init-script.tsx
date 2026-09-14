/**
 * Runs before paint (inline, blocking) so the page never flashes light then
 * dark. Reads the user's saved choice from localStorage; if they've never
 * toggled, follows the OS preference once as a starting point (not tied to
 * prefers-color-scheme afterward — once someone picks explicitly, that
 * sticks regardless of what their system does). Kept as its own tiny
 * component (not inlined in layout.tsx) so the script text is easy to find
 * and isn't duplicated if layout.tsx changes.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("bhojsetu-theme");
    var theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
