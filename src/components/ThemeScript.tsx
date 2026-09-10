import { THEME_STORAGE_KEY } from "@/lib/theme";

/** Evita flash de tema errado antes do React hidratar. */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=t==="light"||t==="dark"?t:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",d);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
