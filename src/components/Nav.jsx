import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react"; // icon จาก lucide-react (ติดตั้งได้ด้วย npm install lucide-react)
import logo from "../assets/logo.png";

export default function Nav({ user = { role: "guest" } }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = (user?.role || "guest").toString().toLowerCase();
  const isAuthenticated = role !== "guest";

  const pages = [
    { path: "/home", label: "หน้าหลัก", roles: ["admin", "teacher", "student"] },
    { path: "/history", label: "ประวัติ", roles: ["admin", "teacher", "student"] },
    { path: "/manage", label: "จัดการผู้ใช้", roles: ["admin"] },
    { path: "/listteacher", label: "ประเมินผู้สอน", roles: ["admin", "teacher", "student"] },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessData");
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login", { replace: true });
  };

  const visibleItems = isAuthenticated
    ? pages.filter(item => item.roles.includes(role))
    : [];

  return (
    <nav className="bg-white w-full shadow-md p-3 transition-all duration-300">
      <div className="mx-auto flex justify-between items-center">
        {/* โลโก้ */}
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="logo" className="w-12 h-12" />
          <p className="font-semibold text-gray-800 hover:text-blue-900 text-sm sm:text-base">
            ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ
          </p>
        </Link>

        {/* ปุ่มเมนู (มือถือ) */}
        {isAuthenticated && (
          <button className="block md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        )}

        {/* เมนูหลัก (desktop) */}
        {isAuthenticated ? (
          <ul className="hidden md:flex gap-5 items-center">
            {visibleItems.map(item => (
              <li key={item.path}>
                <Link to={item.path} className="capitalize hover:text-blue-700 transition-colors" >
                  {item.label}
                </Link>
              </li>
            ))}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              ออกจากระบบ
            </button>
          </ul>
        ) : (
          <Link
            to="/login"
            className="hidden md:inline-block p-2 px-4 bg-blue-800 hover:bg-blue-700 rounded-xl font-bold text-white"
          >
            Login
          </Link>
        )}
      </div>

      {/* เมนูมือถือ (dropdown) */}
      {isAuthenticated ? (
        <div
          className={`md:hidden flex flex-col items-center gap-3 bg-white border-gray-200 transition-all duration-500 overflow-hidden ${menuOpen ? "max-h-[500px] py-3 mt-3" : "max-h-0 py-0"}`}
        >
          {visibleItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)} className="capitalize hover:text-blue-700 transition-colors" >
              {item.label}
            </Link>
          ))}

          <button
            onClick={() => {
              handleLogout();
              setMenuOpen(false);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      ) : (
        <div className="md:hidden flex justify-center mt-3">
          <Link to="/login" className="p-2 px-4 bg-blue-800 hover:bg-blue-700 rounded-xl font-bold text-white">
            Login
          </Link>
        </div>
      )}
    </nav>

  );
}
