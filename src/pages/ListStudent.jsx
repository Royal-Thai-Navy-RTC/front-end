import React, { useState, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Edit } from "lucide-react";

export default function ListStudent() {

    // ---------------- MOCK DATA (4 กองพัน × 5 กองร้อย) ----------------
    const mockData = [];
    for (let battalion = 1; battalion <= 4; battalion++) {
        for (let company = 1; company <= 5; company++) {
            mockData.push({
                id: `${battalion}-${company}`,
                battalion,
                company,
            });
        }
    }

    // ---------------- STATES ----------------
    const [activeTab, setActiveTab] = useState("COMPANY");

    const [searchCompany, setSearchCompany] = useState("");
    const [searchBattalion, setSearchBattalion] = useState("");

    const [page, setPage] = useState(1);
    const [users, setUsers] = useState([]);
    const pageSize = 10;

    // ---------------- LOAD MOCK DATA ----------------
    useEffect(() => {
        setUsers(mockData);
    }, []);

    // เปลี่ยน tab ให้ reset หน้า
    const handleChangeTab = (tab) => {
        setActiveTab(tab);
        setPage(1);
    };

    // --------------------- FILTER: กองร้อย (เหมือนเดิม) ---------------------
    const filteredCompany = useMemo(() => {
        return users.filter((u) => {
            const company = u.company.toString().toLowerCase();
            const battalion = u.battalion.toString().toLowerCase();

            return (
                company.includes(searchCompany.toLowerCase()) &&
                battalion.includes(searchBattalion.toLowerCase())
            );
        });
    }, [users, searchCompany, searchBattalion]);

    // --------------------- FILTER: กองพัน (แสดงเฉพาะ 1–4) ---------------------
    // ดึงเฉพาะ list กองพัน ไม่แยกตามกองร้อย (ไม่ให้ซ้ำ)
    const filteredBattalion = useMemo(() => {
        const seen = new Set();
        const result = [];

        users.forEach((u) => {
            if (u.battalion < 1 || u.battalion > 4) return; // กันไว้เผื่ออนาคต

            const key = u.battalion.toString();
            if (seen.has(key)) return;

            // filter ด้วย searchBattalion เท่านั้น
            if (!key.includes(searchBattalion.toLowerCase())) return;

            seen.add(key);
            result.push({
                id: `b-${u.battalion}`,
                battalion: u.battalion,
            });
        });

        return result;
    }, [users, searchBattalion]);

    // --------------------- PAGINATION ---------------------
    const dataForTab = activeTab === "COMPANY" ? filteredCompany : filteredBattalion;

    const totalPages = Math.max(1, Math.ceil(dataForTab.length / pageSize));
    const paginated = dataForTab.slice((page - 1) * pageSize, page * pageSize);

    const handlePageChange = (p) => {
        if (p >= 1 && p <= totalPages) setPage(p);
    };

    return (
        <div className="flex flex-col w-full gap-6">

            {/* HEADER */}
            <section className="bg-white rounded-2xl shadow p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className='flex flex-col'>
                        <h1 className="text-3xl font-bold text-blue-900">ประเมินนักเรียน</h1>
                        <p className="text-sm text-gray-500">
                            {activeTab === "COMPANY"
                                ? "ค้นหาตาม กองร้อย / กองพัน"
                                : "เลือกกองพัน 1 - 4 เพื่อประเมิน"}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">

                        {/* TAB SWITCH */}
                        <div className="flex rounded-xl bg-gray-100 p-1">
                            <button
                                onClick={() => handleChangeTab("COMPANY")}
                                className={`px-4 py-2 text-sm rounded-lg transition
                                    ${activeTab === "COMPANY"
                                        ? "bg-white shadow text-blue-600"
                                        : "text-gray-500 hover:text-blue-600"}`}
                            >
                                กองร้อย
                            </button>
                            <button
                                onClick={() => handleChangeTab("BATTALION")}
                                className={`px-4 py-2 text-sm rounded-lg transition
                                    ${activeTab === "BATTALION"
                                        ? "bg-white shadow text-blue-600"
                                        : "text-gray-500 hover:text-blue-600"}`}
                            >
                                กองพัน
                            </button>
                        </div>

                        {/* SEARCH */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex items-start gap-3 flex-wrap w-full">

                                {/* ช่องค้นหา กองร้อย: แสดงเฉพาะตอนอยู่ tab กองร้อย */}
                                {activeTab === "COMPANY" && (
                                    <input
                                        type="text"
                                        placeholder="กองร้อย..."
                                        value={searchCompany}
                                        onChange={(e) => { setSearchCompany(e.target.value); setPage(1); }}
                                        className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full sm:w-35 md:w-48"
                                    />
                                )}

                                {/* ช่องค้นหา กองพัน: ใช้ได้ทั้งสอง tab แต่ tab กองพันจะใช้ filter แค่ช่องนี้ */}
                                <input
                                    type="text"
                                    placeholder="กองพัน..."
                                    value={searchBattalion}
                                    onChange={(e) => { setSearchBattalion(e.target.value); setPage(1); }}
                                    className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full sm:w-35 md:w-48"
                                />
                            </div>

                            {/* CLEAR BUTTON */}
                            <button
                                onClick={() => {
                                    setSearchCompany("");
                                    setSearchBattalion("");
                                    setPage(1);
                                }}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                            >
                                ล้างการค้นหา
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* TABLE */}
            <section className="bg-white rounded-2xl shadow p-5 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-gray-700">
                    <thead className="bg-blue-50 text-blue-700 font-semibold">
                        <tr>
                            <th className="p-3 border-b text-center">ลำดับ</th>

                            {activeTab === "COMPANY" && (
                                <th className="p-3 border-b text-center">กองร้อย</th>
                            )}

                            <th className="p-3 border-b text-center">กองพัน</th>
                            <th className="p-3 border-b text-center">ประเมิน</th>
                        </tr>
                    </thead>

                    <tbody>
                        {paginated.map((u, index) => (
                            <tr key={u.id} className="hover:bg-blue-50">
                                <td className="p-3 border-b text-center">
                                    {(page - 1) * pageSize + index + 1}
                                </td>

                                {activeTab === "COMPANY" && (
                                    <td className="p-3 border-b text-center">{u.company}</td>
                                )}

                                <td className="p-3 border-b text-center">{u.battalion}</td>

                                <td className="p-3 border-b text-center">
                                    <Link
                                        to="/evaluatestudent"
                                        state={
                                            activeTab === "COMPANY"
                                                ? {
                                                    battalion: u.battalion,
                                                    company: u.company,
                                                }
                                                : {
                                                    battalion: u.battalion,
                                                    // ถ้าหน้า "กองพัน" ไม่ต้องส่ง company หรือจะกำหนดเป็น null ก็ได้
                                                    company: null,
                                                }
                                        }
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        <Edit size={16} />
                                        ประเมิน
                                    </Link>
                                </td>
                            </tr>
                        ))}

                        {paginated.length === 0 && (
                            <tr>
                                <td colSpan={activeTab === "COMPANY" ? 4 : 3} className="text-center p-4 text-gray-400">
                                    ไม่พบข้อมูล
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* PAGINATION */}
                <div className="flex justify-between items-center mt-4 text-sm">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-40"
                    >
                        ก่อนหน้า
                    </button>

                    <span>หน้า {page} / {totalPages}</span>

                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-40"
                    >
                        ถัดไป
                    </button>
                </div>
            </section>
        </div>
    );
}
