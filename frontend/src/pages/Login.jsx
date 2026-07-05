import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {

  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {

      const res = await api.post(
        "/auth/login",
        {
          username,
          password,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      const role =
        res.data.user.role;

      if (role === "student") {
        navigate("/dashboard");
      }
      else if (
        role === "warden"
      ) {
        navigate(
          "/warden-dashboard"
        );
      }
      else if (
        role === "admin"
      ) {
        navigate(
          "/admin-dashboard"
        );
      }

    } catch (error) {
      alert("Login Failed");
    }
  };

  return (
    <div>

      <h1>HallDesk Login</h1>

      <form onSubmit={handleLogin}>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <button type="submit">
          Login
        </button>

      </form>

    </div>
  );
}

export default Login;