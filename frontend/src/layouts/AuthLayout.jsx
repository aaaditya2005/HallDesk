import { Container, Row, Col } from "react-bootstrap";

import background from "../assets/images/nitdgp-bg.png";
import logo from "../assets/images/nitdgp-logo.png";

import "./AuthLayout.css";

function AuthLayout({ children }) {
  return (
    <div
      className="auth-page"
      style={{
        backgroundImage: `url(${background})`,
      }}
    >
      <div className="auth-overlay">

        <Container fluid className="h-100">

          <Row className="h-100">

            <Col
              xl={4}
              lg={5}
              md={6}
              sm={12}
              className="login-panel"
            >

              <div className="login-wrapper">

                <div className="brand-section">

                  <img
                    src={logo}
                    alt="NIT Durgapur"
                    className="brand-logo"
                  />

                  <h1>
                    HallDesk
                  </h1>

                  <p>
                    Hostel Management System
                  </p>

                </div>

                {children}

              </div>

            </Col>

            <Col
              xl={8}
              lg={7}
              md={6}
              className="d-none d-md-block"
            />

          </Row>

        </Container>

      </div>

    </div>
  );
}

export default AuthLayout;