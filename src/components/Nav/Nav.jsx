/* --- IMPORTS --- */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  CircleSmall ,
  User,
  Mail,
  Bell,
  Loader2,
  LogOut,
  Menu,
  UserRoundPen,
  X,
  Home,
  Clock3,
  Settings2,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import logo from "../../assets/logo.png";
import navy from "../../assets/navy.png";
import ProfileModal from "./ProfileModal";
import { mapProfileToForm, editableKeys } from "./profileUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const ROLE_LABELS = {
  admin: "ผู้ดูแลระบบ",
  owner: "ผู้บังคับบัญชา",
  sub_admin: "หัวหน้าหมวดวิชา",
  teacher: "ครูผู้สอน",
  student: "นักเรียน",
};

/* --- UTILITIES --- */
const resolveAvatarUrl = (value = "") => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path}`;
};

const getRoleLabel = (role) => {
  if (!role) return "-";
  const key = role.toString().toLowerCase();
  return ROLE_LABELS[key] || role.toString().toUpperCase();
};

const PASSWORD_FORM_DEFAULT = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};


const getErrorMessage = (error, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่") => error?.response?.data?.message || error?.message || fallback;

/* --- MAIN COMPONENT --- */
export default function Nav({
  user = { role: "guest" },
  messages = [],
  onProfileUpdated = () => { },
  rankOptions,
  divisionOptions,
  religionOptions,
}) {
  const profileSections = [
    {
      title: "ข้อมูลพื้นฐาน", fields: [
        { name: "rank", label: "ยศ", type: "select", option: rankOptions },
        { name: "firstName", label: "ชื่อ", type: "text" }, { name: "lastName", label: "นามสกุล", type: "text" },
        // { name: "username", label: "ชื่อผู้ใช้งาน", type: "text" },
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
        { name: "religion", label: "ศาสนา", type: "select", option: religionOptions },
        { name: "specialSkills", label: "ความสามารถพิเศษ", type: "input", placeholder: "ระบุ เช่น ว่ายน้ำ, ภาษาอังกฤษ" },
        { name: "secondaryOccupation", label: "อาชีพเสริม", type: "input", placeholder: "" },
        { name: "notes", label: "หมายเหตุเพิ่มเติม", type: "textarea", placeholder: "..." },
      ],
    },
  ];

  const navigate = useNavigate();
  const location = useLocation();

  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
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
  const hasUnreadMessage = useMemo(
    () => Array.isArray(messages) && messages.some((m) => (m?.status || "").toLowerCase() === "unread"),
    [messages]
  );

  // console.log(profileModalOpen);


  /* --- PAGES (WITH DROPDOWN SUPPORT) --- */
  const pages = useMemo(
    () => [
      { path: "/home", label: "หน้าหลัก", icon: Home, roles: ["admin", "sub_admin", "teacher", "student", "owner"] },
      {
        label: "ทั่วไป", icon: CircleSmall, roles: ["admin", "owner"], children: [
          { path: "/library", label: "ห้องสมุด", icon: BookOpen, roles: ["admin", "sub_admin", "teacher", "student", "owner", "guest"] },
          { path: "/history", label: "ประวัติ", icon: Clock3, roles: ["admin", "sub_admin", "teacher", "student", "owner"] },
          { path: "/teaching-schedules", label: "จัดการตารางสอน", icon: CalendarClock, roles: ["admin", "owner"] },
        ]
      },
      {
        label: "Admin", icon: Settings2, roles: ["admin", "owner"], children: [
          { path: "/manage", label: "จัดการผู้ใช้", icon: Settings2, roles: ["admin", "owner"] },
          { path: "/form-evaluate-student", label: "สร้างฟอร์มการประเมิน", icon: ClipboardList, roles: ["admin", "owner"] },
          { path: "/soldiers", label: "Dashboard ทหารใหม่", icon: ClipboardList, roles: ["admin", "owner"] },
          { path: "/soilderprofile", label: "ลงทะเบียนทหารใหม่", icon: User, roles: ["admin", "owner"] },
          // { path: "/managesailor", label: "พลทหาร", icon: Settings2, roles: ["admin", "owner", "sub_admin"] },
        ]
      },
      {
        label: "นักเรียน", icon: GraduationCap, roles: ["teacher", "admin", "sub_admin", "owner"], children: [
          { path: "/listteacher", label: "ประเมินผู้สอน", icon: ClipboardList, roles: ["admin", "owner"] },
          { path: "/listevaluation", label: "ประเมินนักเรียน", icon: GraduationCap, roles: ["admin", "owner", "teacher", "sub_admin"] },
        ]
      },
      {
        label: "ข้าราชการ", icon: ClipboardList, roles: ["teacher", "admin", "sub_admin", "owner"], children: [
          { path: "/teacher-report", label: "แจ้งยอดนักเรียน", icon: ClipboardList, roles: ["admin", "owner", "teacher", "sub_admin"] },
          { path: "/teacher-leave", label: "แจ้งการลา", icon: ClipboardList, roles: ["teacher", "admin", "sub_admin", "owner"] },
          { path: "/evaluation-dashboard", label: "สรุปผลการประเมิน", icon: CalendarClock, roles: ["admin", "owner", "sub_admin", "teacher"] },
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
    const Icon = item.icon;
    return (
      <Link
        key={item.label}
        to={item.path}
        aria-label={item.label}
        className={`text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? "text-blue-800" : "text-gray-600 hover:text-blue-700"}`}
      >
        {Icon && <Icon size={18} />}
        <span className="hidden lg:inline">{item.label}</span>
      </Link>
    );
  };

  // console.log(resolveAvatarUrl(user.avatar));


  /* ------------------------------------------------------------
      JSX START
  ------------------------------------------------------------ */
  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-blue-100 shadow-lg p-3 transition-all duration-300">
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
                      <button
                        aria-label={item.label}
                        className="text-sm font-medium text-gray-600 hover:text-blue-700 flex items-center gap-2"
                      >
                        {item.icon && <item.icon size={18} />}
                        <span className="hidden lg:inline">{item.label}</span>
                        <ChevronDownIcon />
                      </button>

                      <div className="absolute left-0 mt-2 bg-white shadow-2xl border border-blue-100 rounded-2xl w-48 p-3 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40">
                        {item.children.map(child => (
                          <Link
                            key={child.label}
                            to={child.path}
                            className="block px-3 py-2 text-sm hover:bg-blue-50 rounded-xl flex items-center gap-2 text-gray-700"
                          >
                            {child.icon && <child.icon size={14} />}
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {/* PROFILE */}
                <div className="relative z-40">
                  <button
                    ref={avatarButtonRef}
                    onClick={() => setProfileMenuOpen(prev => !prev)}
                    className="relative flex items-center gap-2 rounded-full border border-gray-200 p-1 hover:bg-gray-50"
                  >
                    <div className="relative">
                      <img src={`${resolveAvatarUrl(user.avatar)}?v=${avatarVersion}`} className="w-9 h-9 rounded-full object-cover" />
                      {hasUnreadMessage && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-label="มีข้อความใหม่" />
                      )}
                    </div>
                    <ChevronDownIcon open={profileMenuOpen} />
                  </button>

                  {profileMenuOpen && (
                    <div ref={dropdownRef} className="absolute right-0 mt-3 w-60 bg-white backdrop-blur border border-blue-100 shadow-2xl rounded-2xl p-3 flex flex-col gap-1 z-50">
                      <div className="px-2 pb-3 border-b border-gray-200">
                        <p className="text-sm font-semibold">{user.rank} {user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500">{getRoleLabel(user.role)}</p>
                      </div>

                      <button onClick={openProfileModal} className="px-3 py-2 rounded-xl hover:bg-gray-50 flex items-center gap-2">
                        <UserRoundPen size={16} /> แก้ไขข้อมูลส่วนตัว
                      </button>

                      <Link
                        onClick={() => setProfileMenuOpen(prev => !prev)}
                        to="/message"
                        className="px-3 py-2 rounded-xl hover:bg-gray-50 flex items-center gap-2 relative"
                      >
                        <Mail size={16} />
                        ข้อความ
                        {hasUnreadMessage && <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-red-500" aria-label="มีข้อความใหม่" />}
                      </Link>

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
          <div className={`md:hidden transition-all duration-500 flex flex-col items-center gap-3 
            bg-white/95 backdrop-blur border border-blue-100 shadow-lg rounded-2xl 
            ${menuOpen ? "max-h-[70vh] py-4 mt-3 overflow-y-auto overscroll-contain" : "max-h-0 py-0 overflow-hidden"}`}>

            {visibleItems.map(item =>
              !item.children ? (
                <Link key={item.label} to={item.path} className="w-11/12 py-3 text-gray-700 flex items-center gap-2 justify-center rounded-xl hover:bg-blue-50" onClick={() => setMenuOpen(false)}>
                  {item.icon && <item.icon size={16} />}
                  {item.label}
                </Link>
              ) : (
                <div key={item.label} className="w-full px-4 text-gray-600 text-center">
                  <button
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.label ? null : item.label)
                    }
                    className="flex items-center w-full py-3 relative rounded-xl border border-blue-50 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-2 mx-auto">
                      {item.icon && <item.icon size={16} />}
                      <span>{item.label}</span>
                    </div>
                    <ChevronDownIcon open={openDropdown === item.label} />
                  </button>

                  {openDropdown === item.label && (
                    <div className="pl-4 flex flex-col gap-2 bg-blue-50 rounded-xl py-2 mt-2">
                      {item.children.map(child => (
                        <Link key={child.label} to={child.path} className="py-2 px-3 text-gray-700 flex items-center gap-2 rounded-lg hover:bg-white" onClick={() => setMenuOpen(false)}>
                          {child.icon && <child.icon size={14} />}
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            <Link
              to="/message"
              className="w-11/12 py-3 text-gray-700 flex items-center gap-2 justify-center rounded-xl hover:bg-blue-50 relative"
              onClick={() => setMenuOpen(false)}
            >
              <Mail size={16} />
              ข้อความ
              {hasUnreadMessage && <span className="absolute right-4 top-3 h-2 w-2 rounded-full bg-red-500" aria-label="มีข้อความใหม่" />}
            </Link>

            <button onClick={openProfileModal} className="w-11/12 border border-blue-100 py-3 rounded-xl text-gray-800 hover:bg-blue-50">แก้ไขข้อมูลส่วนตัว</button>
            <button onClick={handleLogout} className="w-11/12 bg-red-600 text-white py-3 rounded-xl">ออกจากระบบ</button>
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
