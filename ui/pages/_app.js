import { useEffect, useState } from 'react';

import { CacheProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import Head from 'next/head';

import Layout from '../components/layout';
import createEmotionCache from '../src/createEmotionCache';
import { dark as darkTheme, light as lightTheme } from '../src/themes/Mender';

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

const App = ({ Component, emotionCache = clientSideEmotionCache, pageProps }) => {
  const [mode, setMode] = useState('light');
  const modeChangedHandler = () => setMode(window.localStorage.getItem('mode') || 'light');
  useEffect(() => {
    if (!window) {
      return;
    }
    modeChangedHandler();
    document.addEventListener('modeChanged', modeChangedHandler, false);
  }, []);
  const theme = createTheme(mode === 'dark' ? darkTheme : lightTheme);
  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>Mantra</title>
        <meta charSet="utf-8" name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ThemeProvider>
    </CacheProvider>
  );
};

export default App;
