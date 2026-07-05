import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token =
          localStorage.getItem("token");

        const res = await api.get(
          "/auth/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUser(res.data.user);
      } catch (error) {
        console.error(error);
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return <h2>Loading...</h2>;
  }

  return (
    <div>
      <h1>HallDesk Dashboard</h1>

      <Link to="/issues">
        My Issues
      </Link>

      <br />
      <br />

      <Link to="/create-issue">
        Raise New Issue
      </Link>

      <hr />

      <h3>Name: {user.name}</h3>

      <h3>
        Username: {user.username}
      </h3>

      <h3>Role: {user.role}</h3>

      <h3>
        Registration No: {user.registrationNo}
      </h3>

      <h3>
        Roll No: {user.rollNo}
      </h3>

      <h3>
        Department: {user.department}
      </h3>

      <h3>
        Current Year: {user.currentYear}
      </h3>

      <h3>
        Phone: {user.phone}
      </h3>

      <h3>
        Parent Phone: {user.parentPhone}
      </h3>
    </div>
  );
}

export default Dashboard;