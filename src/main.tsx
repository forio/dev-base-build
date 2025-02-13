import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_ERROR_HANDLERS, config } from 'epicenter-libs';
import { Provider as JotaiProvider } from 'jotai';
import { createRoot } from 'react-dom/client';
import { initReactI18next } from 'react-i18next';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import { ErrorBoundary, RouteErrorBoundary } from './layouts/error-boundary';
import { RedirectIfAuthed } from './layouts/redirect-if-authed';
import { RequireFocusedAuth } from './layouts/require-focused-auth';
import { TryRegenerate } from './layouts/try-regenerate';
import { FacilitatorHome } from './routes/facilitator';
import { Facilitator } from './routes/facilitator/facilitator';
import { Login } from './routes/login/login';
import { Logout } from './routes/logout/logout';
import { PlayerHome } from './routes/play';
import { Play } from './routes/play/play';
import { store } from './store';
import resources from 'virtual:i18next-loader';
import i18n from 'i18next';
import '@csstools/normalize.css';
import './index.scss';

if (config.isLocal()) {
  config.accountShortName = 'forio-dev';
  config.projectShortName = 'PROJECT_GOES_HERE';
  config.apiHost = 'epicenter-sandbox-1.forio.com';
}

const queryClient = new QueryClient();

Object.values(DEFAULT_ERROR_HANDLERS).forEach(({ unregister }) => unregister());
const router = createHashRouter(
  [
    {
      element: <RequireFocusedAuth />,
      children: [
        {
          element: <TryRegenerate />,
          children: [
            {
              path: '/',
              element: <Play />,
              children: [
                {
                  index: true,
                  element: <PlayerHome />,
                },
                {
                  path: '/*',
                  element: null,
                  errorElement: <RouteErrorBoundary />,
                  loader: () => {
                    throw new Response(`Not found`, { status: 404 })
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      element: <RequireFocusedAuth />,
      children: [
        {
          element: <TryRegenerate />,
          children: [
            {
              path: 'facilitator',
              element: <Facilitator />,
              children: [
                {
                  index: true,
                  element: <FacilitatorHome />,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      element: <RedirectIfAuthed />,
      children: [
        {
          path: '/login',
          element: <Login />,
          index: true,
        },
      ],
    },
    {
      path: '/logout',
      element: <Logout />,
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
    },
  }
);

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: {
    escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
  },
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <JotaiProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </JotaiProvider>
  </ErrorBoundary>
);