import React, { useState, useEffect } from 'react';
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Search } from "lucide-react";

/* -------------------- MAIN COMPONENT -------------------- */
export default function FormEvaluateStudent() {
    const { divisionOptions } = useOutletContext();

    const [listEvaluate, setListEvaluate] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [openForm, setOpenForm] = useState(false);
    const [editTemplate, setEditTemplate] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchKey, setSearchKey] = useState("");

    /** TEMPLATE DEFAULT STRUCTURE */
    const emptyTemplate = {
        id: null,
        name: "",
        description: "",
        type: "company",
        battalionCount: 0,
        teacherCount: 0,
        sections: []
    };

    /* -------- Load templates from API -------- */
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("/api/admin/student-evaluation-templates", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setListEvaluate(response.data?.data || []);
            } catch (err) {
                console.log("Error loading templates", err);
            }
        };
        fetchTemplates();
    }, []);

    const toggleExpand = (id) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    const handleDelete = (id) => {
        const token = localStorage.getItem("token");

        Swal.fire({
            icon: "warning",
            title: "ยืนยันการลบ",
            text: "ต้องการลบแบบฟอร์มนี้หรือไม่?",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
        }).then(async (res) => {
            if (!res.isConfirmed) return;

            try {
                setSaving(true);
                const response = await axios.delete(
                    `/api/admin/student-evaluation-templates/${id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const message = response.data?.message || "ลบสำเร็จ";
                setListEvaluate(prev => prev.filter(item => item.id !== id));

                Swal.fire({ icon: "success", title: message, timer: 2000 });

            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "ลบไม่สำเร็จ",
                    text: error.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
                });
            } finally {
                setSaving(false);
            }
        });
    };

    const openEdit = (template) => {
        setEditTemplate(JSON.parse(JSON.stringify(template)));
        setOpenForm(true);
    };

    /* SAVE TEMPLATE */
    const onSave = async () => {
        const token = localStorage.getItem("token");
        setSaving(true);

        try {
            if (showCreateModal) {
                const response = await axios.post(
                    `/api/admin/student-evaluation-templates`,
                    editTemplate,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const created = response.data?.template;
                setListEvaluate(prev => [...prev, created]);

                Swal.fire({ icon: "success", title: "สร้างแบบฟอร์มสำเร็จ", timer: 2000 });
            } else {
                const response = await axios.put(
                    `/api/admin/student-evaluation-templates/${editTemplate.id}`,
                    editTemplate,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const updated = response.data?.template;

                setListEvaluate(prev =>
                    prev.map(item => item.id === updated.id ? updated : item)
                );

                Swal.fire({ icon: "success", title: "บันทึกการแก้ไขสำเร็จ", timer: 2000 });
            }

            setOpenForm(false);
            setShowCreateModal(false);
            setEditTemplate(null);

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "บันทึกไม่สำเร็จ",
                text: error.response?.data?.message || "กรุณาลองใหม่อีกครั้ง",
            });
        }

        setSaving(false);
    };

    return (
        <div className="w-full flex flex-col gap-6">
            {/* --- HEADER --- */}
            <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
                <p className="text-sm text-gray-500">Evaluation Form Manager</p>
                <h1 className="text-3xl font-bold text-blue-900">ระบบจัดการแบบฟอร์มประเมิน</h1>
                <p className="text-gray-600 text-sm">สร้าง จัดการ และแก้ไขแบบฟอร์มการประเมิน</p>
            </header>

            {/* --- LIST TEMPLATE --- */}
            <section className="bg-white rounded-2xl p-5 shadow flex flex-col">

                {/* Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between">
                    <h2 className="text-xl font-bold text-blue-900">จัดการแบบฟอร์มประเมิน</h2>

                    <button
                        onClick={() => {
                            setEditTemplate(JSON.parse(JSON.stringify(emptyTemplate)));
                            setShowCreateModal(true);
                            setOpenForm(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 m-3 sm:m-0 w-full sm:w-fit"
                    >
                        + เพิ่มฟอร์มใหม่
                    </button>
                </div>

                {/* Search Input */}
                <div className="flex flex-col gap-2 mb-5">
                    <label className="text-sm text-gray-600">เลือกแบบฟอร์มที่ต้องการจัดการ</label>
                    <div className="relative">
                        <input
                            className="border border-gray-400 rounded-lg p-2 pr-10 w-full text-gray-700"
                            placeholder="ชื่อแบบฟอร์ม..."
                            value={searchKey}
                            onChange={(e) => setSearchKey(e.target.value)}
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                </div>

                {/* LIST */}
                {listEvaluate
                    .filter(v => v.name.toLowerCase().includes(searchKey.toLowerCase()))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map(v => (
                        <div
                            key={v.id}
                            className="border border-gray-400 rounded-xl p-4 bg-white mb-5 hover:bg-gray-100 flex flex-col gap-3"
                        >
                            {/* HEADER */}
                            <div
                                className="flex flex-col sm:flex-row gap-3 sm:justify-between items-center cursor-pointer"
                                onClick={() => toggleExpand(v.id)}
                            >
                                <div className="flex flex-col w-full">
                                    <h3 className="text-xl sm:text-2xl font-bold text-blue-800">{v.name}</h3>
                                    <p className="text-gray-600 text-sm">{v.description}</p>
                                    <p className="text-xs text-blue-700 font-semibold">
                                        ประเภทฟอร์ม: {v.type === "company" ? "ประเมินกองร้อย" : "ประเมินกองพัน"}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 min-w-fit">
                                    <ChevronDownIcon open={expandedId === v.id} />

                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                                    >
                                        แก้ไขฟอร์ม
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        ลบฟอร์ม
                                    </button>
                                </div>
                            </div>

                            {/* DETAILS */}
                            <div className={`overflow-hidden transition-all duration-300 ${expandedId === v.id ? "max-h-[2000px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"}`}>
                                <div className="border-t pt-3 border-gray-400">

                                    {/* IF BATTALION */}
                                    {v.type === "battalion" && (
                                        <div className="mb-4 text-sm text-gray-700">
                                            {/* <p>หัวข้อหมวด: {v.categoryTitle}</p> */}
                                            <p>จำนวนกองพัน: {v.battalionCount}</p>
                                            <p>จำนวนครูผู้ประเมิน: {v.teacherCount}</p>
                                            {/* <p>คะแนนเต็มของหมวด: {v.sectionMaxScore}</p> */}
                                        </div>
                                    )}

                                    {/* SECTIONS */}
                                    {v.sections
                                        .sort((a, b) => a.sectionOrder - b.sectionOrder)
                                        .map(section => (
                                            <div key={section.id} className="mb-3">
                                                <p className="font-bold text-blue-700">
                                                    {section.sectionOrder}. {section.title}
                                                </p>

                                                {v.type === "company" ? (
                                                    <ul className="pl-6 text-sm text-gray-700 list-decimal flex flex-col gap-1">
                                                        {section.questions.map((q, i) => (
                                                            <li key={i} className="flex flex-col sm:flex-row sm:justify-between">
                                                                <p>{q.prompt}</p>
                                                                <span className="text-blue-700 text-xs w-1/2 text-start font-semibold">
                                                                    คะแนนเต็ม {q.maxScore}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-gray-700 ml-6">
                                                        คะแนนเต็มหมวด: {section.maxScore}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ))}
            </section>

            {/* MODAL */}
            {openForm && editTemplate && (
                <ModalEditForm
                    template={editTemplate}
                    setTemplate={setEditTemplate}
                    onClose={() => {
                        setShowCreateModal(false);
                        setOpenForm(false);
                        setEditTemplate(null);
                    }}
                    onSave={onSave}
                    saving={saving}
                />
            )}
        </div>
    );
}

/* -------------------- ICON -------------------- */
function ChevronDownIcon({ open }) {
    return (
        <svg className={`w-6 h-6 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

/* -------------------- MODAL -------------------- */
function ModalEditForm({ template, setTemplate, onClose, onSave, saving }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm text-blue-500 font-semibold">แก้ไขแบบฟอร์มประเมิน</p>
                        <h3 className="sm:text-2xl text-lg font-semibold text-gray-900">{template.name}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-semibold">
                        ✕
                    </button>
                </div>

                <FormEvaluate template={template} setTemplate={setTemplate} />

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50">
                        ยกเลิก
                    </button>
                    <button
                        onClick={onSave}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                        disabled={saving}
                    >
                        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------- FORM COMPONENT -------------------- */
function FormEvaluate({ template, setTemplate }) {
    const [openSections, setOpenSections] = useState(
        template.sections.map(() => true)
    );

    const toggleSection = (idx) => {
        setOpenSections(prev => {
            const updated = [...prev];
            updated[idx] = !updated[idx];
            return updated;
        });
    };

    const updateField = (key, value) => {
        setTemplate(prev => {
            if (key === "type") {

                // เปลี่ยนเป็น กองร้อย → ต้องเพิ่ม questions
                if (value === "company") {
                    const newSections = prev.sections.map(sec => ({
                        ...sec,
                        questions: sec.questions ?? []
                    }));

                    return {
                        ...prev,
                        type: value,
                        sections: newSections
                    };
                }

                // เปลี่ยนเป็น กองพัน → ไม่มี questions, ไม่มี maxScore
                if (value === "battalion") {
                    const newSections = prev.sections.map(sec => ({
                        id: sec.id,
                        sectionOrder: sec.sectionOrder,
                        title: sec.title
                    }));

                    return {
                        ...prev,
                        type: value,
                        sections: newSections
                    };
                }
            }

            return { ...prev, [key]: value };
        });
    };



    /* SECTION EDIT */
    const updateSectionTitle = (idx, value) => {
        const newSections = [...template.sections];
        newSections[idx].title = value;
        setTemplate({ ...template, sections: newSections });
    };

    const addSection = () => {
        const newSection = {
            id: Date.now(),
            sectionOrder: template.sections.length + 1,
            title: "",
            maxScore: template.type === "battalion" ? template.sectionMaxScore : undefined,
            questions: template.type === "company" ? [] : undefined
        };

        setTemplate(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));

        setOpenSections(prev => [...prev, true]);
    };

    const removeSection = (idx) => {
        const updated = template.sections.filter((_, i) => i !== idx);
        updated.forEach((s, i) => { s.sectionOrder = i + 1 });

        setTemplate(prev => ({ ...prev, sections: updated }));
        setOpenSections(prev => prev.filter((_, i) => i !== idx));
    };

    /* ADD QUESTION (Only company) */
    const addQuestion = (sIdx) => {
        if (template.type !== "company") return;

        const newSections = [...template.sections];
        newSections[sIdx].questions.push({
            id: Date.now(),
            prompt: "",
            maxScore: 1
        });

        setTemplate({ ...template, sections: newSections });
    };

    const removeQuestion = (sIdx, qIdx) => {
        const newSections = [...template.sections];
        newSections[sIdx].questions = newSections[sIdx].questions.filter((_, i) => i !== qIdx);
        setTemplate({ ...template, sections: newSections });
    };

    return (
        <div className="space-y-6">

            {/* Type */}
            <label className="flex flex-col text-sm">
                <span>ประเภทฟอร์ม</span>
                <select
                    className="border rounded-xl px-3 py-2"
                    value={template.type}
                    onChange={(e) => updateField("type", e.target.value)}
                >
                    <option value="company">ประเมินกองร้อย</option>
                    <option value="battalion">ประเมินกองพัน</option>
                </select>
            </label>

            {/* Name / Description */}
            <div className="grid grid-cols-1 gap-4">
                <label className="flex flex-col text-sm">
                    <span>ชื่อแบบฟอร์ม</span>
                    <input
                        className="border rounded-xl px-3 py-2"
                        value={template.name ?? ""}
                        onChange={(e) => updateField("name", e.target.value)}
                    />
                </label>

                <label className="flex flex-col text-sm">
                    <span>คำอธิบาย</span>
                    <input
                        className="border rounded-xl px-3 py-2"
                        value={template.description ?? ""}  
                        onChange={(e) => updateField("description", e.target.value)}
                    />
                </label>
            </div>

            {/* ONLY BATTALION */}
            {template.type === "battalion" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* <label className="flex flex-col text-sm">
                        <span>หัวข้อหมวด</span>
                        <input
                            className="border rounded-xl px-3 py-2"
                            value={template.categoryTitle}
                            onChange={(e) => updateField("categoryTitle", e.target.value)}
                        />
                    </label> */}

                    <label className="flex flex-col text-sm">
                        <span>จำนวนกองพันที่ต้องการประเมิน</span>
                        <input
                            type="number"
                            min={1}
                            className="border rounded-xl px-3 py-2"
                            value={template.battalionCount ?? 0}
                            onChange={(e) => updateField("battalionCount", Number(e.target.value))}
                        />
                    </label>

                    <label className="flex flex-col text-sm">
                        <span>จำนวนครูผู้ประเมิน</span>
                        <input
                            type="number"
                            min={1}
                            className="border rounded-xl px-3 py-2"
                            value={template.teacherCount ?? 0}
                            onChange={(e) => updateField("teacherCount", Number(e.target.value))}
                        />
                    </label>
                </div>
            )}

            {/* Add Section */}
            <div className="w-full flex justify-start">
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    onClick={addSection}
                >
                    + เพิ่มหมวด (Section)
                </button>
            </div>

            {/* Sections */}
            <div className="space-y-6">
                {template.sections.map((sec, sIdx) => (
                    <div key={sec.id} className="border border-gray-400 rounded-xl p-4">

                        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center mb-2">
                            <h4 className="font-bold sm:text-xl text-blue-700">
                                หมวดที่ {sec.sectionOrder} : {sec.title}
                            </h4>

                            <div className="flex gap-3 items-center">
                                <button
                                    onClick={() => toggleSection(sIdx)}
                                    className="rounded-lg hover:bg-gray-200 cursor-pointer text-sm px-4 py-1 bg-gray-300 text-gray-800"
                                >
                                    {openSections[sIdx] ? "ย่อ ▲" : "ขยาย ▼"}
                                </button>

                                <button
                                    className="rounded-lg hover:bg-red-400 cursor-pointer text-sm px-4 py-1 bg-red-500 text-white"
                                    onClick={() => removeSection(sIdx)}
                                >
                                    ลบ
                                </button>
                            </div>
                        </div>

                        {/* SECTION BODY */}
                        <div className={`${openSections[sIdx] ? "block" : "hidden"} text-gray-800`}>

                            {/* SECTION TITLE */}
                            <label className="flex flex-col text-sm mb-3">
                                <span>ชื่อหมวด</span>
                                <input
                                    className="border border-gray-400 rounded-lg px-3 py-2"
                                    value={sec.title}
                                    onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                                />
                            </label>

                            {/* IF BATTALION → SHOW ONLY MAX SCORE */}
                            {template.type === "battalion" ? (
                                <label className="flex flex-col text-sm">
                                    <span>คะแนนเต็มของหมวด</span>
                                    <input
                                        type="number"
                                        min={1}
                                        className="border border-gray-400 rounded-lg px-3 py-2"
                                        value={sec.maxScore}
                                        onChange={(e) => {
                                            const newSections = [...template.sections];
                                            newSections[sIdx].maxScore = Number(e.target.value);
                                            setTemplate({ ...template, sections: newSections });
                                        }}
                                    />
                                </label>
                            ) : (
                                /* COMPANY QUESTIONS UI */
                                <div className="space-y-3">
                                    {sec.questions.map((q, qIdx) => (
                                        <div
                                            key={q.id}
                                            className="flex flex-col gap-2 border border-gray-400 p-3 rounded-lg bg-white"
                                        >
                                            <div className="flex justify-between">
                                                <label className="text-sm">คำถาม</label>
                                                <button
                                                    className="text-sm rounded-lg cursor-pointer px-4 py-1 text-red-500 underline hover:no-underline"
                                                    onClick={() => removeQuestion(sIdx, qIdx)}
                                                >
                                                    ลบ
                                                </button>
                                            </div>

                                            <input
                                                className="border border-gray-400 rounded-xl px-3 py-2 text-sm"
                                                value={q.prompt}
                                                onChange={(e) => {
                                                    const newSections = [...template.sections];
                                                    newSections[sIdx].questions[qIdx].prompt = e.target.value;
                                                    setTemplate({ ...template, sections: newSections });
                                                }}
                                            />

                                            <label className="flex items-center gap-2">
                                                <p className="text-sm">คะแนนเต็ม</p>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    className="border border-gray-400 rounded-lg py-1 px-2 text-center"
                                                    value={q.maxScore}
                                                    onChange={(e) => {
                                                        const newSections = [...template.sections];
                                                        newSections[sIdx].questions[qIdx].maxScore = Number(e.target.value);
                                                        setTemplate({ ...template, sections: newSections });
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    ))}

                                    <button
                                        className="px-3 py-1 bg-green-500 text-white rounded-lg mt-3 hover:bg-green-600 cursor-pointer"
                                        onClick={() => addQuestion(sIdx)}
                                    >
                                        + เพิ่มคำถาม (Question)
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
