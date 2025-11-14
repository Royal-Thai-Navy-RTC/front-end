import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Users, RefreshCw, Search, Pencil, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import navy from "../assets/navy.png";

const ROLE_FILTERS = [
    { label: "ทั้งหมด", value: "ALL" },
    { label: "ผู้ดูแลระบบ", value: "ADMIN" },
    { label: "ครูผู้สอน", value: "TEACHER" },
    { label: "นักเรียน", value: "STUDENT" },
];

const RANK_OPTIONS = [
    { value: "ADMIRAL", label: "พลเรือเอก" },
    { value: "VICE_ADMIRAL", label: "พลเรือโท" },
    { value: "REAR_ADMIRAL", label: "พลเรือตรี" },
    { value: "CAPTAIN", label: "นาวาเอก" },
    { value: "COMMANDER", label: "นาวาโท" },
    { value: "LIEUTENANT_COMMANDER", label: "นาวาตรี" },
    { value: "LIEUTENANT", label: "เรือเอก" },
    { value: "SUB_LIEUTENANT", label: "เรือโท" },
    { value: "ENSIGN", label: "เรือตรี" },
    { value: "PETTY_OFFICER_1", label: "พันจ่าเอก" },
    { value: "PETTY_OFFICER_2", label: "พันจ่าโท" },
    { value: "PETTY_OFFICER_3", label: "พันจ่าตรี" },
    { value: "PETTY_OFFICER", label: "จ่าเอก" },
    { value: "LEADING_RATING", label: "จ่าโท" },
    { value: "ABLE_SEAMAN", label: "จ่าตรี" },
    { value: "SEAMAN_RECRUIT", label: "พลฯ" },
];

const normalizeRankValue = (rank) => {
    if (!rank) return "SEAMAN_RECRUIT";
    const rankString = rank.toString().trim();
    const normalizedValue = rankString.replace(/\s+/g, "_").replace(/-+/g, "_").toUpperCase();
    const matchByValue = RANK_OPTIONS.find((option) => option.value === normalizedValue);
    if (matchByValue) return matchByValue.value;
    const matchByLabel = RANK_OPTIONS.find((option) => option.label === rankString);
    if (matchByLabel) return matchByLabel.value;
    return "SEAMAN_RECRUIT";
};

