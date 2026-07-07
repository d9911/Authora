import { THEME_COLOR, THEME_STORAGE_KEY } from '../model/theme';

const code = `
(() => {
  try {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const stored = window.localStorage.getItem(key);
    const theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? ${JSON.stringify(THEME_COLOR.dark)} : ${JSON.stringify(THEME_COLOR.light)});
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export function ThemeInitScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: code }} />;
}
