import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";

/**
 * Hostname-based app routing:
 *   team.venuloq.com  →  TeamRoot  (standalone team portal)
 *   venuloq.com        →  App       (customer-facing site, includes /team/* fallback)
 */
const isTeamDomain = window.location.hostname.includes('teams');

const AppLoader = React.lazy(() =>
  isTeamDomain ? import('@/TeamRoot') : import('@/App')
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <React.Suspense fallback={<div style={{position:'fixed',inset:0,background:'#0a0a0c'}} />}>
      <AppLoader />
    </React.Suspense>
  </React.StrictMode>,
);
