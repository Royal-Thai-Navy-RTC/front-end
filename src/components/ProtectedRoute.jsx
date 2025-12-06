// ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Swal from "sweetalert2";

const normalizeRole = (role) => (role || "").toUpperCase();

const requiredFields = [
  "rank",
  "firstName",
  "lastName",
  "username",
  "birthDate",
  "email",
  "phone",
  "emergencyContactName",
  "emergencyContactPhone",
  "position",
  "education",
];

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  bypassMissingFieldsRoles = [], // 👈 เพิ่มตรงนี้
}) {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const roleFromStorage = normalizeRole(localStorage.getItem("role"));
    const userRole = normalizeRole(user?.role);

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

    // ----------------- เช็ก profile ไม่ครบ -----------------
    const missingFields = requiredFields.filter(
      (field) => !`${user?.[field] ?? ""}`.trim()
    );

    const bypassRolesNormalized = bypassMissingFieldsRoles.map(normalizeRole);

    const canBypassMissingFields =
      ["ADMIN", "OWNER"].includes(userRole) || // แอดมิน/โอวเนอร์ ข้ามเหมือนเดิม
      bypassRolesNormalized.includes(userRole); // 👈 ROLE ที่กำหนดให้ข้าม

    if (missingFields.length && !canBypassMissingFields) {
      const listHtml = missingFields.join(", ");
      Swal.fire({
        icon: "warning",
        title: "ข้อมูลยังไม่ครบ",
        html: `กรุณากรอกข้อมูลต่อไปนี้ก่อนเข้าใช้งาน: ${listHtml}`,
        timer: 3000,
        showConfirmButton: false,
      });

      navigate("/home", { replace: true });
      return;
    }

    // ----------------- เช็กสิทธิ์เข้า route -----------------
    const allowedNormalized = allowedRoles.map(normalizeRole);

    if (
      allowedNormalized.length &&
      !allowedNormalized.includes(roleFromStorage)
    ) {
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
  }, [allowedRoles, bypassMissingFieldsRoles, navigate, user]);

  if (!isAuthorized) return null;
  return children;
}
