/**
 * Blocking inline script that applies the persisted (or system) colour scheme
 * before first paint, so there is no light/dark flash. Rendered as the first
 * child of <body>; pair with `suppressHydrationWarning` on <html>.
 */
export function ThemeScript() {
  const js = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.toggle('dark',!!d);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} suppressHydrationWarning />;
}
