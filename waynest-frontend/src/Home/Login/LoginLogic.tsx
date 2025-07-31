import { useNavigate } from "react-router-dom";
import React, { useState } from "react";

const LoginLogic = () => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const usernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData((prev) => ({ ...prev, username: e.target.value }));
  };

  const passwordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData((prev) => ({ ...prev, password: e.target.value }));
  };

  const onsubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.username === "" && loginData.password === "") {
      localStorage.setItem("username", loginData.username);
      navigate("/", { replace: true });
    }
  };

  return { loginData, usernameChange, passwordChange, onsubmit };
};

export default LoginLogic;
