import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Form,
  Button,
  InputGroup,
  Spinner,
} from "react-bootstrap";

import api from "../services/api";
import AuthLayout from "../layouts/AuthLayout";
import notify from "../utils/toast";

import "./Login.css";

function Login() {

  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (e) => {

    e.preventDefault();

    setLoading(true);

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

      localStorage.setItem(
        "user",
        JSON.stringify(
          res.data.user
        )
      );

      const role = res.data.user.role;

      switch (role) {

        case "student":

          navigate("/student/dashboard");
          break;

        case "warden":

          navigate("/warden/dashboard");
          break;

        case "mess_manager":

          navigate("/mess/dashboard");
          break;

        case "admin":

          navigate("/admin/dashboard");
          break;

        default:

          navigate("/");

      }

    }

    catch (error) {

      notify.error(
        error.response?.data?.message ||
        "Login Failed"
      );

    }

    finally {

      setLoading(false);

    }

  };

  return (

    <AuthLayout>

      <div className="login-heading">

        <h4>
          Sign In
        </h4>

        <p>
          Using your HallDesk credentials.
        </p>

      </div>

      <Form
        onSubmit={handleLogin}
      >

        <Form.Group className="mb-3">

          <Form.Label>

            Username

          </Form.Label>

          <Form.Control
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            required
          />

        </Form.Group>

        <Form.Group className="mb-4">

          <Form.Label>

            Password

          </Form.Label>

          <InputGroup>

            <Form.Control
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
            />

            <Button
              variant="outline-light"
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
            >

              <i
                className={
                  showPassword
                    ? "bi bi-eye-slash"
                    : "bi bi-eye"
                }
              />

            </Button>

          </InputGroup>

        </Form.Group>

        <div className="d-grid">

          <Button
            className="login-btn"
            type="submit"
            disabled={loading}
          >

            {

              loading ?

              <>

                <Spinner
                  animation="border"
                  size="sm"
                  className="me-2"
                />

                Logging In...

              </>

              :

              "Login"

            }

          </Button>

        </div>

        <div className="login-footer">

          Together Towards a Better NIT Durgapur

        </div>

      </Form>

    </AuthLayout>

  );

}

export default Login;