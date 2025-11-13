import React, { useState, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Edit, Search } from "lucide-react";
import axios from "axios";

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
            const subject = (user.subject || user.department || "").toLowerCase();
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
        <div className="flex flex-col w-full gap-6">
            <section className="bg-white rounded-2xl shadow p-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="text-sm text-gray-500">รายชื่อครูผู้สอน</p>
                        <h1 className="text-3xl font-bold text-blue-900">Teacher Directory</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex flex-1 items-center border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-200 transition">
                            <Search className="text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อหรือวิชา..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="px-2 py-1 flex-1 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setSearch("")}
                            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                        >
                            ล้างการค้นหา
                        </button>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow p-5 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-gray-700">
                    <thead className="bg-blue-50 text-blue-700 font-semibold">
                        <tr>
                            <th className="p-3 border-b text-center w-16">ลำดับ</th>
                            <th className="p-3 border-b">ชื่อ-นามสกุล</th>
                            <th className="p-3 border-b">วิชาที่รับผิดชอบ / หน่วย</th>
                            <th className="p-3 border-b text-center">แบบประเมิน</th>
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
                            const subject = user.subject || user.department || "-";
                            const teacherId = user.id ?? user._id ?? null;
                            return (
                                <tr key={user.id ?? `${user.username}-${i}`} className="hover:bg-blue-50 transition">
                                    <td className="p-3 border-b text-center font-semibold text-gray-500">{(page - 1) * pageSize + i + 1}</td>
                                    <td className="p-3 border-b">
                                        <p className="font-semibold text-gray-900">{fullName}</p>
                                        <p className="text-xs text-gray-500">Username: {user.username || "-"}</p>
                                    </td>
                                    <td className="p-3 border-b">
                                        <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-sm text-blue-700">
                                            {subject}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b text-center">
                                        <Link
                                            to="/evaluateteachers"
                                            state={{ userId: teacherId, fallback: user }}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
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
