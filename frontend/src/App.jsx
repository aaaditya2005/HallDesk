import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Issues from "./pages/Issues";
import CreateIssue from "./pages/CreateIssue";
import WardenDashboard
from "./pages/WardenDashboard";
import IssueDetails from "./pages/IssueDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/warden-dashboard"
          element={<WardenDashboard />}
        />

        <Route
          path="/issues"
          element={<Issues />}
        />

        <Route
          path="/create-issue"
          element={<CreateIssue />}
        />

        <Route
        path="/issues/:id"
        element={<IssueDetails />}
      />

      </Routes>
    </BrowserRouter>
  );
}

export default App;