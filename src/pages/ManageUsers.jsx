import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const ROLE_FILTERS = [
    { label: "ทั้งหมด", value: "ALL" },
    { label: "ผู้ดูแลระบบ", value: "ADMIN" },
    { label: "ครูผู้สอน", value: "TEACHER" },
    { label: "นักเรียน", value: "STUDENT" },
];

const getCurrentRole = () => {
    try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        const directRole = localStorage.getItem("role");
        return (storedUser?.role || directRole || "guest").toString().toUpperCase();
    } catch {
        return "GUEST";
    }
};

export default function ManageUsers() {
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const pageSize = 10;
    const currentRole = getCurrentRole();
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
            return (
                !keyword ||
                fullName.includes(keyword) ||
                username.includes(keyword) ||
                email.includes(keyword)
            );
        });
    }, [users, search]);

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

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-md w-full text-center">
                <h2 className="text-2xl font-semibold text-red-600 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
                <p className="text-gray-600">หน้าจัดการผู้ใช้สามารถเปิดได้เฉพาะผู้ดูแลระบบเท่านั้น</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-blue-900">จัดการผู้ใช้</h1>
                <p className="text-gray-600">ดูภาพรวมและค้นหาผู้ใช้ทั้งหมดภายในระบบ</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="ผู้ใช้ทั้งหมด" value={stats.total} accent="bg-blue-100 text-blue-700" />
                <SummaryCard label="ผู้ดูแลระบบ" value={stats.admin} accent="bg-purple-100 text-purple-700" />
                <SummaryCard label="ครูผู้สอน" value={stats.teacher} accent="bg-green-100 text-green-700" />
                <SummaryCard label="นักเรียน" value={stats.student} accent="bg-yellow-100 text-yellow-700" />
            </div>

            <div className="bg-white rounded-xl p-4 shadow w-full">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-base w-full lg:w-56 focus:outline-none focus:ring focus:ring-blue-200"
                    >
                        {ROLE_FILTERS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="flex flex-1 gap-2">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, username หรืออีเมล..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring focus:ring-blue-200"
                        />
                        <button
                            onClick={() => setSearch("")}
                            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                        >
                            ล้าง
                        </button>
                    </div>
                    <button
                        onClick={() => setReloadKey((prev) => prev + 1)}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        รีเฟรช
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow w-full overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-gray-700">
                    <thead className="bg-blue-50 text-blue-700 font-semibold">
                        <tr>
                            <th className="p-3 border-b">ชื่อ - นามสกุล</th>
                            <th className="p-3 border-b">Username</th>
                            <th className="p-3 border-b">อีเมล</th>
                            <th className="p-3 border-b text-center">Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan="4" className="text-center p-4 text-blue-600">
                                    กำลังโหลดข้อมูล...
                                </td>
                            </tr>
                        )}
                        {!loading && error && (
                            <tr>
                                <td colSpan="4" className="text-center p-4 text-red-500">
                                    {error}
                                </td>
                            </tr>
                        )}
                        {!loading && !error && paginated.map((user) => {
                            const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
                            return (
                                <tr key={user.id || user.username} className="hover:bg-blue-50">
                                    <td className="p-3 border-b">{fullName}</td>
                                    <td className="p-3 border-b">{user.username || "-"}</td>
                                    <td className="p-3 border-b">{user.email || "-"}</td>
                                    <td className="p-3 border-b text-center">
                                        <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                                            {(user.role || "-").toString().toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && !error && paginated.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center p-4 text-gray-400">
                                    ไม่พบข้อมูลผู้ใช้
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="flex flex-wrap justify-center sm:justify-end items-center mt-4 gap-2 text-sm">
                    <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-blue-50"
                    >
                        ก่อนหน้า
                    </button>

                    {getPaginationNumbers().map((num, idx) =>
                        num === "..." ? (
                            <span key={`${num}-${idx}`} className="px-2">
                                ...
                            </span>
                        ) : (
                            <button
                                key={idx}
                                onClick={() => setPage(num)}
                                className={`px-3 py-1 border rounded hover:bg-blue-50 ${page === num
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "text-gray-700"
                                    }`}
                            >
                                {num}
                            </button>
                        )
                    )}

                    <button
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-blue-50"
                    >
                        ถัดไป
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, accent }) {
    return (
        <div className={`rounded-2xl p-4 shadow border border-gray-100 ${accent}`}>
            <p className="text-sm">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    );
}
