"use client";

import React from "react";
import "./LoginPage.css";
import LoginLogic from "./LoginLogic";
import { redirect } from "next/navigation";

const AdminLogin = () => {
  const { loginData, usernameChange, passwordChange, onsubmit, isLoading } =
    LoginLogic();

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={onsubmit}>
        <h2 className="login-title">Welcome Back 👋</h2>
        <p className="login-subtitle">Please sign in to continue</p>

        <input
          //type="email"
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
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
