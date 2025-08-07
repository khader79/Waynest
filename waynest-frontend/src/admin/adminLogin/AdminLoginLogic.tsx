import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LoginLogic = () => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("status");
    localStorage.removeItem("token");
  }, []);

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const usernameChange = (e: any) => {
    setLoginData((prev) => ({ ...prev, username: e.target.value }));
  };

  const passwordChange = (e: any) => {
    setLoginData((prev) => ({ ...prev, password: e.target.value }));
  };

  const onsubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post("http://localhost:3001/auth/adminlogin", {
        email: loginData.username,
        password: loginData.password,
      });

      const userData = res.data;

      if (userData.result.role === "Admin") {
        localStorage.setItem("token", userData.access_token);
        localStorage.setItem("name", userData.result.name);
        localStorage.setItem("email", userData.result.email);
        localStorage.setItem("role", userData.result.role);
        localStorage.setItem("status", userData.result.status);
        navigate("/admin-panel");
      } else {
        alert("You are not an admin");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        alert(err.response.data.message);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return { loginData, usernameChange, passwordChange, onsubmit, isLoading };
};

export default LoginLogic;
