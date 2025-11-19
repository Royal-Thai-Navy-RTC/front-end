/* --- IMPORTS --- */
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

/* --- UTILITIES --- */
const resolveAvatarUrl = (value = "") => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path}`;
};

const PASSWORD_FORM_DEFAULT = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};


const getErrorMessage = (error, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่") => error?.response?.data?.message || error?.message || fallback;

/* --- MAIN COMPONENT --- */
export default function Nav({ user = { role: "guest" }, onProfileUpdated = () => { }, rankOptions, divisionOptions }) {
  const profileSections = [
    {
      title: "ข้อมูลพื้นฐาน", fields: [
        { name: "rank", label: "ยศ", type: "select", option: rankOptions },
        { name: "firstName", label: "ชื่อ", type: "text" }, { name: "lastName", label: "นามสกุล", type: "text" },
        { name: "username", label: "ชื่อผู้ใช้งาน", type: "text" },
        { name: "birthDate", label: "วันเกิด", type: "date" },
        { name: "education", label: "การศึกษา", type: "text" },
        { name: "fullAddress", label: "ที่อยู่", type: "textarea" },
      ],
    },
    {
      title: "ข้อมูลการติดต่อ", fields: [
        { name: "email", label: "อีเมล", type: "email" },
        { name: "phone", label: "เบอร์โทรศัพท์", type: "text" },
      ],
    },
    {
      title: "ผู้ติดต่อฉุกเฉิน", fields: [
        { name: "emergencyContactName", label: "ชื่อผู้ติดต่อฉุกเฉิน", type: "text" },
        { name: "emergencyContactPhone", label: "เบอร์ผู้ติดต่อฉุกเฉิน", type: "text" },
      ],
    },
    {
      title: "ข้อมูลเพิ่มเติม", fields: [
        { name: "position", label: "ตำแหน่ง/หน้าที่", type: "text" },
        { name: "division", label: "หมวดวิชา", type: "select", option: divisionOptions },
        { name: "medicalHistory", label: "ประวัติทางการแพทย์", type: "textarea" },
        { name: "notes", label: "หมายเหตุเพิ่มเติม", type: "textarea" },
      ],
    },
  ];

  const navigate = useNavigate();
  const location = useLocation();

  const [avatarVersion, setAvatarVersion] = useState(0);
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

  const role = (user?.role || "guest").toLowerCase();
  const isAuthenticated = role !== "guest";

  // console.log(profileModalOpen);


  /* --- PAGES (WITH DROPDOWN SUPPORT) --- */
  const pages = useMemo(
    () => [
      { path: "/home", label: "หน้าหลัก", roles: ["admin", "teacher", "student", "owner"] },
      { path: "/history", label: "ประวัติ", roles: ["admin", "teacher", "student", "owner"] },
      { path: "/manage", label: "จัดการผู้ใช้", roles: ["admin", "owner"] },
      // { path: "/listteacher", label: "ประเมินผู้สอน", roles: ["admin", "student"] },
      {
        label: "นักเรียน", roles: ["teacher", "admin", "owner"], children: [
          { path: "/listteacher", label: "ประเมินผู้สอน", roles: ["admin", "owner"] },
          { path: "/liststudent", label: "ประเมินนักเรียน", roles: ["admin", "owner", "teacher", "admin"] },
        ]
      },
      {
        label: "ข้าราชการ", roles: ["teacher", "admin", "owner"], children: [
          { path: "/teacher-report", label: "ประเมินผู้สอน", roles: ["admin", "owner"] },
          { path: "/teacher-leave", label: "แจ้งการลา", roles: ["teacher"] },
        ]
      },
    ],
    []
  );

  /* --- FILTER ITEMS BY ROLE --- */
  const visibleItems = useMemo(() => {
    if (!isAuthenticated) return [];

    return pages
      .filter(item => item.roles.includes(role))
      .map(item => item.children
        ? { ...item, children: item.children.filter(c => !c.roles || c.roles.includes(role)) }
        : item
      );
  }, [role, isAuthenticated, pages]);

  /* --- MOBILE DROPDOWN STATE --- */
  const [openDropdown, setOpenDropdown] = useState(null);

  /* --- EFFECTS --- */
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  useEffect(() => {
    setProfileForm(mapProfileToForm(user));
    setProfileOriginal(mapProfileToForm(user));
  }, [user]);

  // logout
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการออกจากระบบ",
      text: "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#9ca3af",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setProfileMenuOpen(false);
    setProfileModalOpen(false);
    localStorage.clear();
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login", { replace: true });
  };

  /* --- OPEN PROFILE MODAL --- */
  const openProfileModal = () => {
    setProfileForm(mapProfileToForm(user));
    setProfileOriginal(mapProfileToForm(user));
    setPasswordForm(PASSWORD_FORM_DEFAULT);
    setProfileModalOpen(true);
    setProfileMenuOpen(false);
  };

  /* --- RENDER NAV LINK (NO CHILDREN) --- */
  const renderNavLink = (item) => {
    const isActive = location.pathname.startsWith(item.path);
    return (
      <Link key={item.label}
        to={item.path}
        className={`text-sm font-medium transition-colors ${isActive ? "text-blue-800" : "text-gray-600 hover:text-blue-700"}`}>
        {item.label}
      </Link>
    );
  };

  /* ------------------------------------------------------------
      JSX START
  ------------------------------------------------------------ */
  return (
    <>
      <nav className="bg-white w-full shadow-md p-3 transition-all duration-300">
        <div className="mx-auto flex justify-between items-center">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} className="w-12 h-12" />
            <p className="font-semibold text-gray-800">ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ</p>
          </Link>

          {/* IF LOGIN */}
          {isAuthenticated ? (
            <>
              {/* DESKTOP MENU */}
              <div className="hidden md:flex items-center gap-5">

                {/* LOOP MENU */}
                {visibleItems.map(item =>
                  !item.children ? (
                    renderNavLink(item)
                  ) : (
                    <div key={item.label} className="relative group">
                      <button className="text-sm font-medium text-gray-600 hover:text-blue-700 flex items-center gap-1">
                        {item.label}
                        <ChevronDownIcon />
                      </button>

                      <div className="absolute left-0 mt-2 bg-white shadow-lg border border-gray-300 rounded-xl w-44 p-2 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        {item.children.map(child => (
                          <Link
                            key={child.label}
                            to={child.path}
                            className="block px-3 py-2 text-sm hover:bg-gray-50 rounded-lg"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {/* PROFILE */}
                <div className="relative">
                  <button
                    ref={avatarButtonRef}
                    onClick={() => setProfileMenuOpen(prev => !prev)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 p-1 hover:bg-gray-50"
                  >
                    <img src={`${resolveAvatarUrl(user.avatar)}?v=${avatarVersion}`} className="w-9 h-9 rounded-full object-cover" />
                    <ChevronDownIcon open={profileMenuOpen} />
                  </button>

                  {profileMenuOpen && (
                    <div ref={dropdownRef} className="absolute right-0 mt-3 w-60 bg-white border border-gray-200 shadow-xl rounded-2xl p-3 flex flex-col gap-1">
                      <div className="px-2 pb-3 border-b border-gray-400">
                        <p className="text-sm font-semibold">{user.firstName || user.username}</p>
                        <p className="text-xs text-gray-500">{user.role.toUpperCase()}</p>
                      </div>

                      <button onClick={openProfileModal} className="px-3 py-2 rounded-xl hover:bg-gray-50 flex items-center gap-2">
                        <UserRoundPen size={16} /> แก้ไขข้อมูลส่วนตัว
                      </button>

                      <button onClick={handleLogout} className="px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2">
                        <LogOut size={16} /> ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* MOBILE BUTTON */}
              <button className="md:hidden p-2 rounded-lg" onClick={() => setMenuOpen(prev => !prev)}>
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          ) : (
            <Link to="/login" className="px-4 py-2 bg-blue-800 text-white rounded-xl">Login</Link>
          )}
        </div>

        {/* MOBILE MENU */}
        {isAuthenticated && (
          <div className={`md:hidden transition-all duration-500 overflow-hidden flex flex-col items-center gap-3 
            bg-white ${menuOpen ? "max-h-[520px] py-4 mt-3" : "max-h-0 py-0"}`}>

            {visibleItems.map(item =>
              !item.children ? (
                <Link key={item.label} to={item.path} className="py-2 text-gray-700" onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ) : (
                <div key={item.label} className="w-full px-4 text-gray-600 text-center">
                  <button
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.label ? null : item.label)
                    }
                    className="flex items-center w-full py-2 relative"
                  >
                    {/* Label อยู่กลาง */}
                    <div className="absolute left-1/2 -translate-x-1/2">
                      {item.label}
                    </div>

                    {/* Icon ชิดขวา */}
                    <div className="ml-auto">
                      <ChevronDownIcon open={openDropdown === item.label} />
                    </div>
                  </button>

                  {openDropdown === item.label && (
                    <div className="pl-4 flex flex-col gap-2 bg-gray-200">
                      {item.children.map(child => (
                        <Link key={child.label} to={child.path} className="py-1  text-gray-700" onClick={() => setMenuOpen(false)}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            <button onClick={openProfileModal} className="w-11/12 border border-gray-300 py-2 rounded-xl">แก้ไขข้อมูลส่วนตัว</button>
            <button onClick={handleLogout} className="w-11/12 bg-red-600 text-white py-2 rounded-xl">ออกจากระบบ</button>
          </div>
        )}
      </nav>

      {/* MODAL */}
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
          avatarVersion={avatarVersion}
          setAvatarVersion={setAvatarVersion}
        />
      )}

    </>
  );
}

/* --- ICON --- */
function ChevronDownIcon({ open }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
