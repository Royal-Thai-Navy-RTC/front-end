import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Users, RefreshCw, Search } from "lucide-react";

const ROLE_FILTERS = [
    { label: "ทั้งหมด", value: "ALL" },
    { label: "ผู้ดูแลระบบ", value: "ADMIN" },
    { label: "ครูผู้สอน", value: "TEACHER" },
    { label: "นักเรียน", value: "STUDENT" },
];

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
        if (!user?.id) return;
        const isActive = user.isActive ?? true;
        const token = localStorage.getItem("token");
        const url = isActive
            ? `/api/admin/users/deactivate/${user.id}`
            : `/api/admin/users/activate/${user.id}`;
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

        setActionUserId(user.id);
        try {
            if (isActive) {
                await axios.delete(url, config);
            } else {
                await axios.patch(url, {}, config);
            }
            setUsers((prev) =>
                prev.map((item) =>
                    item.id === user.id ? { ...item, isActive: !isActive } : item
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
                    <div className="flex items-center gap-2 text-blue-900">
                        <Users />
                        <span className="text-sm">อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")}</span>
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
                                <th className="p-4">ชื่อ - นามสกุล</th>
                                <th className="p-4">Username</th>
                                <th className="p-4">อีเมล</th>
                                <th className="p-4 text-center">บทบาท</th>
                                <th className="p-4 text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="4" className="text-center p-6 text-blue-600">
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            )}
                            {!loading && error && (
                                <tr>
                                    <td colSpan="4" className="text-center p-6 text-red-500">
                                        {error}
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && paginated.map((user) => {
                                const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
                                const isActive = user.isActive ?? true;
                                return (
                                    <tr key={user.id || user.username} className="border-t border-gray-100 hover:bg-blue-50/40 transition">
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
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`text-xs font-semibold ${isActive ? "text-emerald-600" : "text-red-500"}`}>
                                                    {isActive ? "เปิดใช้งานอยู่" : "ปิดการใช้งาน"}
                                                </span>
                                                <ToggleSwitch
                                                    isActive={isActive}
                                                    disabled={actionUserId === user.id}
                                                    onToggle={() => handleToggleStatus(user)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && !error && paginated.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center p-6 text-gray-400">
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
