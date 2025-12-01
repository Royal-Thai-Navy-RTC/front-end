import { createBrowserRouter, RouterProvider, redirect } from "react-router-dom";
import { useEffect, useState } from "react";
import './index.css';
import LayoutMain from './layout/LayoutMain';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import History from './pages/History';
import EvaluateTeachers from './pages/EvaluateTeachers'
import Listteacher from "./pages/Listteacher";
import ManageUsers from "./pages/ManageUsers";
import UserDetail from "./pages/UserDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import TeacherRollCall from "./pages/TeacherRollCall";
import TeacherLeave from "./pages/TeacherLeave";
import Evaluate from "./pages/Evaluate";
import ListEvaluate from "./pages/ListEvaluate";
import FormEvaluateStudent from "./pages/FormEvaluateStudent";
import SoilderProfile from "./pages/SoldierProfile";
import LayoutSoilder from "./layout/LayoutSoilder";
import TeachingSchedules from "./pages/TeachingSchedules";
import EvaluationDashboard from "./pages/EvaluationDashboard";
import PublicTeachingSchedules from "./pages/PublicTeachingSchedules";
import Library from "./pages/Library";
import ManageSoldier from "./pages/ManageSoldier";
import Message from "./pages/Message";
import SoldierDashboard from "./pages/SoldierDashboard";
import ServiceEvaluationSummary from "./pages/ServiceEvaluationSummary";

const normalizeRole = (role = "") => role.toUpperCase();

const getStoredRole = () => {
    try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const roleFromUser = normalizeRole(storedUser.role || "");
        if (roleFromUser) return roleFromUser;
    } catch {
        // ignore parsing errors
    }
    return normalizeRole(localStorage.getItem("role") || "guest");
};

function SoldierProfileLayoutSwitcher() {
    const [role, setRole] = useState(getStoredRole);

    useEffect(() => {
        const syncRole = () => setRole(getStoredRole());
        window.addEventListener("storage", syncRole);
        window.addEventListener("auth-change", syncRole);
        return () => {
            window.removeEventListener("storage", syncRole);
            window.removeEventListener("auth-change", syncRole);
        };
    }, []);

    const isAdminOrOwner = ["ADMIN", "OWNER"].includes(role);
    return isAdminOrOwner ? <LayoutMain /> : <LayoutSoilder />;
}

const router = createBrowserRouter([
    { path: "", loader: () => redirect('home') },
    {
        path: "",
        element: <LayoutMain />,
        children: [
            { path: "login", element: <Login /> },
            { path: "register", element: <Register /> },
            { path: "home", element: <Home /> },
            { path: "history", element: <History /> },
            { path: "library", element: <Library /> },
            { path: "public-teaching-schedules", element: <PublicTeachingSchedules /> },
            {
                path: "listteacher",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "STUDENT", "OWNER", "SUB_ADMIN"]}>
                        <Listteacher />
                    </ProtectedRoute>
                )
            },
            {
                path: "evaluateteachers",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "STUDENT", "OWNER", "SUB_ADMIN"]}>
                        <EvaluateTeachers />
                    </ProtectedRoute>
                )
            },
            {
                path: "manage",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", "SUB_ADMIN"]}>
                        <ManageUsers />
                    </ProtectedRoute>
                )
            },
            {
                path: "teacher-report",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <TeacherRollCall />
                    </ProtectedRoute>
                )
            },
            {
                path: "teacher-leave",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <TeacherLeave />
                    </ProtectedRoute>
                )
            },
            {
                path: "users/:id",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", "SUB_ADMIN"]}>
                        <UserDetail />
                    </ProtectedRoute>
                )
            },
            {
                path: "evaluate",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <Evaluate />
                    </ProtectedRoute>
                )
            },
            {
                path: "evaluation-dashboard",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", "SUB_ADMIN", "TEACHER"]}>
                        <EvaluationDashboard />
                    </ProtectedRoute>
                )
            },
            {
                path: "service-evaluation-summary",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", "SUB_ADMIN", "TEACHER"]}>
                        <ServiceEvaluationSummary />
                    </ProtectedRoute>
                )
            },
            {
                path: "listevaluation",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <ListEvaluate />
                    </ProtectedRoute>
                )
            },
            {
                path: "form-evaluate-student",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <FormEvaluateStudent />
                    </ProtectedRoute>
                )
            },
            {
                path: "teaching-schedules",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER"]}>
                        <TeachingSchedules />
                    </ProtectedRoute>)
            },
            {
                path: "managesailor",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <ManageSoldier />
                    </ProtectedRoute>
                )
            },
            {
                path: "soldiers",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER"]}>
                        <SoldierDashboard />
                    </ProtectedRoute>
                )
            },
            {
                path: "message",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "STUDENT", "OWNER", "SUB_ADMIN"]}>
                        <Message />
                    </ProtectedRoute>
                )
            }
        ]
    },
    {
        path: "", element: <SoldierProfileLayoutSwitcher />, children: [
            { path: "soilderprofile", element: <SoilderProfile /> },
        ]
    }
]);

export default function App() {
    return <RouterProvider router={router} />;
}
