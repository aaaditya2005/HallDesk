import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const token = () => localStorage.getItem("token");

export const getStudentDashboard = () =>
    axios.get(
        `${API}/dashboard/student`,
        {
            headers: {
                Authorization: `Bearer ${token()}`,
            },
        }
    );

export const getAdminDashboard = () =>
    axios.get(
        `${API}/dashboard/admin`,
        { headers: { Authorization: `Bearer ${token()}` } }
    );