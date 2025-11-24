import React, { useState, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Edit, Search } from "lucide-react";
import axios from "axios";
import navy from "../assets/navy.png";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "https://api.pargorn.com"
const resolveAvatarUrl = (value = "") => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_BASE_URL}${path}`;
};

export default function Listteacher() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const pageSize = 10;

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("/api/admin/users", {
                    params: { role: "TEACHER" },
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
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const filtered = useMemo(() => {
        const keyword = search.toLowerCase();
        return users.filter((user) => {
            const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase();
            const subject = (user.division || "").toLowerCase();
            return (
                fullName.includes(keyword) ||
                subject.includes(keyword) ||
                (user.username || "").toLowerCase().includes(keyword)
            );
        });
    }, [users, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handlePageChange = (p) => {
        if (p >= 1 && p <= totalPages) setPage(p);
    };

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

    return (
        <div className="flex flex-col w-full gap-5">
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="p-5 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Teacher Directory</p>
                            <h1 className="text-xl font-semibold text-gray-900">รายชื่อครูผู้สอน</h1>
                            <p className="text-sm text-gray-500">ค้นหาครูผู้สอนและหมวดวิชาที่รับผิดชอบ</p>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full self-start sm:self-center">
                            แสดง {filtered.length} รายการ
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex flex-1 items-center border rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-blue-300 transition">
                            <Search className="text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อหรือหมวดวิชา..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="px-2 py-1 flex-1 text-sm focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setSearch("");
                                setPage(1);
                            }}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                            ล้างการค้นหา
                        </button>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-gray-700 text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold">
                        <tr>
                            <th className="p-3 border-b text-center w-14">#</th>
                            <th className="p-3 border-b w-[240px]">ชื่อ-นามสกุล</th>
                            <th className="p-3 border-b">วิชาที่รับผิดชอบ / หน่วย</th>
                            <th className="p-3 border-b text-center w-36">แบบประเมิน</th>
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
                        {!loading && !error && paginated.map((user, i) => {
                            const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "-";
                            const subject = user.division || "-";
                            const teacherId = user.id ?? user._id ?? null;
                            const avatarSrc = resolveAvatarUrl(user.avatar) || navy;
                            return (
                                <tr key={user.id ?? `${user.username}-${i}`} className="hover:bg-blue-50/50 transition">
                                    <td className="p-3 border-b text-center font-semibold text-gray-500 text-xs">{(page - 1) * pageSize + i + 1}</td>
                                    <td className="p-3 border-b">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex items-center justify-center">
                                                <img
                                                    src={avatarSrc}
                                                    alt={fullName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = navy; }}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="font-semibold text-gray-900 leading-tight text-sm">{fullName}</p>
                                                <p className="text-xs text-gray-500">Username: {user.username || "-"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 border-b">
                                        <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700 border border-blue-100">
                                            {subject}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b text-center">
                                        <Link
                                            to="/evaluateteachers"
                                            state={{ userId: teacherId, fallback: user }}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                                        >
                                            <Edit size={16} />
                                            ประเมิน
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && !error && paginated.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center p-4 text-gray-400">
                                    ไม่พบข้อมูล
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="flex flex-wrap justify-center sm:justify-between items-center mt-4 gap-2 text-sm">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                        ก่อนหน้า
                    </button>

                    <div className="flex items-center gap-2">
                        {getPaginationNumbers().map((num, idx) =>
                            num === "..." ? (
                                <span key={idx} className="px-2 text-gray-500">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={idx}
                                    onClick={() => handlePageChange(num)}
                                    className={`px-3 py-1 rounded-lg ${page === num
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    {num}
                                </button>
                            )
                        )}
                    </div>

                    <button
                        onClick={() => handlePageChange(page + 1)}
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
