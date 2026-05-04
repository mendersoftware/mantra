import { Stack, Typography } from '@mui/material';

import Link from './link';

const links = [
  { title: 'Github', location: 'https://github.com/mendersoftware/mantra' },
  { title: 'Docs', location: 'https://github.com/mendersoftware/mantra/blob/master/README.md' }
];

export const Footer = () => (
  <Stack direction="row" sx={{ alignItems: 'center', marginTop: 4, marginBottom: 8, justifyContent: 'space-between' }}>
    <div />
    <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
      Copyright ©{' '}
      <Link href="https://mender.io/" color="inherit">
        Mender.io
      </Link>{' '}
      {new Date().getFullYear()}.
    </Typography>
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      {links.map(({ title, location }) => (
        <Link key={title} href={location}>
          {title}
        </Link>
      ))}
    </Stack>
  </Stack>
);

export default Footer;
