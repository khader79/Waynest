"use client";

import React, { createContext, useState, useContext } from "react";

const UserContext = createContext<any>(undefined);

export const UserProvider = ({ children }: any) => {
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  return (
    <UserContext.Provider value={{ loginData, setLoginData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useLoginData = () => {
  return useContext(UserContext); // ✅ correct usage
};
