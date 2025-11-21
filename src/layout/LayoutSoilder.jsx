import { Outlet } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import bg from "../assets/bg-sea.jpg";
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || { role: "guest" };
  } catch {
    return { role: "guest" };
  }
};

const normalizeUser = (data = {}) => {
  if (!data || typeof data !== "object") return { role: "guest" };
  return { role: (data.role || "guest").toUpperCase(), ...data };
};

const educationOptions = [
  { value: "ปริญญาตรี", label: "ปริญญาตรี" },
  { value: "ประถม 6", label: "ประถม 6" },
  { value: "มัธยมศึกษาปีที่ 3", label: "มัธยมศึกษาปีที่ 3" },
  { value: "มัธยมศึกษาปีที่ 6", label: "มัธยมศึกษาปีที่ 6" },
  { value: "ปวช.", label: "ปวช." },
  { value: "ปวส.", label: "ปวส." },
];

const religionOptions = [
  { value: "พุทธ", label: "ศาสนาพุทธ" },
  { value: "อิสลาม", label: "ศาสนาอิสลาม" },
  { value: "คริสต์", label: "ศาสนาคริสต์" },
];

export default function LayoutSoilder() {
  const [user, setUser] = useState(() => normalizeUser(getStoredUser()));

  const handleProfileUpdated = useCallback((updated, options = {}) => {
    const { emitEvent = false } = options;
    setUser((prev) => {
      const merged = normalizeUser({ ...prev, ...updated });
      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
    if (emitEvent) {
      window.dispatchEvent(new Event("auth-change"));
    }

  }, []);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser({ role: "guest" });
      return;
    }
    try {
      const response = await axios.get("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = response.data?.data ?? response.data;

      if (profile) {
        handleProfileUpdated(profile);
      }
    } catch {
      // ignore fetch errors silently
    }
  }, [handleProfileUpdated]);


  return (
    <div className="relative min-h-screen flex flex-col">
      <img src={bg} className="absolute inset-0 w-full h-full object-cover -z-10" />
      <Nav />

      {/* ส่วนเนื้อหา */}
      <div className="flex flex-col flex-grow items-center p-2 px-5 mb-5">
        {/* <Outlet /> */}
        <Outlet  context={{ educationOptions, religionOptions }} />
      </div>

      {/* Footer */}
      <div className="flex justify-center items-center bg-blue-900 bg-opacity-75 text-white font-bold">
        <p className="p-1 text-sm text-center h-full">
          © 2025 ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ
        </p>
      </div>
    </div>
  );
}

const Nav = () => {
  return (
    <nav className="bg-white w-full shadow-md p-3 transition-all duration-300">
      <div className="mx-auto flex justify-between items-center">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <img src={logo} className="w-12 h-12" />
          <p className="font-semibold text-gray-800">ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ</p>
        </div>
      </div>
    </nav>
  )
}
