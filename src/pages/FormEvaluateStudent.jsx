import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useOutletContext } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Users, RefreshCw, Search, Pencil, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import navy from "../assets/navy.png";

export default function FormEvaluateStudent() {
    const { divisionOptions } = useOutletContext();
    const [templates, setTemplates] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState("");
    const selectedForm = useMemo(
        () => templates.find((f) => f.id === selectedFormId),
        [selectedFormId, templates]
    );

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const handleDelete = (id) => {
        Swal.fire({
            icon: "warning",
            title: "ยืนยันการลบ",
            text: "ต้องการลบแบบฟอร์มนี้หรือไม่?",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
        }).then((res) => {
            if (res.isConfirmed) {
                setTemplates((prev) => prev.filter((t) => t.id !== id));
                setSelectedFormId("");
                Swal.fire("ลบสำเร็จ", "", "success");
            }
        });
    };

    return (
        <div className="w-full flex flex-col gap-6">
            <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Evaluation Form Manager</p>
                        <h1 className="text-3xl font-bold text-blue-900">ระบบจัดการแบบฟอร์มประเมิน</h1>
                    </div>
                </div>
                <p className="text-gray-600 text-sm">
                    สร้าง จัดการ และแก้ไขแบบฟอร์มการประเมิน
                </p>
            </header>

            {/* Manage */}
            <section className="bg-white rounded-2xl p-5 shadow flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-blue-900">จัดการแบบฟอร์มประเมิน</h2>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        + เพิ่มฟอร์มใหม่
                    </button>
                </div>

                {/* Dropdown เลือกฟอร์มที่มีอยู่แล้ว */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-600">เลือกแบบฟอร์มที่ต้องการจัดการ</label>
                    <select
                        value={selectedFormId}
                        onChange={(e) => setSelectedFormId(Number(e.target.value))}
                        className="border rounded-lg p-2"
                    >
                        <option value="">-- เลือกแบบฟอร์ม --</option>
                        {templates.map((form) => (
                            <option key={form.id} value={form.id}>
                                {form.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* แสดงรายละเอียดฟอร์ม */}
                {selectedForm && (
                    <div className="border rounded-xl p-4 bg-gray-50 flex flex-col gap-3">

                        <h3 className="text-lg font-bold text-blue-800">{selectedForm.name}</h3>
                        <p className="text-gray-600 text-sm">{selectedForm.description}</p>

                        <div className="flex items-center gap-3 mt-2">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                            >
                                แก้ไขฟอร์ม
                            </button>
                            <button
                                onClick={() => handleDelete(selectedForm.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                ลบฟอร์ม
                            </button>
                        </div>

                        {/* รายละเอียดหมวดคำถาม */}
                        <div className="mt-4">
                            <h4 className="font-semibold text-gray-700">หมวดคำถามทั้งหมด</h4>
                            <ul className="list-disc pl-6 text-sm text-gray-700">
                                {selectedForm.sections
                                    .sort((a, b) => a.sectionOrder - b.sectionOrder)
                                    .map((section) => (
                                        <li key={section.id}>
                                            {section.sectionOrder}. {section.title} ({section.questions.length} คำถาม)
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                )}

            </section>

        </div>
    )
}
