// resources/js/apps/registry.js
// The single registry of apps in the hub. Adding a teammate's app is one entry
// here plus its folder under resources/js/apps/. The shell reads this list to
// build the side panel and the routes. Each component is lazy-loaded so it
// compiles into its own chunk and only loads when its route opens; a broken
// import in one app fails only that app's chunk.
import { lazy } from 'react';

// NOTE: each app's root lives at resources/js/apps/<folder>/index.jsx and is the
// translated version of the teammate's file (static arrays swapped for Laravel
// /api reads via lib/api.js, identity from the shell, writes through the API which
// records activity_log server-side). The raw teammate file is NOT imported directly.
export const APPS = [
  // All apps below are translated and live. Each entry maps key/label/path to a
  // lazy import so the app compiles into its own chunk and loads on demand. The
  // Portal owns '/' and hosts the others as embedded pages.
  {
    key: 'portal',
    label: 'Portal',
    path: '/',
    component: lazy(() => import('./portal/index.jsx')),
  },
  {
    key: 'clientprofile',
    label: 'Client Profiles',
    path: '/client-profiles',
    component: lazy(() => import('./clientProfile/index.jsx')),
  },
  {
    key: 'training',
    label: 'Training Tracker',
    path: '/training',
    component: lazy(() => import('./training/index.jsx')),
  },
  {
    key: 'trainerWorkload',
    label: 'Trainer Workload',
    path: '/trainer-workload',
    component: lazy(() => import('./trainerWorkload/index.jsx')),
  },
  {
    key: 'qaqc',
    label: 'QAQC',
    path: '/qaqc',
    component: lazy(() => import('./qaqc/index.jsx')),
  },
  {
    key: 'devsupport',
    label: 'Dev Support',
    path: '/dev-support',
    component: lazy(() => import('./devSupport/index.jsx')),
  },
];
