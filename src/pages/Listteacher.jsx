import React, { useState, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Eye, Edit, Star } from "lucide-react";

export default function Listteacher() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // ตัวอย่างข้อมูล mock (20 คน)
    const data = useMemo(
        () =>
            Array.from({ length: 50 }, (_, i) => ({
                id: i + 1,
                name: `ครูหมายเลข ${i + 1}`,
                subject: ["เงื่อน", "กรรเชียง", "ปืน", "แผนที่", "สังคม"][i % 5],
                phone: `081-${String(i + 1).padStart(7, "0")}`,
            })),
        []
    );

    // filter
    const filtered = data.filter(
        (d) =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.subject.toLowerCase().includes(search.toLowerCase())
    );

    // pagination logic
    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handlePageChange = (p) => {
        if (p >= 1 && p <= totalPages) setPage(p);
    };

    // ฟังก์ชันสร้าง pagination แบบ dynamic (มี ... ตัดหน้า)
    const getPaginationNumbers = () => {
        const delta = 2; // จำนวนเพจรอบๆหน้าปัจจุบัน
        const range = [];
        const rangeWithDots = [];
        let l;

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
        <>
            {/* Filter Section */}
            <div className="bg-white rounded-xl p-4 shadow w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xl sm:text-2xl text-blue-700 font-bold border-b-2 sm:border-0 border-gray-300 pb-1">
                        ครูผู้สอน
                    </p>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="ค้นหาชื่อหรือวิชา..." value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="border border-b-gray-600 rounded-lg px-3 py-2 text-base w-full sm:w-64 focus:outline-none focus:ring focus:ring-blue-200"
                        />
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onClick={() => setSearch("")} >
                            ค้นหา
                        </button>
                    </div>
                </div>
            </div>

            {/* 📋 Table Section */}
            <div className="bg-white rounded-xl p-4 mt-6 shadow w-full overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-gray-700">
                    <thead className="bg-blue-50 text-blue-700 font-semibold">
                        <tr>
                            <th className="p-3 border-b text-center">ลำดับ</th>
                            <th className="p-3 border-b text-center">ชื่อ-นามสกุล</th>
                            <th className="p-3 border-b text-center">วิชา</th>
                            <th className="p-3 border-b text-center">ประเมิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((d, i) => (
                            <tr key={d.id} className="hover:bg-blue-50">
                                <td className="p-3 border-b text-center">{(page - 1) * pageSize + i + 1}</td>
                                <td className="p-3 border-b text-center">{d.name}</td>
                                <td className="p-3 border-b text-center">{d.subject}</td>
                                <td className="p-3 border-b text-center">
                                    <Link to="/evaluateteachers" state={d} className='flex items-center justify-center text-white p-2 border-blue-900 cursor-pointer hover:opacity-30'>
                                        <Edit className="size-5 text-yellow-500 " />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {paginated.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center p-4 text-gray-400">
                                    ไม่พบข้อมูล
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* 🔢 Pagination */}
                <div className="flex flex-wrap justify-center sm:justify-end items-center mt-4 gap-2 text-sm">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-blue-50"
                    >
                        ก่อนหน้า
                    </button>

                    {getPaginationNumbers().map((num, idx) =>
                        num === "..." ? (
                            <span key={idx} className="px-2">
                                ...
                            </span>
                        ) : (
                            <button
                                key={idx}
                                onClick={() => handlePageChange(num)}
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
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-blue-50"
                    >
                        ถัดไป
                    </button>
                </div>
            </div>
        </>
    );
}
