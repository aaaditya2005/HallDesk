import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

import "./AppLayout.css";

function AppLayout() {
    const role = JSON.parse(localStorage.getItem("user") || "null")?.role || "student";

    return (

        <div className={`app-layout app-layout-role-${role}`}>

            <Sidebar />

            <div className="main-section">

                <Navbar />

                <main className="page-content">

                    <Outlet />

                </main>

            </div>

        </div>

    );

}

export default AppLayout;