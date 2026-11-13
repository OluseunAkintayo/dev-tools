import { Navigate, useLocation } from "react-router-dom";

/** Sends an old address to its new home, keeping the query string and any data handed over. */
export const Redirect = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} state={location.state} replace />;
};
