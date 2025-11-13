import { createBrowserRouter, RouterProvider, redirect } from "react-router-dom";
import './index.css';
import LayoutMain from './layout/LayoutMain';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import History from './pages/History';
import EvaluateTeachers from './pages/EvaluateTeachers'
import Swal from 'sweetalert2';
import Listteacher from "./pages/Listteacher";
import ManageUsers from "./pages/ManageUsers";

const verify = async () => {
    try {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        const accessData = localStorage.getItem("accessData") || "{}";
        const { department } = JSON.parse(accessData);

        if (!token || !role) throw new Error("Please login first");
        return null;
    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Error",
            timer: 2000,
            text: error.message
        });
        return redirect('/login');
    }
};

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
            { path: "listteacher", element: <Listteacher /> },
            { path: "evaluateteachers", element: <EvaluateTeachers /> },
            { path: "manage", element: <ManageUsers /> },
        ]
    }
]);

export default function App() {
    return <RouterProvider router={router} />;
}
