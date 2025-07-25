// RegisterPage.jsx
import React from "react";
import "./RegisterPage.css";

const RegisterPage = () => {
  return (
    <div className="register-container">
      <form className="register-card">
        <h2 className="register-title">Create Account 🚀</h2>
        <p className="register-subtitle">Start your journey with Waynest</p>

        <input
          type="text"
          className="register-input"
          placeholder="Full Name"
          required
        />
        <input
          type="email"
          className="register-input"
          placeholder="Email Address"
          required
        />
        <input
          type="password"
          className="register-input"
          placeholder="Password"
          required
        />
        <input
          type="password"
          className="register-input"
          placeholder="Confirm Password"
          required
        />

        <button type="submit" className="register-button">
          Register
        </button>

        <p className="register-login-link">
          Already have an account? <a href="/login">Login</a>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;
