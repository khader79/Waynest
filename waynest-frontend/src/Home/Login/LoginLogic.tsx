import { replace, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import axios from "axios";

const LoginLogic = () => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const emailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData((prev) => ({ ...prev, email: e.target.value }));
  };

  const passwordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData((prev) => ({ ...prev, password: e.target.value }));
  };

  const onsubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:3001/auth/userslogin", {
        email: loginData.email,
        password: loginData.password,
      });
      console.log(res.data.result);

      const userData = res.data;

      localStorage.setItem("token", userData.access_token);
      localStorage.setItem("name", userData.result.name);
      localStorage.setItem("email", userData.result.email);
      localStorage.setItem("role", userData.result.role);
      localStorage.setItem("status", userData.result.status);
      navigate("/users", { replace: true });
    } catch (error: any) {
      console.log(error.response.data.message);
      alert(error.response.data.message);
    }
  };

  return { loginData, emailChange, passwordChange, onsubmit };
};

export default LoginLogic;