const CREATE_USER_DEFAULT = {
    rank: "SEAMAN_RECRUIT",
    role: "STUDENT",
    firstName: "",
    lastName: "",
    username: "",
    birthDate: "",
    fullAddress: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    password: "",
    confirmPassword: "",
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";
const resolveAvatarUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_BASE_URL}${path}`;
};

const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};

const getCurrentRole = (storedUser) => {
    const directRole = localStorage.getItem("role");
    return (storedUser?.role || directRole || "guest").toString().toUpperCase();
};

export default function ManageUsers() {
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [actionUserId, setActionUserId] = useState(null);
    const [editUserId, setEditUserId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [editOriginal, setEditOriginal] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState(CREATE_USER_DEFAULT);
    const [createAvatarPreview, setCreateAvatarPreview] = useState("");
    const [createAvatarBase64, setCreateAvatarBase64] = useState("");
    const [creatingUser, setCreatingUser] = useState(false);
    const pageSize = 10;
    const currentUser = getStoredUser();
    const currentUserId = currentUser?.id;
    const currentUsername = currentUser?.username;
    const currentRole = getCurrentRole(currentUser);
    const isAdmin = currentRole === "ADMIN";

    useEffect(() => {
        if (!isAdmin) return;

        const fetchUsers = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem("token");
                const params = roleFilter === "ALL" ? {} : { role: roleFilter };
                const response = await axios.get("/api/admin/users", {
                    params,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const payload = Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response.data?.data)
                        ? response.data.data
                        : [];
                setUsers(payload);
            } catch (err) {
                const message = err.response?.data?.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้";
                setError(message);
                setUsers([]);
                Swal.fire({
                    title: "เกิดข้อผิดพลาด",
                    text: message,
                    icon: "error",
                });
            } finally {
                setLoading(false);
                setPage(1);
            }
        };

        fetchUsers();
    }, [roleFilter, reloadKey, isAdmin]);

    const filteredUsers = useMemo(() => {
        const keyword = search.toLowerCase();
        return users.filter((user) => {
            const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase();
            const username = (user.username || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            const isSelf =
                (currentUserId != null && user.id === currentUserId) ||
                (!!currentUsername && username === currentUsername.toLowerCase());
            const matchesKeyword =
                !keyword ||
                fullName.includes(keyword) ||
                username.includes(keyword) ||
                email.includes(keyword);
            return !isSelf && matchesKeyword;
        });
    }, [users, search, currentUserId, currentUsername]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const paginated = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

    const stats = useMemo(() => {
        return users.reduce(
            (acc, user) => {
                const role = (user.role || "").toUpperCase();
                if (role === "ADMIN") acc.admin += 1;
                else if (role === "TEACHER") acc.teacher += 1;
                else if (role === "STUDENT") acc.student += 1;
                else acc.others += 1;
                acc.total += 1;
                return acc;
            },
            { total: 0, admin: 0, teacher: 0, student: 0, others: 0 }
        );
    }, [users]);

    const getPaginationNumbers = () => {
        if (totalPages <= 1) return [1];

        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (
            let i = Math.max(2, page - delta);
            i <= Math.min(totalPages - 1, page + delta);
            i++
        ) {
            range.push(i);
        }

        if (page - delta > 2) rangeWithDots.push("...");
        rangeWithDots.push(...range);
        if (page + delta < totalPages - 1) rangeWithDots.push("...");

        return [1, ...rangeWithDots, totalPages];
    };

    const handleToggleStatus = async (user) => {
        const userId = user?.id ?? user?._id;
        if (!userId) return;
        const isActive = user.isActive ?? true;
        const token = localStorage.getItem("token");
        const url = isActive
            ? `/api/admin/users/deactivate/${userId}`
            : `/api/admin/users/activate/${userId}`;
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const confirmResult = await Swal.fire({
            icon: "warning",
            title: isActive ? "ต้องการปิดการใช้งานผู้ใช้นี้?" : "ต้องการเปิดใช้งานผู้ใช้นี้?",
            text: isActive
                ? "ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง"
                : "ผู้ใช้จะกลับมาเข้าสู่ระบบได้ตามปกติ",
            showCancelButton: true,
            confirmButtonText: isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: isActive ? "#dc2626" : "#059669",
        });

        if (!confirmResult.isConfirmed) return;

        setActionUserId(userId);
        try {
            if (isActive) {
                await axios.delete(url, config);
            } else {
                await axios.patch(url, {}, config);
            }
            setUsers((prev) =>
                prev.map((item) =>
                    (item.id ?? item._id) === userId ? { ...item, isActive: !isActive } : item
                )
            );
            Swal.fire({
                icon: "success",
                title: isActive ? "ปิดการใช้งานสำเร็จ" : "เปิดการใช้งานสำเร็จ",
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถอัปเดตสถานะผู้ใช้ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setActionUserId(null);
        }
    };

const mapUserToForm = (data = {}) => ({
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    username: data.username || "",
    email: data.email || "",
    phone: data.phone || "",
    rank: normalizeRankValue(data.rank),
    role: (data.role || "STUDENT").toUpperCase(),
    isActive: data.isActive ?? true,
    fullAddress: data.fullAddress || "",
    avatar: data.avatar || "",
    password: "",
    });

    const openEditModal = async (user) => {
        const userId = user?.id ?? user?._id;
        if (!userId) return;
        setEditUserId(userId);
        setEditLoading(true);
        const initialForm = mapUserToForm(user);
        setEditForm(initialForm);
        setEditOriginal(initialForm);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/admin/users/${userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const payload = response.data?.data ?? response.data;
            if (payload) {
                const mapped = mapUserToForm(payload);
                setEditForm(mapped);
                setEditOriginal(mapped);
            }
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถโหลดข้อมูลผู้ใช้ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setEditLoading(false);
        }
    };

    const closeEditModal = () => {
        setEditUserId(null);
        setEditForm(null);
        setEditOriginal(null);
        setEditLoading(false);
        setSaving(false);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditToggleActive = () => {
        setEditForm((prev) => ({ ...prev, isActive: !prev.isActive }));
    };

    const handleSaveEdit = async () => {
        if (!editUserId || !editForm) return;
        const payload = {};
        const keysToCompare = ["firstName", "lastName", "email", "phone", "rank", "role", "isActive", "fullAddress"];

        keysToCompare.forEach((key) => {
            if (!editOriginal || editForm[key] !== editOriginal[key]) {
                payload[key] = editForm[key];
            }
        });

        if (editForm.password) {
            payload.password = editForm.password;
        }

        if (Object.keys(payload).length === 0) {
            Swal.fire({
                icon: "info",
                title: "ไม่มีการเปลี่ยนแปลง",
                text: "กรุณาแก้ไขข้อมูลก่อนบันทึก",
            });
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.put(`/api/admin/users/${editUserId}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const updatedUser = response.data?.data ?? response.data ?? payload;

            setUsers((prev) =>
                prev.map((user) =>
                    (user.id ?? user._id) === editUserId ? { ...user, ...updatedUser } : user
                )
            );

            Swal.fire({
                icon: "success",
                title: "บันทึกข้อมูลสำเร็จ",
                timer: 1500,
                showConfirmButton: false,
            });
            closeEditModal();
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !editUserId) return;

        const formData = new FormData();
        formData.append("avatar", file);

        setUploadingAvatar(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`/api/admin/users/${editUserId}/avatar`, formData, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    "Content-Type": "multipart/form-data",
                },
            });

            const updatedUser = response.data?.data ?? response.data;

            setUsers((prev) =>
                prev.map((user) =>
                    (user.id ?? user._id) === editUserId ? { ...user, ...updatedUser } : user
                )
            );
            setEditForm((prev) => (prev ? { ...prev, avatar: updatedUser.avatar || prev.avatar || "" } : prev));
            setEditOriginal((prev) => (prev ? { ...prev, avatar: updatedUser.avatar || prev.avatar || "" } : prev));

            Swal.fire({
                icon: "success",
                title: "อัปโหลดรูปโปรไฟล์สำเร็จ",
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setUploadingAvatar(false);
            event.target.value = "";
        }
    };

    const resetCreateForm = () => {
        setCreateForm(CREATE_USER_DEFAULT);
        setCreateAvatarPreview("");
        setCreateAvatarBase64("");
    };

    const openCreateModal = () => {
        resetCreateForm();
        setCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (creatingUser) return;
        setCreateModalOpen(false);
        resetCreateForm();
    };

    const handleCreateChange = (event) => {
        const { name, value } = event.target;
        setCreateForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateAvatarChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCreateAvatarPreview(URL.createObjectURL(file));
        const reader = new FileReader();
        reader.onloadend = () => setCreateAvatarBase64(reader.result?.toString() ?? "");
        reader.readAsDataURL(file);
    };

    const handleCreateSubmit = async () => {
        const requiredFields = [
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

        const missing = requiredFields.filter((field) => !`${createForm[field] ?? ""}`.trim());
        if (missing.length) {
            Swal.fire({
                icon: "warning",
                title: "กรุณากรอกข้อมูลให้ครบ",
                text: "โปรดตรวจสอบข้อมูลให้ครบทุกช่องที่จำเป็น",
            });
            return;
        }

        if (createForm.password !== createForm.confirmPassword) {
            Swal.fire({
                icon: "warning",
                title: "รหัสผ่านไม่ตรงกัน",
                text: "กรุณายืนยันรหัสผ่านให้ตรงกัน",
            });
            return;
        }

        const payload = {
            rank: createForm.rank,
            firstName: createForm.firstName,
            lastName: createForm.lastName,
            username: createForm.username,
            birthDate: createForm.birthDate,
            fullAddress: createForm.fullAddress,
            email: createForm.email,
            phone: createForm.phone,
            emergencyContactName: createForm.emergencyContactName,
            emergencyContactPhone: createForm.emergencyContactPhone,
            password: createForm.password,
        };

        if (!payload.rank) {
            delete payload.rank;
        }

        if (createForm.role) {
            payload.role = createForm.role.toUpperCase();
        }

        if (createAvatarBase64) {
            payload.profileImage = createAvatarBase64;
        }

        setCreatingUser(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/admin/users", payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            Swal.fire({
                icon: "success",
                title: "สร้างผู้ใช้สำเร็จ",
                timer: 1600,
                showConfirmButton: false,
            });
            setReloadKey((prev) => prev + 1);
            setCreateModalOpen(false);
            resetCreateForm();
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถสร้างผู้ใช้ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setCreatingUser(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-md w-full text-center">
                <h2 className="text-2xl font-semibold text-red-600 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
                <p className="text-gray-600">หน้าจัดการผู้ใช้สามารถเปิดได้เฉพาะผู้ดูแลระบบเท่านั้น</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">
            <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500">ระบบจัดการผู้ใช้</p>
                        <h1 className="text-3xl font-bold text-blue-900">Admin Control Center</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-blue-900">
                            <Users />
                            <span className="text-sm">อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")}</span>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow"
                            >
                                <UserPlus size={16} />
                                สร้างผู้ใช้ใหม่
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-gray-600 text-sm">
                    จัดการผู้ใช้ทุกบทบาทด้วยเครื่องมือค้นหาและตรวจสอบสถานะอย่างมืออาชีพ พร้อมข้อมูลสถิติที่อัปเดตแบบเรียลไทม์
                </p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="ผู้ใช้ทั้งหมด" value={stats.total} accent="from-blue-500 to-blue-700" />
                <SummaryCard label="ผู้ดูแลระบบ" value={stats.admin} accent="from-purple-500 to-purple-700" />
                <SummaryCard label="ครูผู้สอน" value={stats.teacher} accent="from-green-500 to-emerald-600" />
                <SummaryCard label="นักเรียน" value={stats.student} accent="from-amber-500 to-yellow-500" />
            </section>

            <section className="bg-white rounded-2xl p-5 shadow flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <p className="text-lg font-semibold text-gray-800">ค้นหาและกรองผู้ใช้</p>
                    <p className="text-sm text-gray-500">เลือกบทบาทที่ต้องการและค้นหาผู้ใช้ตามชื่อ Username หรืออีเมล</p>
                </div>
                <div className="grid lg:grid-cols-4 gap-3">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border rounded-xl px-3 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    >
                        {ROLE_FILTERS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="lg:col-span-2 flex items-center border rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-blue-200 transition">
                        <Search className="text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, username หรืออีเมล..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="px-2 py-2 flex-1 focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSearch("")}
                            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition w-full"
                        >
                            ล้าง
                        </button>
                        <button
                            onClick={() => setReloadKey((prev) => prev + 1)}
                            disabled={loading}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition w-full"
                        >
                            <RefreshCw size={18} />
                            รีเฟรช
                        </button>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-2xl p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-lg font-semibold text-gray-800">รายชื่อผู้ใช้</p>
                        <p className="text-sm text-gray-500">แสดงผล {paginated.length} รายการจากทั้งหมด {filteredUsers.length} รายการ</p>
                    </div>
                    <span className="text-sm text-gray-400">
                        Page {page} / {totalPages}
                    </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="min-w-full text-left text-gray-700 text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
                            <tr>
                                <th className="p-4 text-center">รูป</th>
                                <th className="p-4 text-center">ยศ</th>
                                <th className="p-4">ชื่อ - นามสกุล</th>
                                <th className="p-4">Username</th>
                                <th className="p-4">อีเมล</th>
                                <th className="p-4 text-center">บทบาท</th>
                                <th className="p-4 text-center">แก้ไข</th>
                                <th className="p-4 text-center">สถานะ</th>
                                <th className="p-4 text-center">รายละเอียด</th>
                            </tr>
                        </thead>
                    <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="9" className="text-center p-6 text-blue-600">
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            )}
                            {!loading && error && (
                                <tr>
                                    <td colSpan="9" className="text-center p-6 text-red-500">
                                        {error}
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && paginated.map((user) => {
                                const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
                                const rankLabel = RANK_OPTIONS.find((option) => option.value === (user.rank || "").toUpperCase())?.label || user.rank || "-";
                                const isActive = user.isActive ?? true;
                                return (
                                    <tr key={user.id || user.username} className="border-t border-gray-100 hover:bg-blue-50/40 transition">
                                        <td className="p-4 text-center">
                                            <img
                                                src={resolveAvatarUrl(user.avatar) || navy}
                                                alt={fullName}
                                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                                                {rankLabel || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold">{fullName}</p>
                                            <p className="text-xs text-gray-500">{user.department || "ไม่ระบุแผนก"}</p>
                                        </td>
                                        <td className="p-4">{user.username || "-"}</td>
                                        <td className="p-4">{user.email || "-"}</td>
                                        <td className="p-4 text-center">
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                {(user.role || "-").toString().toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition"
                                            >
                                                <Pencil size={14} />
                                                แก้ไข
                                            </button>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`text-xs font-semibold ${isActive ? "text-emerald-600" : "text-red-500"}`}>
                                                    {isActive ? "เปิดใช้งานอยู่" : "ปิดการใช้งาน"}
                                                </span>
                                                <ToggleSwitch
                                                    isActive={isActive}
                                                    disabled={actionUserId === (user.id ?? user._id)}
                                                    onToggle={() => handleToggleStatus(user)}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link
                                                to={`/users/${user.id ?? user._id}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                                            >
                                                ดูข้อมูล
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && !error && paginated.length === 0 && (
                                <tr>
                                        <td colSpan="9" className="text-center p-6 text-gray-400">
                                        ไม่พบข้อมูลผู้ใช้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-between items-center mt-6 gap-2 text-sm">
                    <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                        ก่อนหน้า
                    </button>
                    <div className="flex items-center gap-2">
                        {getPaginationNumbers().map((num, idx) =>
                            num === "..." ? (
                                <span key={`${num}-${idx}`} className="px-2 text-gray-500">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={idx}
                                    onClick={() => setPage(num)}
                                    className={`px-3 py-1 rounded-lg ${page === num ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                                >
                                    {num}
                                </button>
                            )
                        )}
                    </div>
                    <button
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                        ถัดไป
                    </button>
                </div>
            </section>
            {createModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-sm text-blue-500 font-semibold">สร้างผู้ใช้ใหม่</p>
                                <h3 className="text-2xl font-semibold text-gray-900">บันทึกข้อมูลกำลังพล</h3>
                                <p className="text-sm text-gray-500">ข้อมูลที่ครบถ้วนช่วยให้ระบบจัดการสิทธิ์ได้อย่างแม่นยำ</p>
                            </div>
                            <button
                                onClick={closeCreateModal}
                                disabled={creatingUser}
                                className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 p-2 disabled:opacity-60"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid lg:grid-cols-[260px,1fr] gap-6">
                            <div className="flex flex-col items-center gap-4 border border-gray-100 rounded-2xl p-4">
                                {createAvatarPreview ? (
                                    <img
                                        src={createAvatarPreview}
                                        alt="avatar preview"
                                        className="w-32 h-32 rounded-full object-cover border border-gray-200"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                                        รูปโปรไฟล์
                                    </div>
                                )}
                                <label className="w-full">
                                    <div className="w-full text-center px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                                        เลือกรูปภาพ
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCreateAvatarChange}
                                        className="hidden"
                                        disabled={creatingUser}
                                    />
                                </label>
                                <p className="text-xs text-gray-500 text-center px-2">
                                    รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5 MB
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ยศ</span>
                                        <select
                                            name="rank"
                                            value={createForm.rank}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="">-- เลือกยศ --</option>
                                            {RANK_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>บทบาท</span>
                                        <select
                                            name="role"
                                            value={createForm.role}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="TEACHER">TEACHER</option>
                                            <option value="STUDENT">STUDENT</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ชื่อ</span>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={createForm.firstName}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>นามสกุล</span>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={createForm.lastName}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>Username</span>
                                        <input
                                            type="text"
                                            name="username"
                                            value={createForm.username}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>วันเดือนปีเกิด</span>
                                        <input
                                            type="date"
                                            name="birthDate"
                                            value={createForm.birthDate}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>อีเมล</span>
                                        <input
                                            type="email"
                                            name="email"
                                            value={createForm.email}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>เบอร์โทรศัพท์</span>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={createForm.phone}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ที่อยู่</span>
                                    <textarea
                                        name="fullAddress"
                                        value={createForm.fullAddress}
                                        onChange={handleCreateChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-20"
                                    />
                                </label>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ผู้ติดต่อฉุกเฉิน</span>
                                        <input
                                            type="text"
                                            name="emergencyContactName"
                                            value={createForm.emergencyContactName}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>เบอร์ติดต่อฉุกเฉิน</span>
                                        <input
                                            type="text"
                                            name="emergencyContactPhone"
                                            value={createForm.emergencyContactPhone}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>รหัสผ่าน</span>
                                        <input
                                            type="password"
                                            name="password"
                                            value={createForm.password}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ยืนยันรหัสผ่าน</span>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={createForm.confirmPassword}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeCreateModal}
                                disabled={creatingUser}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={creatingUser}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                                {creatingUser ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {editForm && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-blue-500 font-semibold">แก้ไขข้อมูลผู้ใช้</p>
                                <h3 className="text-2xl font-semibold text-gray-900">
                                    {editForm.firstName || editForm.lastName
                                        ? `${editForm.firstName} ${editForm.lastName}`
                                        : editForm.username}
                                </h3>
                                <p className="text-xs text-gray-500">Username: {editForm.username || "-"}</p>
                            </div>
                            <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-700 text-xl font-semibold">
                                ✕
                            </button>
                        </div>

                        {editLoading ? (
                            <div className="text-center py-10 text-blue-600 font-semibold">กำลังโหลดข้อมูล...</div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex flex-col items-center gap-3 sm:col-span-2">
                                    <img
                                        src={resolveAvatarUrl(editForm.avatar) || navy}
                                        alt="avatar preview"
                                        className="w-32 h-32 rounded-full object-cover border border-gray-200 shadow"
                                    />
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-200 transition">
                                        {uploadingAvatar ? "กำลังอัปโหลด..." : "เปลี่ยนรูปโปรไฟล์"}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                                    </label>
                                </div>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ชื่อ</span>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={editForm.firstName}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>นามสกุล</span>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={editForm.lastName}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>อีเมล</span>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editForm.email}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>เบอร์โทรศัพท์</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={editForm.phone}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ยศ / ตำแหน่ง</span>
                                    <select
                                        name="rank"
                                        value={editForm.rank}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        {RANK_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>Role</span>
                                    <select
                                        name="role"
                                        value={editForm.role}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="TEACHER">TEACHER</option>
                                        <option value="STUDENT">STUDENT</option>
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>ที่อยู่</span>
                                    <textarea
                                        name="fullAddress"
                                        value={editForm.fullAddress}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-24"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>รีเซ็ตรหัสผ่าน (เว้นว่างหากไม่ต้องการเปลี่ยน)</span>
                                    <input
                                        type="password"
                                        name="password"
                                        value={editForm.password}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <div className="flex flex-col gap-2 text-sm">
                                    <span>สถานะการใช้งาน</span>
                                    <div className="flex items-center gap-3">
                                        <ToggleSwitch isActive={editForm.isActive} disabled={false} onToggle={handleEditToggleActive} />
                                        <span className={`text-sm font-semibold ${editForm.isActive ? "text-emerald-600" : "text-red-500"}`}>
                                            {editForm.isActive ? "เปิดใช้งาน" : "ปิดการใช้งาน"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50"
                                disabled={saving}
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving || editLoading}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, accent }) {
    return (
        <div className={`rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${accent}`}>
            <p className="text-sm text-white/80">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    );
}

function ToggleSwitch({ isActive, disabled, onToggle }) {
    return (
        <label className={`relative inline-flex items-center cursor-pointer ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
            <input
                type="checkbox"
                className="sr-only peer"
                checked={isActive}
                disabled={disabled}
                onChange={onToggle}
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 transition-colors"></div>
            <div className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-7" : ""}`}></div>
        </label>
    );
}
