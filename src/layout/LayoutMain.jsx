import { Outlet } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import bg from "../assets/bg-sea.jpg";
import Nav from "../components/Nav";

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

export default function LayoutMain() {
  const [user, setUser] = useState(() => normalizeUser(getStoredUser()));

  const handleProfileUpdated = useCallback((updated) => {
    setUser((prev) => {
      const merged = normalizeUser({ ...prev, ...updated });
      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
    window.dispatchEvent(new Event("auth-change"));
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

  useEffect(() => {
    fetchProfile();

    const syncUser = () => {
      setUser(normalizeUser(getStoredUser()));
      fetchProfile();
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-change", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-change", syncUser);
    };
  }, [fetchProfile]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <img src={bg} className="absolute inset-0 w-full h-full object-cover -z-10" />
      <Nav user={user} onProfileUpdated={handleProfileUpdated} />
      {/* ส่วนเนื้อหา */}
      <div className="flex flex-col flex-grow items-center p-2 px-5 mb-5">
        <Outlet />
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
