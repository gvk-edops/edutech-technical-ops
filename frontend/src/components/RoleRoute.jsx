import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";

export default function RoleRoute({ allowedRoles, children }) {
  const [state, setState] = useState({ loading: true, role: null });

  useEffect(() => {
    let active = true;
    axios
      .get(`${API_URL}/auth/me`)
      .then(({ data }) => {
        if (active)
          setState({
            loading: false,
            role: data.Status ? data.user?.role : null,
          });
      })
      .catch(() => {
        if (active) setState({ loading: false, role: null });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading access...
      </div>
    );
  }

  if (!state.role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(state.role)) {
    return (
      <Navigate
        to={state.role === "technician" ? "/app/assembly" : "/app/dashboard"}
        replace
      />
    );
  }

  return children;
}
