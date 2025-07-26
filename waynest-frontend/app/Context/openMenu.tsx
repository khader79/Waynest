"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const openMenuContext = createContext(null);
const OpenMenuProvider = ({ children }: any) => {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("openMenu");
    if (saved !== null) {
      //@ts-ignore
      setOpen(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("openMenu", String(open));
  }, [open]);

  return (
    //@ts-ignore
    <openMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </openMenuContext.Provider>
  );
};

export const useOpenMenu = () => {
  return useContext(openMenuContext);
};

export default OpenMenuProvider;
