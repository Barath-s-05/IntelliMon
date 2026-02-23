import React, { useState } from "react";

const API_BASE = "http://localhost:5000";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    try {
      const endpoint = isLogin ? "/company/login" : "/company/register";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      if (isLogin) {
        localStorage.setItem("token", data.token);
        onLogin();
      } else {
        setIsLogin(true);
        alert("Registered successfully. Please login.");
      }

    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div className="login-bg">
      <div className="glass-card auth-card">
        <h2>{isLogin ? "Login" : "Register"}</h2>

        {!isLogin && (
          <input
            placeholder="Company Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        )}

        <input
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button onClick={handleSubmit}>
          {isLogin ? "Login" : "Register"}
        </button>

        <div
          className="toggle-auth"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Create account" : "Already have an account?"}
        </div>
      </div>
    </div>
  );
}

export default Auth;