import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";

const normalizeRole = (role) => (role || "").toUpperCase();
const requiredFields = [
  "rank",
  "firstName",
  "lastName",
  "username",
  "birthDate",
  "fullAddress",
  "email",
  "phone",
  "emergencyContactName",
  "emergencyContactPhone",
  "password",
  "confirmPassword",
];

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const navigate = useNavigate();
  const { user, onProfileUpdated } = useOutletContext();
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

    // const missingFields = requiredFields.filter((field) => !`${user[field] ?? ""}`.trim());
    
    // if (missingFields.length) {
    //   navigate("/addprofile")
    // }

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
