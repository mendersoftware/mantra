import { useEffect, useState } from 'react';

import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';
import { AppBar, IconButton, Stack, Tab, Tabs, Toolbar, Typography } from '@mui/material';

import { useRouter } from 'next/router';

import { paths } from '../pages';
import Link from './link';

export const Navbar = () => {
  const [mode, setMode] = useState('light');
  const [tabValue, setTabValue] = useState(0);
  const router = useRouter();
  const handleTabChange = (e, value) => setTabValue(value);

  useEffect(() => {
    if (!window) {
      return;
    }
    const pathname = !global.window || router.pathname.length > 1 ? router.pathname : window.location.pathname;
    const tabIndex = paths.findIndex(({ location }) => location.startsWith(pathname));
    setTabValue(tabIndex > -1 ? tabIndex : 1);
    setMode(window.localStorage.getItem('mode') || 'light');
  }, [router.pathname]);

  const onModeToggle = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    window.localStorage.setItem('mode', newMode);
    document.dispatchEvent(new Event('modeChanged'));
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexGrow={1}>
          <Typography variant="h6" component={Link} href="/" color="inherit">
            Mantra
          </Typography>
          <Tabs value={tabValue} onChange={handleTabChange} color="inherit" textColor="inherit">
            {paths.map(({ location, title }) => (
              <Tab key={location} color="inherit" label={title} component={Link} href={location} />
            ))}
          </Tabs>
          <IconButton onClick={onModeToggle} style={{ color: 'inherit' }}>
            {mode === 'light' ? <DarkModeIcon color="inherit" /> : <LightModeIcon color="inherit" />}
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
