import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2, LogOut, Menu, UserRoundPen, X } from "lucide-react";
import logo from "../../assets/logo.png";
import navy from "../../assets/navy.png";
import ProfileModal from "./ProfileModal";
import { mapProfileToForm, editableKeys } from "./profileUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const resolveAvatarUrl = (value = "") => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path}?v=${Date.now()}`;
};

const PASSWORD_FORM_DEFAULT = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const getErrorMessage = (error, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่") =>
  error?.response?.data?.message || error?.message || fallback;

export default function Nav({ user = { role: "guest" }, onProfileUpdated = () => { }, rankOptions, divisionOptions }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [profileForm, setProfileForm] = useState(() => mapProfileToForm(user));
  const [profileOriginal, setProfileOriginal] = useState(() => mapProfileToForm(user));

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordForm, setPasswordForm] = useState(PASSWORD_FORM_DEFAULT);
  const [changingPassword, setChangingPassword] = useState(false);

  const dropdownRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  const profileSections = [
    {
      title: "ข้อมูลพื้นฐาน",
      fields: [
        { name: "rank", label: "ยศ", type: "select", option: rankOptions },
        { name: "firstName", label: "ชื่อ", type: "text" },
        { name: "lastName", label: "นามสกุล", type: "text" },
        { name: "username", label: "ชื่อผู้ใช้งาน", type: "text" },
        { name: "birthDate", label: "วันเกิด", type: "date" },
        { name: "education", label: "การศึกษา", type: "text" },
        { name: "fullAddress", label: "ที่อยู่", type: "textarea" },
      ],
    },

    {
      title: "ข้อมูลการติดต่อ",
      fields: [
        { name: "email", label: "อีเมล", type: "email" },
        { name: "phone", label: "เบอร์โทรศัพท์", type: "text" },
      ],
    },

    {
      title: "ผู้ติดต่อฉุกเฉิน",
      fields: [
        { name: "emergencyContactName", label: "ชื่อผู้ติดต่อฉุกเฉิน", type: "text" },
        { name: "emergencyContactPhone", label: "เบอร์ผู้ติดต่อฉุกเฉิน", type: "text" },
      ],
    },
    {
      title: "ข้อมูลเพิ่มเติม",
      fields: [
        { name: "position", label: "ตำแหน่ง/หน้าที่", type: "text" },
        { name: "division", label: "หมวดวิชา", type: "select", option: divisionOptions },
        { name: "medicalhistory", label: "ประวัติทางการแพทย์", type: "textarea" },
        { name: "notes", label: "หมายเหตุเพิ่มเติม", type: "textarea" },
      ],
    },
  ];

  const role = (user?.role || "guest").toLowerCase();
  const isAuthenticated = role !== "guest";

  const avatarSrc =
    resolveAvatarUrl(profileForm?.avatar || user?.avatar) || navy;

  const pages = useMemo(
    () => [
      { path: "/home", label: "หน้าหลัก", roles: ["admin", "teacher", "student"] },
      { path: "/history", label: "ประวัติ", roles: ["admin", "teacher", "student"] },
      { path: "/manage", label: "จัดการผู้ใช้", roles: ["admin"] },
      { path: "/teacher-report", label: "ส่งยอดนักเรียน", roles: ["teacher"] },
      { path: "/teacher-leave", label: "แจ้งการลา", roles: ["teacher"] },
      { path: "/listteacher", label: "ประเมินผู้สอน", roles: ["admin", "teacher", "student"] },
      { path: "/evaluatestudent", label: "ประเมินนักเรียน", roles: ["admin", "teacher"] },
    ],
    []
  );

  const visibleItems = useMemo(() => {
    if (!isAuthenticated) return [];
    if (role === "admin") return pages;
    return pages.filter((item) => item.roles.includes(role));
  }, [isAuthenticated, role, pages]);

  // เมื่อ user เปลี่ยน
  useEffect(() => {
    setProfileForm(mapProfileToForm(user));
    setProfileOriginal(mapProfileToForm(user));
  }, [user]);

  // click outside dropdown
  useEffect(() => {
    const handleClick = (e) => {
      if (
        profileMenuOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !avatarButtonRef.current?.contains(e.target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileMenuOpen]);

  // close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // logout
  const handleLogout = () => {
    setProfileMenuOpen(false);
    setProfileModalOpen(false);
    localStorage.clear();
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login", { replace: true });
  };

  // open modal
  const openProfileModal = () => {
    setProfileForm(mapProfileToForm(user));
    setProfileOriginal(mapProfileToForm(user));
    setPasswordForm(PASSWORD_FORM_DEFAULT);
    setProfileModalOpen(true);
    setProfileMenuOpen(false);
  };

  const renderNavLink = (item) => {
    const isActive = location.pathname.startsWith(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`text-sm font-medium transition-colors ${isActive ? "text-blue-800" : "text-gray-600 hover:text-blue-700"
          }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* NAVIGATION BAR */}
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
              {/* DESKTOP LINKS */}
              <div className="hidden md:flex items-center gap-5">
                {visibleItems.map(renderNavLink)}

                {/* PROFILE DROPDOWN */}
                <div className="relative">
                  <button
                    ref={avatarButtonRef}
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 p-1 hover:bg-gray-50 transition"
                  >
                    <img src={avatarSrc} className="w-9 h-9 rounded-full object-cover" />
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
                        <p className="text-xs text-gray-500">
                          {(user.role || "").toUpperCase()}
                        </p>
                      </div>

                      <button
                        onClick={openProfileModal}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-gray-50"
                      >
                        <UserRoundPen size={16} />
                        แก้ไขข้อมูลส่วนตัว
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={16} />
                        ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* MOBILE MENU BUTTON */}
              <button
                className="md:hidden rounded-lg border border-gray-200 p-2 text-gray-700"
                onClick={() => setMenuOpen((prev) => !prev)}
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

        {/* MOBILE NAV LINKS */}
        {isAuthenticated && (
          <div
            className={`md:hidden flex flex-col items-center gap-3 bg-white border-gray-100 transition-all duration-500 overflow-hidden ${menuOpen ? "max-h-[520px] py-4 mt-3" : "max-h-0 py-0"
              }`}
          >
            {visibleItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 hover:text-blue-700 transition"
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

      {profileModalOpen && (
        <ProfileModal
          user={user}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileOriginal={profileOriginal}
          setProfileOriginal={setProfileOriginal}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          uploadingAvatar={uploadingAvatar}
          setUploadingAvatar={setUploadingAvatar}
          savingProfile={savingProfile}
          setSavingProfile={setSavingProfile}
          changingPassword={changingPassword}
          setChangingPassword={setChangingPassword}
          profileSections={profileSections}
          onProfileUpdated={onProfileUpdated}
          closeModal={() => setProfileModalOpen(false)}
          rankOptions={rankOptions}
          divisionOptions={divisionOptions}
        />
      )}
    </>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""
        }`}
      viewBox="0 0 20 20"
      fill="none"
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
