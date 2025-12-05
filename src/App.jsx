import { createBrowserRouter, RouterProvider, redirect } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
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
import FormEvaluate from "./pages/FormEvaluate";
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
import Exam from "./pages/Exam";
import CreateTasks from "./pages/CreateTasks";
import SoldierIntakeSettings from "./pages/SoldierIntakeSettings";
import TaskSubmission from "./pages/TaskSubmission";
import ErrorPage from "./pages/ErrorPage";

const COMPANY_ROLES = [
  "BAT1_COM1", "BAT1_COM2", "BAT1_COM3", "BAT1_COM4", "BAT1_COM5",
  "BAT2_COM1", "BAT2_COM2", "BAT2_COM3", "BAT2_COM4", "BAT2_COM5",
  "BAT3_COM1", "BAT3_COM2", "BAT3_COM3", "BAT3_COM4", "BAT3_COM5",
  "BAT4_COM1", "BAT4_COM2", "BAT4_COM3", "BAT4_COM4", "BAT4_COM5",
];

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

function SoldierProfileAccess({ children }) {
    const [statusAllowed, setStatusAllowed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const role = getStoredRole();
    const isPrivileged = ["ADMIN", "OWNER"].includes(role);

    useEffect(() => {
        const fetchStatus = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await axios.get("/api/public/soldier-intake/status");
                const data = res.data?.status ?? res.data ?? {};
                const enabled = typeof data === "boolean" ? data : Boolean(data.enabled ?? data.open ?? false);
                setStatusAllowed(enabled || isPrivileged);
            } catch (err) {
                setError(err?.response?.data?.message || err?.message || "ไม่สามารถตรวจสอบสถานะการรับสมัครได้");
                setStatusAllowed(isPrivileged);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, [isPrivileged]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-600">
                กำลังตรวจสอบสถานะการรับสมัคร...
            </div>
        );
    }

    if (!statusAllowed) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 text-center space-y-3 max-w-md">
                    <h2 className="text-lg font-bold text-gray-900">ปิดรับลงทะเบียนทหารใหม่</h2>
                    <p className="text-sm text-gray-600">
                        ขณะนี้ระบบลงทะเบียนทหารใหม่ถูกปิด หากต้องการเปิดใช้งาน โปรดให้ผู้ดูแลระบบดำเนินการ
                    </p>
                </div>
            </div>
        );
    }

    return children;
}

const router = createBrowserRouter([
    { path: "", loader: () => redirect('home') },
    {
        path: "",
        element: <LayoutMain />,
        errorElement: <ErrorPage />,
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
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN", "SCHEDULE_ADMIN", "FORM_CREATOR", "EXAM_UPLOADER"]}>
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
                path: "exam",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", "SUB_ADMIN", "TEACHER", "EXAM_UPLOADER"]}>
                        <Exam />
                    </ProtectedRoute>
                )
            },
            {
                path: "soldier-intake-settings",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER"]}>
                        <SoldierIntakeSettings />
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
                path: "form-evaluate",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN", "FORM_CREATOR"]}>
                        <FormEvaluate />
                    </ProtectedRoute>
                )
            },
            {
                path: "teaching-schedules",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", "SCHEDULE_ADMIN"]}>
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
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", ...COMPANY_ROLES]}>
                        <SoldierDashboard />
                    </ProtectedRoute>
                )
            },
            {
                path: "message",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "STUDENT", "OWNER", "SUB_ADMIN", "SCHEDULE_ADMIN", "FORM_CREATOR", "EXAM_UPLOADER"]}>
                        <Message />
                    </ProtectedRoute>
                )
            },
            {
                path: "createtask",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER"]}>
                        <CreateTasks />
                    </ProtectedRoute>
                )
            },
            {
                path: "task-submit",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "OWNER", "SUB_ADMIN", "TEACHER", "SCHEDULE_ADMIN"]}>
                        <TaskSubmission />
                    </ProtectedRoute>
                )
            }
        ]
    },
    {
        path: "",
        element: <SoldierProfileLayoutSwitcher />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "soilderprofile",
                element: (
                    <SoldierProfileAccess>
                        <SoilderProfile />
                    </SoldierProfileAccess>
                ),
            },
        ]
    },
    {
        path: "*",
        element: <ErrorPage />
    }
]);

export default function App() {
    return <RouterProvider router={router} />;
}
