import { Link } from "react-router-dom";
import "./LoginPage.css";
import LoginLogic from "./LoginLogic";
import HomeMain from "../HomeMain";

const LoginPage = () => {
  const { loginData, usernameChange, passwordChange, onsubmit } = LoginLogic();

  return (
    <HomeMain>
      <div className="login-container">
        <form className="login-form" onSubmit={onsubmit}>
          <h2 className="login-title">Welcome Back 👋</h2>
          <p className="login-subtitle">Please sign in to continue</p>

          <input
            type="text"
            placeholder="Email address"
            className="login-input"
            value={loginData.username}
            onChange={usernameChange}
          />
          <input
            type="password"
            placeholder="Password"
            className="login-input"
            value={loginData.password}
            onChange={passwordChange}
          />

          <button type="submit" className="login-button">
            Login
          </button>

          <p className="login-footer">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </form>
      </div>
    </HomeMain>
  );
};

export default LoginPage;
