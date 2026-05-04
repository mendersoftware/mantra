import { useEffect } from 'react';

import { useRouter } from 'next/router';

import BuildStatus from './build-status';
import Nightlies from './nightlies';
import ProjectsView from './projects';
import SecurityStatus from './security-status';
import Stats from './stats';

export const paths = [
  { title: 'Projects', location: '/projects', component: ProjectsView },
  { title: 'Build Status', location: '/build-status', component: BuildStatus },
  { title: 'Nigthlies', location: '/nightlies', component: Nightlies },
  { title: 'Security Status', location: '/security-status', component: SecurityStatus },
  { title: 'Test statistics', location: '/stats', component: Stats }
];

const Index = () => {
  const router = useRouter();
  useEffect(() => {
    if (!window || !(window.location.pathname === '/' || paths.some(({ location }) => window.location.pathname.startsWith(location)))) {
      return;
    }
    router.push(window.location.pathname !== '/' ? window.location.pathname : paths[1].location);
  }, [router]);
  return null;
};

export default Index;
