import { NavLink } from "react-router-dom";
import { useMemo } from "react";

import logo from "../../assets/images/nitdgp-logo.png";

import "./Sidebar.css";

function Sidebar() {

    const user =
        JSON.parse(localStorage.getItem("user") || "null");

    const role =
        user?.role;

    const basePath = {

        student: "/student",

        warden: "/warden",

        admin: "/admin",

        mess_manager: "/mess",

    }[role];

    const menuItems =
        useMemo(() => {

            switch (role) {

                case "student":

                    return [

                        {
                            name: "Dashboard",
                            path: `${basePath}/dashboard`,
                            icon: "bi-grid-fill",
                        },

                        {
                            name: "Issues",
                            path: `${basePath}/issues`,
                            icon: "bi-tools",
                        },

                        {
                            name: "Certificates",
                            path: `${basePath}/certificates`,
                            icon: "bi-file-earmark-text",
                        },

                        {
                            name: "Mess",
                            path: `${basePath}/mess`,
                            icon: "bi-cup-hot",
                        },

                        {
                            name: "Mess Expenses",
                            path: `${basePath}/expenses`,
                            icon: "bi-wallet2",
                        },

                        {
                            name: "Fines",
                            path: `${basePath}/fines`,
                            icon: "bi-cash-stack",
                        },

                        {
                            name: "Notices",
                            path: `${basePath}/notices`,
                            icon: "bi-megaphone",
                        },

                        {
                            name: "Polls",
                            path: `${basePath}/polls`,
                            icon: "bi-bar-chart",
                        },

                        {
                            name: "Profile",
                            path: `${basePath}/profile`,
                            icon: "bi-person-circle",
                        },

                    ];

                case "warden":

                    return [

                        {
                            name: "Dashboard",
                            path: `${basePath}/dashboard`,
                            icon: "bi-grid-fill",
                        },

                        {
                            name: "Notices",
                            path: `${basePath}/notices`,
                            icon: "bi-megaphone",
                        },

                        {
                            name: "Certificates",
                            path: `${basePath}/certificates`,
                            icon: "bi-file-earmark-text",
                        },

                        {
                            name: "Fines",
                            path: `${basePath}/fines`,
                            icon: "bi-cash-stack",
                        },

                        {
                            name: "Students",
                            path: `${basePath}/students`,
                            icon: "bi-people",
                        },

                        {
                            name: "Rooms",
                            path: `${basePath}/rooms`,
                            icon: "bi-door-open",
                        },

                        {
                            name: "Mess Expenses",
                            path: `${basePath}/expenses`,
                            icon: "bi-wallet2",
                        },

                        {
                            name: "Polls",
                            path: `${basePath}/polls`,
                            icon: "bi-bar-chart",
                        },

                        {
                            name: "Profile",
                            path: `${basePath}/profile`,
                            icon: "bi-person-circle",
                        },

                    ];

                case "admin":

                    return [

                        {
                            name: "Dashboard",
                            path: `${basePath}/dashboard`,
                            icon: "bi-grid-fill",
                        },

                        {
                            name: "Users",
                            path: `${basePath}/users`,
                            icon: "bi-people-fill",
                        },

                        {
                            name: "Issues",
                            path: `${basePath}/issues`,
                            icon: "bi-tools",
                        },

                        {
                            name: "Halls",
                            path: `${basePath}/halls`,
                            icon: "bi-building",
                        },

                        {
                            name: "Rooms",
                            path: `${basePath}/rooms`,
                            icon: "bi-door-open",
                        },

                        {
                            name: "Analytics",
                            path: `${basePath}/analytics`,
                            icon: "bi-graph-up",
                        },

                        {
                            name: "Audit Logs",
                            path: `${basePath}/audit-logs`,
                            icon: "bi-clock-history",
                        },

                        {
                            name: "Profile",
                            path: `${basePath}/profile`,
                            icon: "bi-person-circle",
                        },

                    ];

                case "mess_manager":

                    return [

                        {
                            name: "Today's Menu",
                            path: `${basePath}/menu`,
                            icon: "bi-cup-hot",
                        },

                        {
                            name: "Expenses",
                            path: `${basePath}/expenses`,
                            icon: "bi-wallet2",
                        },

                        {
                            name: "Fines",
                            path: `${basePath}/fines`,
                            icon: "bi-cash-stack",
                        },

                        {
                            name: "Profile",
                            path: `${basePath}/profile`,
                            icon: "bi-person-circle",
                        },

                    ];

                default:

                    return [];

            }

        }, [role, basePath]);

    return (

        <aside className="sidebar">

            <div className="sidebar-logo">

                <img
                    src={logo}
                    alt="HallDesk"
                />

                <div>

                    <h4>

                        HallDesk

                    </h4>

                    <small>

                        Hostel Management

                    </small>

                </div>

            </div>

            <nav className="sidebar-menu">

                {

                    menuItems.map((item) => (

                        <NavLink

                            key={item.path}

                            to={item.path}

                            className="sidebar-link"

                        >

                            <i className={`bi ${item.icon}`}></i>

                            <span>

                                {item.name}

                            </span>

                        </NavLink>

                    ))

                }

            </nav>

        </aside>

    );

}

export default Sidebar;