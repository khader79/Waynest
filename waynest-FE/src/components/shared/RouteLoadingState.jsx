import "./RouteLoadingState.css";

export const RouteLoadingState = () => (
  <div className="route-loading-state">
    <div className="route-loader">
      <div className="route-loader-ring" />
      <p>Loading…</p>
    </div>
  </div>
);
