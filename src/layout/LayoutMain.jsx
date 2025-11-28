import { Outlet, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import bg from "../assets/bg-sea.jpg";
import Nav from "../components/Nav/Nav";

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

const rankOptions = [
  { value: "พลเรือเอก", label: "พลเรือเอก" },
  { value: "พลเรือเอกหญิง", label: "พลเรือเอกหญิง" },
  { value: "พลเรือโท", label: "พลเรือโท" },
  { value: "พลเรือโทหญิง", label: "พลเรือโทหญิง" },
  { value: "พลเรือตรี", label: "พลเรือตรี" },
  { value: "พลเรือตรีหญิง", label: "พลเรือตรีหญิง" },
  { value: "นาวาเอก", label: "นาวาเอก" },
  { value: "นาวาเอกหญิง", label: "นาวาเอกหญิง" },
  { value: "นาวาโท", label: "นาวาโท" },
  { value: "นาวาโทหญิง", label: "นาวาโทหญิง" },
  { value: "นาวาตรี", label: "นาวาตรี" },
  { value: "นาวาตรีหญิง", label: "นาวาตรีหญิง" },
  { value: "เรือเอก", label: "เรือเอก" },
  { value: "เรือเอกหญิง", label: "เรือเอกหญิง" },
  { value: "เรือโท", label: "เรือโท" },
  { value: "เรือโทหญิง", label: "เรือโทหญิง" },
  { value: "เรือตรี", label: "เรือตรี" },
  { value: "เรือตรีหญิง", label: "เรือตรีหญิง" },
  { value: "พันจ่าเอก", label: "พันจ่าเอก" },
  { value: "พันจ่าเอกหญิง", label: "พันจ่าเอกหญิง" },
  { value: "พันจ่าโท", label: "พันจ่าโท" },
  { value: "พันจ่าโทหญิง", label: "พันจ่าโทหญิง" },
  { value: "พันจ่าตรี", label: "พันจ่าตรี" },
  { value: "พันจ่าตรีหญิง", label: "พันจ่าตรีหญิง" },
  { value: "จ่าเอก", label: "จ่าเอก" },
  { value: "จ่าเอกหญิง", label: "จ่าเอกหญิง" },
  { value: "จ่าโท", label: "จ่าโท" },
  { value: "จ่าโทหญิง", label: "จ่าโทหญิง" },
  { value: "จ่าตรี", label: "จ่าตรี" },
  { value: "จ่าตรีหญิง", label: "จ่าตรีหญิง" },
  { value: "พลฯ", label: "พลฯ" },
];

const divisionOptions = [
  { value: "การเรือ", label: "การเรือ (ทร.101)" },
  { value: "การอาวุธ", label: "การอาวุธ (ทร.102)" },
  { value: "การป้องกันความเสียหาย", label: "การป้องกันความเสียหาย (ทร.103)" },
  { value: "ระเบียบข้อบังคับ", label: "ระเบียบข้อบังคับ (ทร.201)" },
  { value: "ทหารราบ", label: "ทหารราบ (ทร.202)" },
  { value: "พลศึกษา", label: "พลศึกษา (ทร.301)" },
  { value: "ทดสอบสมรรถภาพ", label: "ทดสอบสมรรถภาพ (ทร.301)" },
  { value: "สังคมและมนุษยศาสตร์", label: "สังคมและมนุษยศาสตร์ (ทร.401)" },
  { value: "การพัฒนาสัมพันธ์", label: "การพัฒนาสัมพันธ์ (ทร.402)" },
];

const religionOptions = [
  { value: "พุทธ", label: "ศาสนาพุทธ" },
  { value: "อิสลาม", label: "ศาสนาอิสลาม" },
  { value: "คริสต์", label: "ศาสนาคริสต์" },
];

const educationOptions = [
  { value: "ปริญญาเอก", label: "ปริญญาเอก" },
  { value: "ปริญญาโท", label: "ปริญญาโท" },
  { value: "ปริญญาตรี", label: "ปริญญาตรี" },
  { value: "ปวช.", label: "ปวช." },
  { value: "ปวส.", label: "ปวส." },
  { value: "มัธยมศึกษาปีที่ 6", label: "มัธยมศึกษาปีที่ 6" },
  { value: "มัธยมศึกษาปีที่ 3", label: "มัธยมศึกษาปีที่ 3" },
  { value: "ประถมศึกษาปีที่ 6", label: "ประถมศึกษาปีที่ 6" },
  { value: "ต่ำกว่าประถมศึกษาปีที่ 6", label: "ต่ำกว่าประถมศึกษาปีที่ 6" },
];

const bloodOptions = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "AB", label: "AB" },
  { value: "O", label: "O" },
  { value: "ไม่ทราบ", label: "ไม่ทราบ" },
];

const relationOptions = [
  { value: "พ่อ", label: "พ่อ" },
  { value: "แม่", label: "แม่" },
  { value: "พี่น้อง", label: "พี่น้อง" },
  { value: "ภรรยา", label: "ภรรยา" },
  { value: "ปู่", label: "ปู่" },
  { value: "ยาย", label: "ยาย" },
  { value: "อื่นๆ", label: "อื่นๆ" },
];

export default function LayoutMain() {
  const navigate = useNavigate();
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

  const fetchToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      setUser({ role: "guest" });
      return;
    }
    try {
      const response = await axios.post("/api/refresh-token", { refreshToken: refreshToken });
      const data = response.data;
      const role = data?.user?.role;
      // console.log(role);

      localStorage.setItem("role", role);
      localStorage.setItem("token", data?.accessToken);
      localStorage.setItem("refreshToken", data?.refreshToken);
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        setUser({ role: "guest" });
        window.dispatchEvent(new Event("auth-change"));
        navigate("/login");
      }
    }
  };

  const fetchMessage = async () => {
    const token = localStorage.getItem("token");
    const apiPath = `${user.role === "OWNER" ? "owner" : "teacher"}/notifications?page=1&pageSize=10`;

    try {
      const response = await axios.get(`/api/${apiPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // console.log(response.data);

    } catch (error) {
      // console.log(error);
    }
  };

  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   if (user.role === "ADMIN" || !token) return;

  //   const interval = setInterval(() => {
  //     fetchMessage();
  //   }, 10000);

  //   return () => clearInterval(interval);
  // }, [user.role]);

  // update Role and token
  useEffect(() => {
    fetchToken();
  }, []);

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
      <Nav user={user} divisionOptions={divisionOptions} rankOptions={rankOptions} religionOptions={religionOptions} onProfileUpdated={handleProfileUpdated} />
      {/* ส่วนเนื้อหา */}
      <div className="flex flex-col flex-grow items-center p-2 px-5 mb-5">
        {/* <Outlet /> */}
        <Outlet context={{ user, onProfileUpdated: handleProfileUpdated, rankOptions, divisionOptions, religionOptions, educationOptions, bloodOptions, relationOptions }} />
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
