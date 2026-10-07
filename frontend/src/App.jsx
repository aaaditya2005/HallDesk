import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";

// Student
import Dashboard from "./pages/Dashboard";
import Issues from "./pages/Issues";
import CreateIssue from "./pages/CreateIssue";
import IssueDetails from "./pages/IssueDetails";
import Profile from "./pages/Profile";
import StudentNotices from "./pages/StudentNotices";
import Certificates from "./pages/Certificates";
import Polls from "./pages/Polls";
import Fines from "./pages/Fines";
import Mess from "./pages/Mess";

// Warden
import WardenDashboard from "./pages/WardenDashboard";
import WardenNotices from "./pages/WardenNotices";
import WardenCertificates from "./pages/WardenCertificates";
import WardenFines from "./pages/WardenFines";
import WardenStudents from "./pages/WardenStudents";
import WardenRooms from "./pages/WardenRooms";

// Admin
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminUsers from "./pages/AdminUsers";
import AdminHalls from "./pages/AdminHalls";
import AdminRooms from "./pages/AdminRooms";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAudit from "./pages/AdminAudit";
import AdminIssues from "./pages/AdminIssues";

// Layout
import AppLayout from "./layouts/AppLayout";

// Protected Route
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Login */}

        <Route
          path="/"
          element={<Login />}
        />

        {/* ===================== STUDENT ===================== */}

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >

          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          <Route
            path="issues"
            element={<Issues />}
          />

          <Route
            path="create-issue"
            element={<CreateIssue />}
          />

          <Route
            path="issues/:id"
            element={<IssueDetails />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />

          <Route
            path="notices"
            element={<StudentNotices />}
          />

          <Route
            path="certificates"
            element={<Certificates />}
          />

          <Route
            path="polls"
            element={<Polls />}
          />

          <Route
            path="fines"
            element={<Fines />}
          />

          <Route
            path="mess"
            element={<Mess />}
          />

          <Route
            path="expenses"
            element={<Mess pageType="expenses" />}
          />

        </Route>

        {/* ===================== WARDEN ===================== */}

        <Route
          path="/warden"
          element={
            <ProtectedRoute allowedRoles={["warden"]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >

          <Route
            path="dashboard"
            element={<WardenDashboard />}
          />

          <Route
            path="issues"
            element={<WardenDashboard />}
          />

          <Route
            path="issues/:id"
            element={<IssueDetails />}
          />

          <Route
            path="notices"
            element={<WardenNotices />}
          />

          <Route
            path="students"
            element={<WardenStudents />}
          />

          <Route
            path="rooms"
            element={<WardenRooms />}
          />

          <Route
            path="expenses"
            element={<Mess pageType="expenses" />}
          />

          <Route
            path="polls"
            element={<Polls />}
          />

          <Route
            path="certificates"
            element={<WardenCertificates />}
          />

          <Route
            path="certificates/:id/review"
            element={<WardenCertificates />}
          />

          <Route
            path="fines"
            element={<WardenFines />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />

        </Route>

        {/* ===================== ADMIN ===================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >

          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="users"
            element={<AdminUsers />}
          />

          <Route
            path="issues"
            element={<AdminIssues />}
          />

          <Route
            path="issues/:id"
            element={<IssueDetails />}
          />

          <Route
            path="rooms"
            element={<AdminRooms />}
          />

          <Route
            path="halls"
            element={<AdminHalls />}
          />

          <Route
            path="analytics"
            element={<AdminAnalytics />}
          />

          <Route
            path="audit-logs"
            element={<AdminAudit />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />

        </Route>

        {/* ===================== MESS ===================== */}

        <Route
          path="/mess"
          element={
            <ProtectedRoute allowedRoles={["mess_manager"]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >

          <Route index element={<Navigate to="menu" replace />} />

          <Route
            path="dashboard"
            element={<Navigate to="/mess/menu" replace />}
          />

          <Route
            path="menu"
            element={<Mess pageType="menu" />}
          />

          <Route
            path="expenses"
            element={<Mess pageType="expenses" />}
          />

          <Route
            path="fines"
            element={<Fines />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;