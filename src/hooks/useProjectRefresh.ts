"use client";

import { createContext, useContext } from "react";

export const ProjectRefreshContext = createContext(0);

/** Naik setiap kali user klik Terapkan di header (ganti entity/project). */
export function useProjectRefreshKey() {
  return useContext(ProjectRefreshContext);
}
