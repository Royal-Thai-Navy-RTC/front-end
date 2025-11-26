import { createBrowserRouter, RouterProvider, redirect } from "react-router-dom";
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
import EvaluateStudent from "./pages/EvaluateStudent";
import ListStudent from "./pages/ListStudent";
import FormEvaluateStudent from "./pages/FormEvaluateStudent";
import SoilderProfile from "./pages/SoldierProfile";
import LayoutSoilder from "./layout/LayoutSoilder";
import TeachingSchedules from "./pages/TeachingSchedules";
import EvaluationDashboard from "./pages/EvaluationDashboard";
import PublicTeachingSchedules from "./pages/PublicTeachingSchedules";
import Library from "./pages/Library";
import ManageSoldier from "./pages/ManageSoldier";
import Message from "./pages/Message";

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
                path: "evaluatestudent",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <EvaluateStudent />
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
                path: "liststudent",
                element: (
                    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "OWNER", "SUB_ADMIN"]}>
                        <ListStudent />
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
        path: "", element: <LayoutSoilder />, children: [
            { path: "soilderprofile", element: <SoilderProfile /> },
        ]
    }
]);

export default function App() {
    return <RouterProvider router={router} />;
}
