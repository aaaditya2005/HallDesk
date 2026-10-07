import { useNavigate } from "react-router-dom";

import "./Navbar.css";

function Navbar() {

    const navigate = useNavigate();

    const user =
        JSON.parse(localStorage.getItem("user") || "null");

    const logout = () => {

        localStorage.removeItem("token");

        localStorage.removeItem("user");

        navigate("/");

    };

    return (

        <header className="top-navbar">

            <div className="navbar-left">

                <h5>

                    Welcome,

                    <span>

                        {" "}

                        {user?.name || "User"}

                    </span>

                </h5>

            </div>

            <div className="navbar-right">

                <button
                    className="notification-btn"
                    type="button"
                >

                    <i className="bi bi-bell"></i>

                </button>

                <div className="profile-box">

                    <div>

                        <strong>

                            {user?.name}

                        </strong>

                        <small>

                            {user?.role
                                ?.replace("_", " ")
                                ?.toUpperCase()}

                        </small>

                    </div>

                    <button
                        className="logout-btn"
                        onClick={logout}
                        type="button"
                    >

                        <i className="bi bi-box-arrow-right"></i>

                    </button>

                </div>

            </div>

        </header>

    );

}

export default Navbar;