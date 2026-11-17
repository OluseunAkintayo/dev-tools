import { Navigate, useLocation } from "react-router-dom";

export const Redirect = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} state={location.state} replace />;
};
