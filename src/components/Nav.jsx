import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2, LogOut, Menu, UserRoundPen, X } from "lucide-react";
import logo from "../assets/logo.png";
import navy from "../assets/navy.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";
const resolveAvatarUrl = (value = "") => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path}`;
};

const mapProfileToForm = (data = {}) => ({
  firstName: data.firstName || "",
  lastName: data.lastName || "",
  email: data.email || "",
  phone: data.phone || "",
  fullAddress: data.fullAddress || "",
  education: data.education || "",
  position: data.position || "",
  emergencyContactName: data.emergencyContactName || "",
  emergencyContactPhone: data.emergencyContactPhone || "",
  medicalHistory: data.medicalHistory || "",
  avatar: data.avatar || "",
});

const editableKeys = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "fullAddress",
  "education",
  "position",
  "emergencyContactName",
  "emergencyContactPhone",
  "medicalHistory",
];

const profileSections = [
  {
    title: "ข้อมูลพื้นฐาน",
    fields: [
      { name: "firstName", label: "ชื่อ", type: "text" },
      { name: "lastName", label: "นามสกุล", type: "text" },
      { name: "education", label: "การศึกษา", type: "text" },
      { name: "position", label: "ตำแหน่ง/หน้าที่", type: "text" },
    ],
  },
  {
    title: "ข้อมูลติดต่อ",
    fields: [
      { name: "email", label: "อีเมล", type: "email" },
      { name: "phone", label: "เบอร์โทรศัพท์", type: "text" },
      { name: "fullAddress", label: "ที่อยู่", type: "text" },
    ],
  },
  {
    title: "ผู้ติดต่อฉุกเฉิน",
    fields: [
      { name: "emergencyContactName", label: "ชื่อผู้ติดต่อฉุกเฉิน", type: "text" },
      { name: "emergencyContactPhone", label: "เบอร์ผู้ติดต่อฉุกเฉิน", type: "text" },
    ],
  },
];

const getErrorMessage = (error, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่") =>
  error?.response?.data?.message || error?.message || fallback;

export default function Nav({ user = { role: "guest" }, onProfileUpdated = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(() => mapProfileToForm(user));
  const [profileOriginal, setProfileOriginal] = useState(() => mapProfileToForm(user));
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const dropdownRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  const role = (user?.role || "guest").toString().toLowerCase();
  const isAuthenticated = role !== "guest";
  const avatarSrc = resolveAvatarUrl(profileForm?.avatar || user?.avatar) || navy;

  const pages = useMemo(
    () => [
      { path: "/home", label: "หน้าหลัก", roles: ["admin", "teacher", "student"] },
      { path: "/history", label: "ประวัติ", roles: ["admin", "teacher", "student"] },
      { path: "/manage", label: "จัดการผู้ใช้", roles: ["admin"] },
      { path: "/listteacher", label: "ประเมินผู้สอน", roles: ["admin", "teacher", "student"] },
    ],
    []
  );

  const visibleItems = isAuthenticated ? pages.filter((item) => item.roles.includes(role)) : [];

  useEffect(() => {
    setProfileForm(mapProfileToForm(user));
    setProfileOriginal(mapProfileToForm(user));
  }, [user]);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        profileMenuOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !avatarButtonRef.current?.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileMenuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    setProfileModalOpen(false);
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessData");
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login", { replace: true });
  };

  const openProfileModal = () => {
    setProfileForm(mapProfileToForm(user));
    setProfileOriginal(mapProfileToForm(user));
    setProfileModalOpen(true);
    setProfileMenuOpen(false);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setSavingProfile(false);
    setUploadingAvatar(false);
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async () => {
    if (!profileForm) return;
    const payload = {};
    editableKeys.forEach((key) => {
      if (profileOriginal[key] !== profileForm[key]) payload[key] = profileForm[key];
    });

    if (Object.keys(payload).length === 0) {
      Swal.fire({
        icon: "info",
        title: "ไม่มีการเปลี่ยนแปลง",
        text: "กรุณาแก้ไขข้อมูลก่อนบันทึก",
      });
      return;
    }

    setSavingProfile(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put("/api/me", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const updatedProfile = response.data?.data ?? response.data ?? payload;
      const mapped = mapProfileToForm({ ...profileForm, ...updatedProfile });
      setProfileForm(mapped);
      setProfileOriginal(mapped);
      onProfileUpdated(updatedProfile);
      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลสำเร็จ",
      });
      setProfileModalOpen(false);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: getErrorMessage(error),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await axios.post("/api/me/avatar", formData, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            }
          : { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = response.data?.data ?? {};
      const mapped = mapProfileToForm({ ...profileForm, ...updatedProfile });
      setProfileForm(mapped);
      setProfileOriginal(mapped);
      onProfileUpdated(updatedProfile);
      Swal.fire({
        icon: "success",
        title: "อัปโหลดรูปโปรไฟล์สำเร็จ",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถอัปโหลดรูปได้",
        text: getErrorMessage(error),
      });
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const profileDropdown = isAuthenticated ? (
    <div className="relative">
      <button
        ref={avatarButtonRef}
        onClick={() => setProfileMenuOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-gray-200 p-1 hover:bg-gray-50 transition"
      >
        <img src={avatarSrc} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
        <ChevronDownIcon open={profileMenuOpen} />
      </button>
      {profileMenuOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-3 w-60 rounded-2xl border border-gray-100 bg-white shadow-xl p-3 flex flex-col gap-1"
        >
          <div className="px-2 pb-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              {user.firstName || user.username || "ผู้ใช้"}
            </p>
            <p className="text-xs text-gray-500">{(user.role || "").toUpperCase()}</p>
          </div>
          <button
            onClick={openProfileModal}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition"
          >
            <UserRoundPen size={16} />
            แก้ไขข้อมูลส่วนตัว
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  ) : null;

  const renderNavLink = (item) => {
    const isActive = location.pathname.startsWith(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`text-sm font-medium transition-colors ${
          isActive ? "text-blue-800" : "text-gray-600 hover:text-blue-700"
        }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-white w-full shadow-md p-3 transition-all duration-300">
        <div className="mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="logo" className="w-12 h-12" />
            <p className="font-semibold text-gray-800 hover:text-blue-900 text-sm sm:text-base">
              ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ
            </p>
          </Link>

          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-5">
                {visibleItems.map(renderNavLink)}
                {profileDropdown}
              </div>
              <button
                className="block md:hidden rounded-lg border border-gray-200 p-2 text-gray-700"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="p-2 px-4 bg-blue-800 hover:bg-blue-700 rounded-xl font-bold text-white"
            >
              Login
            </Link>
          )}
        </div>

        {isAuthenticated && (
          <div
            className={`md:hidden flex flex-col items-center gap-3 bg-white border-gray-100 transition-all duration-500 overflow-hidden ${
              menuOpen ? "max-h-[520px] py-4 mt-3" : "max-h-0 py-0"
            }`}
          >
            {visibleItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className="capitalize text-gray-700 hover:text-blue-700 transition"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                openProfileModal();
                setMenuOpen(false);
              }}
              className="w-11/12 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
            >
              แก้ไขข้อมูลส่วนตัว
            </button>
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="w-11/12 px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700"
            >
              ออกจากระบบ
            </button>
          </div>
        )}
      </nav>

      {isAuthenticated && profileModalOpen && profileForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">แก้ไขข้อมูลส่วนตัว</p>
                <p className="text-sm text-gray-500">
                  ปรับปรุงข้อมูลประวัติและการติดต่อของคุณ เพื่อให้ระบบอัปเดตอยู่เสมอ
                </p>
              </div>
              <button
                onClick={closeProfileModal}
                className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/3 flex flex-col items-center gap-4 border border-gray-100 p-4 rounded-2xl">
                <img
                  src={avatarSrc}
                  alt="profile avatar"
                  className="w-28 h-28 rounded-full object-cover border border-gray-200"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-800 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <UserRoundPen size={16} />}
                  เปลี่ยนรูปโปรไฟล์
                </button>
                <p className="text-xs text-center text-gray-500 px-4">
                  รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5 MB
                </p>
              </div>

              <div className="lg:w-2/3 flex flex-col gap-6">
                {profileSections.map((section) => (
                  <div key={section.title} className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <p className="font-semibold text-gray-800 mb-3">{section.title}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {section.fields.map((field) => (
                        <label key={field.name} className="flex flex-col gap-1 text-sm text-gray-600">
                          {field.label}
                          <input
                            type={field.type}
                            name={field.name}
                            value={profileForm[field.name]}
                            onChange={handleProfileChange}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <label className="flex flex-col gap-1 text-sm text-gray-600">
                    ประวัติทางการแพทย์ / หมายเหตุเพิ่มเติม
                    <textarea
                      name="medicalHistory"
                      value={profileForm.medicalHistory}
                      onChange={handleProfileChange}
                      rows={3}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                    />
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={closeProfileModal}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleProfileSave}
                    disabled={savingProfile}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-800 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {savingProfile && <Loader2 size={18} className="animate-spin" />}
                    บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
