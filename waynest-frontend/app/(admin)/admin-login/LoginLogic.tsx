"use client";

import { isAuthenticated } from "@/app/Auth";
import axios from "axios";
import { redirect, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const LoginLogic = () => {
  useEffect(() => {
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("status");
    localStorage.removeItem("token");
  });
  const router = useRouter();
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [user, setUser] = useState<any>(null);

  const usernameChange = (e: any) => {
    setLoginData((prev) => ({ ...prev, username: e.target.value }));
  };

  const passwordChange = (e: any) => {
    setLoginData((prev) => ({ ...prev, password: e.target.value }));
  };

  const onsubmit = async (e: any) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:3001/auth/login", {
        email: loginData.username,
        password: loginData.password,
      });

      const userData = res.data;
      setUser(userData);

      if (userData.result.role === "Admin") {
        localStorage.setItem("token", userData.access_token);
        localStorage.setItem("name", userData.result.name);
        localStorage.setItem("email", userData.result.email);
        localStorage.setItem("role", userData.result.role);
        localStorage.setItem("status", userData.result.status);
        router.replace(`/admin-panel`);
      } else {
        alert("your Not admin");
      }
    } catch (err) {
      alert("Invalid credentials");
      console.error(err);
    }
  };

  return { loginData, usernameChange, passwordChange, onsubmit };
};

export default LoginLogic;
