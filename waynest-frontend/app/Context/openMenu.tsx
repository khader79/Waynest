"use client";

import React, { createContext, useContext, useState } from "react";

const openMenuContext = createContext(null);
const OpenMenuProvider = ({ children }: any) => {
  const [open, setOpen] = useState(true);
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
