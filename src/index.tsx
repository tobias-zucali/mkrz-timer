import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './index.scss';
import Timer from 'routes/Timer';
import { PeerProvider } from 'components/PeerProvider';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Timer />,
    },
  ],
);

root.render(
  <React.StrictMode>
    <PeerProvider>
      <RouterProvider router={router} />
    </PeerProvider>
  </React.StrictMode>,
);
