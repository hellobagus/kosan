"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ProjectRefreshContext } from "@/hooks/useProjectRefresh";

export default function ProjectRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const onContextChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("kosanku:context-changed", onContextChanged);
    return () => window.removeEventListener("kosanku:context-changed", onContextChanged);
  }, [onContextChanged]);

  return (
    <ProjectRefreshContext.Provider value={refreshKey}>
      {children}
    </ProjectRefreshContext.Provider>
  );
}
