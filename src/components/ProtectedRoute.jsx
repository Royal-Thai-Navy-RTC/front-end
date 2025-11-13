import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const normalizeRole = (role) => (role || "").toUpperCase();

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = normalizeRole(localStorage.getItem("role"));

    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเข้าสู่ระบบ",
        timer: 2000,
        showConfirmButton: false,
      });
      navigate("/login", { replace: true });
      return;
    }

    if (allowedRoles.length && !allowedRoles.includes(role)) {
      Swal.fire({
        icon: "error",
        title: "ไม่มีสิทธิ์เข้าถึง",
        timer: 2000,
        showConfirmButton: false,
      });
      navigate("/home", { replace: true });
      return;
    }

    setIsAuthorized(true);
  }, [allowedRoles, navigate]);

  if (!isAuthorized) return null;

  return children;
}
