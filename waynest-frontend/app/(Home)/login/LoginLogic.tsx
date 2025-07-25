"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

const LoginLogic = () => {
  const router = useRouter();
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const usernameChange = (e: any) => {
    setLoginData((prev: any) => ({ ...prev, username: e.target.value }));
  };

  const passwordChange = (e: any) => {
    setLoginData((prev: any) => ({ ...prev, password: e.target.value }));
  };

  const onsubmit = (e: any) => {
    e.preventDefault();
    if (loginData.username === "" && loginData.password === "") {
      router.replace("/");
      localStorage.setItem("username", loginData.username);
    }
  };

  return { loginData, usernameChange, passwordChange, onsubmit };
};

export default LoginLogic;
