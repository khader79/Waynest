import { useEffect, useState } from "react";
import "./Login.css";
import { post } from "../../../../api/apiService";
import { AUTH_ENDPOINTS } from "../../../../api/endpoints";
import { useAuth } from "../../../../context/AuthContext";
import { useNavigate } from "react-router-dom";

type loginData = {
  identifier: string;
  password: string;
};
const Login = () => {
  const [data, setData] = useState<loginData>({
    identifier: "",
    password: "",
  });

  const { login } = useAuth();

  const navigate = useNavigate();

  const handelLogin = async (e: any) => {
    e.preventDefault();
    try {
      const res = await post(
        AUTH_ENDPOINTS.LOGIN,
        data.identifier,
        data.password,
      );

      console.log(res.access_token);
      login(res.access_token);
      navigate("/user-panel");
    } catch (e) {
      console.log(e);
    } finally {
    }
  };
  return (
    <div className="login-page container-center">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>

        <form className="login-form">
          <div className="input-group">
            <label>Email</label>
            <input
              type="text"
              placeholder="Enter your email"
              value={data.identifier}
              onChange={(e) => {
                setData({ ...data, identifier: e.target.value });
              }}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={data.password}
              onChange={(e) => {
                setData({ ...data, password: e.target.value });
              }}
            />
          </div>

          <button className="login-button" onClick={handelLogin}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
