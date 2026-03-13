import '../styles/global.css';
// FullCalendar v6+ injects its styles automatically via JavaScript bundles.
// Previous versions required importing CSS files like "@fullcalendar/common/main.css",
// but those packages no longer include standalone CSS. The calendar will still
// render correctly without these imports.

import type { AppProps } from 'next/app';
import { ThemeProvider } from '../components/theme-provider';
import { SettingsProvider } from '../lib/SettingsContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <Component {...pageProps} />
      </SettingsProvider>
    </ThemeProvider>
  );
}
