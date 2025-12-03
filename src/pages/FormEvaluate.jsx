import React, { useState, useEffect } from 'react';
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Search } from "lucide-react";

const reorderQuestionIds = (sections) => {
    return sections.map(sec => ({
        ...sec,
        questions: sec.questions.map((q, idx) => ({
            ...q,
            id: idx + 1
        }))
    }));
};

/* -------------------- MAIN COMPONENT -------------------- */
export default function FormEvaluate() {
    // const { divisionOptions } = useOutletContext();

    const [listEvaluate, setListEvaluate] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [openForm, setOpenForm] = useState(false);
    const [editTemplate, setEditTemplate] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchType, setSearchType] = useState("");
    const [searchKey, setSearchKey] = useState("");


    /** TEMPLATE DEFAULT STRUCTURE */
    const emptyTemplate = {
        id: null,
        name: "",
        description: "",
        templateType: "SERVICE",
        battalionCount: "",
        teacherEvaluatorCount: "",
        sections: [],
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
                // console.log("Error loading templates", err);
            }
        };
        fetchTemplates();

        const fetchTeachers = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("/api/admin/users?role=TEACHER", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const payload = response.data?.data ?? response.data;
                setTeachers(Array.isArray(payload) ? payload : payload?.items || []);
            } catch (err) {
                console.error("failed to load teachers", err);
            }
        };
        fetchTeachers();
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
        const cleanTemplate = {
            ...template,
            sections: reorderQuestionIds(template.sections)
        };

        setEditTemplate(JSON.parse(JSON.stringify(cleanTemplate)));
        setOpenForm(true);
    };

    const buildTemplatePayload = (template) => {
        const sanitizedSections = Array.isArray(template.sections)
            ? template.sections.map((sec, sIdx) => ({
                ...sec,
                sectionOrder: sec.sectionOrder ?? sIdx + 1,
                questions: Array.isArray(sec.questions)
                    ? sec.questions.map((q, qIdx) => ({
                        ...q,
                        id: q.id ?? qIdx + 1,
                        questionOrder: q.questionOrder ?? qIdx + 1,
                        prompt: q.prompt || "",
                        maxScore: Number(q.maxScore) || 0,
                    }))
                    : [],
            }))
            : [];

        const battalionCount = 4; // fixed value
        const teacherEvaluatorCount = Number(template.teacherEvaluatorCount);

        if (template.templateType === "BATTALION") {
            if (!Number.isFinite(teacherEvaluatorCount) || teacherEvaluatorCount < 1) {
                Swal.fire({ icon: "warning", title: "Please enter teacher evaluator count (at least 1)." });
                return null;
            }
        }

        const payload = {
            id: template.id ?? null,
            name: (template.name || "").trim(),
            description: (template.description || "").trim(),
            templateType: template.templateType || "SERVICE",
            battalionCount: template.templateType === "BATTALION" ? 4 : undefined,
            teacherEvaluatorCount: template.templateType === "BATTALION" ? teacherEvaluatorCount : undefined,
            sections: sanitizedSections,
        };

        if (!payload.name) {
            Swal.fire({ icon: "warning", title: "กรุณาระบุชื่อแบบฟอร์ม" });
            return null;
        }
        if (!payload.sections.length) {
            Swal.fire({ icon: "warning", title: "กรุณาเพิ่มหมวด (Section) อย่างน้อย 1 หมวด" });
            return null;
        }
        return payload;
    };

    /* SAVE TEMPLATE */
    const onSave = async () => {
        const token = localStorage.getItem("token");
        setSaving(true);

        try {
            const payload = buildTemplatePayload(editTemplate);
            if (!payload) {
                setSaving(false);
                return;
            }
            if (showCreateModal) {
                const response = await axios.post(
                    `/api/admin/student-evaluation-templates`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const created = response.data?.template;
                setListEvaluate(prev => [...prev, created]);

                Swal.fire({ icon: "success", title: "สร้างแบบฟอร์มสำเร็จ", timer: 2000 });
            } else {
                const response = await axios.put(
                    `/api/admin/student-evaluation-templates/${editTemplate.id}`,
                    payload,
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

    const filteredTemplates = listEvaluate
        .filter(v => {
            const matchName = (v.name || "").toLowerCase().includes(searchKey.toLowerCase());
            const matchType = searchType ? v.templateType === searchType : true;
            return matchName && matchType;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stats = {
        total: listEvaluate.length,
        battalion: listEvaluate.filter(t => t.templateType === "BATTALION").length,
        company: listEvaluate.filter(t => t.templateType === "COMPANY").length,
        service: listEvaluate.filter(t => t.templateType === "SERVICE").length,
    };

    return (
        <div className="w-full flex flex-col gap-6">
            <section className="rounded-3xl overflow-hidden shadow bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-700 text-white">
                <div className="p-6 sm:p-8 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-white/70 font-semibold">Form Evaluate</p>
                            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">จัดการแบบฟอร์มประเมิน</h1>
                            <p className="text-sm text-white/80 max-w-2xl">
                                สร้างและแก้ไขเทมเพลตการประเมิน เลือกประเภทฟอร์ม เพิ่มคำถามและหมวดหมู่ได้ทันที
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setEditTemplate(JSON.parse(JSON.stringify(emptyTemplate)));
                                setShowCreateModal(true);
                                setOpenForm(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-white text-blue-900 font-semibold shadow hover:shadow-lg transition"
                        >
                            + สร้างฟอร์มใหม่
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm font-semibold">
                        <StatBadge label="ทั้งหมด" value={stats.total} />
                        <StatBadge label="กองพัน" value={stats.battalion} />
                        <StatBadge label="กองร้อย" value={stats.company} />
                        <StatBadge label="ราชการ" value={stats.service} />
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4 border border-slate-100">
                <div className="grid md:grid-cols-[1fr_1.5fr] gap-3 items-center">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-slate-800">ค้นหาแบบฟอร์ม</p>
                        <p className="text-xs text-slate-500">เลือกประเภทหรือค้นหาด้วยชื่อเพื่อเจอฟอร์มที่ต้องการ</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select
                            className="border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-48"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="">ทุกประเภท</option>
                            <option value="BATTALION">กองพัน</option>
                            <option value="COMPANY">กองร้อย</option>
                            <option value="SERVICE">ราชการ</option>
                        </select>
                        <div className="relative w-full">
                            <input
                                className="border border-gray-200 rounded-xl px-3 py-2 w-full pr-10"
                                placeholder="พิมพ์ชื่อฟอร์ม..."
                                value={searchKey}
                                onChange={(e) => setSearchKey(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4">
                {filteredTemplates.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                        ไม่พบแบบฟอร์มที่ตรงกับการค้นหา
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    {filteredTemplates.map(v => (
                        <div
                            key={v.id}
                            className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition p-4 flex flex-col gap-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                        <TypeChip type={v.templateType} />
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-500">สร้างเมื่อ {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "-"}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-blue-900">{v.name}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">{v.description || "ไม่มีคำอธิบาย"}</p>
                                </div>
                                <div className="flex items-center gap-2 min-w-fit">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                                        className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-semibold hover:bg-amber-200"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200"
                                    >
                                        ลบ
                                    </button>
                                    <button
                                        onClick={() => toggleExpand(v.id)}
                                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    >
                                        <ChevronDownIcon open={expandedId === v.id} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs font-semibold text-blue-700">
                                <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100">
                                    Sections {v.sections?.length || 0}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100">
                                    Questions {v.sections?.reduce((s, sec) => s + (sec.questions?.length || 0), 0)}
                                </span>
                                {v.templateType === "BATTALION" && (
                                    <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100">
                                        ผู้ประเมิน {v.teacherEvaluatorCount || 0} คน
                                    </span>
                                )}
                            </div>

                            <div className={`overflow-hidden transition-all duration-300 ${expandedId === v.id ? "max-h-[2000px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"}`}>

                                {/* IF BATTALION */}
                                {v.templateType === "BATTALION" ? (
                                    <div className="border-t pt-3 border-gray-200 space-y-3">
                                        {v.sections
                                            .sort((a, b) => a.sectionOrder - b.sectionOrder)
                                            .map(section => (
                                                <div key={section.id} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                                                    <p className="font-bold text-blue-800 mb-2">
                                                        {section.sectionOrder}. {section.title}
                                                    </p>
                                                    <ul className="pl-5 text-sm text-gray-700 list-disc space-y-1">
                                                        {section.questions.map((q, i) => (
                                                            <li key={i} className="flex justify-between gap-3">
                                                                <span className="font-semibold text-blue-800">{q.prompt}</span>
                                                                <span className="text-xs text-blue-700 font-semibold">คะแนนเต็ม {q.maxScore}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="border-t pt-3 border-gray-200 space-y-3">
                                        {v.sections
                                            .sort((a, b) => a.sectionOrder - b.sectionOrder)
                                            .map(section => (
                                                <div key={section.id} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                                                    <p className="font-bold text-blue-800 mb-2">
                                                        {section.sectionOrder}. {section.title}
                                                    </p>
                                                    <ul className="pl-5 text-sm text-gray-700 list-disc space-y-1">
                                                        {section.questions.map((q, i) => (
                                                            <li key={i} className="flex justify-between gap-3">
                                                                <span>{q.prompt}</span>
                                                                <span className="text-xs text-blue-700 font-semibold">คะแนนเต็ม {q.maxScore}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                    </div>
                                )
                                }
                            </div>
                        </div>
                    ))}
                </div>
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
                    teachers={teachers}
                />
            )}
        </div>
    );
}

/* -------------------- SMALL COMPONENTS -------------------- */
const typeLabelMap = {
    BATTALION: "กองพัน",
    COMPANY: "กองร้อย",
    SERVICE: "ราชการ",
};

function TypeChip({ type }) {
    const label = typeLabelMap[type] || "ไม่ระบุ";
    return (
        <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            {label}
        </span>
    );
}

function StatBadge({ label, value }) {
    return (
        <div className="rounded-2xl bg-white/10 border border-white/30 backdrop-blur px-3 py-2 flex flex-col">
            <span className="text-xs text-white/80">{label}</span>
            <span className="text-xl font-bold">{value}</span>
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
function ModalEditForm({ template, setTemplate, onClose, onSave, saving, teachers }) {
    const sectionCount = Array.isArray(template?.sections) ? template.sections.length : 0;
    const questionCount = Array.isArray(template?.sections)
        ? template.sections.reduce((sum, sec) => sum + (sec.questions?.length || 0), 0)
        : 0;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl shadow-2xl border border-blue-100 bg-white/95">
                <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-sky-700 text-white px-6 py-5 flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-white/80 font-semibold">Evaluation form builder</p>
                        <h3 className="text-2xl sm:text-3xl font-semibold leading-tight">
                            {template.name?.trim() || "ชื่อแบบฟอร์ม"}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs text-white/85">
                            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25">
                                Type: {(template.templateType || "SERVICE").toUpperCase()}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                                Sections: {sectionCount}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                                Questions: {questionCount}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-white/40 bg-white/10 text-white hover:bg-white/20 transition"
                        >
                            Close
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="px-5 py-2 rounded-xl bg-white text-blue-900 font-semibold shadow-lg hover:shadow-xl disabled:opacity-60 transition"
                        >
                            {saving ? "Saving..." : "Save form"}
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[2fr_1fr] gap-4 p-6 overflow-y-auto max-h-[calc(92vh-110px)] bg-gradient-to-br from-white via-white to-slate-50">
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
                        <BuildFormEvaluate template={template} setTemplate={setTemplate} teachers={teachers} />
                    </div>
                    <aside className="bg-gradient-to-b from-slate-50 to-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-800">รายการตรวจสอบ</p>
                        <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                            <li>กรอกชื่อและคำอธิบายแบบฟอร์ม</li>
                            <li>เพิ่มหมวด (Section) อย่างน้อย 1 หมวด พร้อมกำหนดคะแนนคำถาม</li>
                            <li>ถ้าเป็นฟอร์มกองพัน ให้กรอกจำนวนกองพันและจำนวนผู้ประเมิน</li>
                        </ul>
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 space-y-1">
                            <p className="font-semibold">Progress</p>
                            <p>Sections ready: {sectionCount}</p>
                            <p>Questions ready: {questionCount}</p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

/* -------------------- FORM COMPONENT -------------------- */
function BuildFormEvaluate({ template, setTemplate }) {
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
            if (key === "templateType") {
                if (value === "COMPANY" || value === "SERVICE") {
                    const newSections = prev.sections.map(sec => ({
                        ...sec,
                        questions: Array.isArray(sec.questions) ? sec.questions : []
                    }));

                    return {
                        ...prev,
                        templateType: value,
                        sections: newSections
                    };
                }

                // BATTALION → ไม่มี questions
                if (value === "BATTALION") {
                    const newSections = prev.sections.map(sec => ({
                        ...sec,
                        questions: sec.questions?.length
                            ? sec.questions
                            : [{ id: Date.now(), prompt: sec.title || "", maxScore: sec.maxScore ?? 1 }]
                    }));

                    return {
                        ...prev,
                        templateType: value,
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
            questions:
                template.templateType === "BATTALION"
                    ? [{ id: Date.now(), prompt: "", maxScore: 1 }]
                    : [],
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

    /* ADD QUESTION (Only COMPANY) */
    const addQuestion = (sIdx) => {
        if (template.templateType === "BATTALION") return;

        const newSections = [...template.sections];

        newSections[sIdx].questions.push({
            id: newSections[sIdx].questions.length + 1,
            prompt: "",
            maxScore: 1
        });

        setTemplate({
            ...template,
            sections: reorderQuestionIds(newSections)
        });
    };

    const removeQuestion = (sIdx, qIdx) => {
        const newSections = [...template.sections];
        newSections[sIdx].questions = newSections[sIdx].questions.filter((_, i) => i !== qIdx);
        setTemplate({
            ...template,
            sections: reorderQuestionIds(newSections)
        });
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 shadow-sm flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-900">
                <span className="px-3 py-1 rounded-full bg-white border border-blue-100 shadow-sm">
                    {template.templateType === "BATTALION"
                        ? "กองพัน"
                        : template.templateType === "SERVICE"
                            ? "ราชการ"
                            : "กองร้อย"}
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-blue-100 shadow-sm">
                    Sections: {template.sections.length}
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-blue-100 shadow-sm">
                    Questions: {template.sections.reduce((s, sec) => s + (sec.questions?.length || 0), 0)}
                </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">ประเภทแบบฟอร์ม</p>
                    {template.id == null ? (
                        <select
                            className="border rounded-xl px-3 py-2 w-full"
                            value={template.templateType}
                            onChange={(e) => updateField("templateType", e.target.value)}
                            disabled={template.id !== null}
                        >
                            <option value="COMPANY">ประเมินกองร้อย</option>
                            <option value="BATTALION">ประเมินกองพัน</option>
                            <option value="SERVICE">ประเมินข้าราชการ</option>
                        </select>
                    ) : (
                        <div className="flex gap-2 items-center font-semibold text-blue-800">
                            <span className="text-slate-600">แบบฟอร์มประเมิน</span>
                            <span>
                                {template.templateType === "BATTALION"
                                    ? "กองพัน"
                                    : template.templateType === "SERVICE"
                                        ? "ข้าราชการ"
                                        : "กองร้อย"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
                    <label className="flex flex-col text-sm gap-1">
                        <span className="text-slate-700">ชื่อแบบฟอร์ม</span>
                        <input
                            className="border rounded-xl px-3 py-2"
                            value={template.name ?? ""}
                            onChange={(e) => updateField("name", e.target.value)}
                            placeholder="ตั้งชื่อแบบฟอร์ม..."
                        />
                    </label>
                    <label className="flex flex-col text-sm gap-1">
                        <span className="text-slate-700">คำอธิบาย</span>
                        <input
                            className="border rounded-xl px-3 py-2"
                            value={template.description ?? ""}
                            onChange={(e) => updateField("description", e.target.value)}
                            placeholder="อธิบายจุดประสงค์ของแบบฟอร์ม..."
                        />
                    </label>
                </div>
            </div>

            {template.templateType === "BATTALION" && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm grid grid-cols-1 gap-4">
                    <label className="flex flex-col text-sm gap-1">
                        <span className="text-amber-900">จำนวนครูผู้ประเมิน</span>
                        <input
                            type="number"
                            min={1}
                            className="border rounded-xl px-3 py-2"
                            value={template.teacherEvaluatorCount ?? ""}
                            onChange={(e) => { updateField("teacherEvaluatorCount", Number(e.target.value)) }}
                            placeholder="กรอกจำนวนผู้ประเมิน"
                        />
                    </label>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div className="text-sm text-slate-600">
                    เพิ่มหมวดคำถามเพื่อกำหนดโครงสร้างแบบฟอร์ม
                </div>
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
                            {template.templateType === "BATTALION" ? (<>
                                <label className="flex flex-col text-sm mb-3">
                                    <span>ชื่อหมวด</span>
                                    <input
                                        className="border border-gray-400 rounded-lg px-3 py-2"
                                        value={sec.title}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            updateSectionTitle(sIdx, name);

                                            const newSections = [...template.sections];
                                            newSections[sIdx].questions[0].prompt = name;

                                            setTemplate({ ...template, sections: newSections });
                                        }}
                                    />
                                </label>

                                <label className="flex flex-col text-sm">
                                    <span>คะแนนเต็ม</span>
                                    <input
                                        type="number"
                                        min={1}
                                        className="border border-gray-400 rounded-lg px-3 py-2"
                                        value={sec.questions[0].maxScore}
                                        onChange={(e) => {
                                            const newSections = [...template.sections];
                                            newSections[sIdx].questions[0].maxScore = Number(e.target.value);
                                            setTemplate({ ...template, sections: newSections });
                                        }}
                                    />
                                </label>
                            </>) : (<>
                                <label className="flex flex-col text-sm mb-3">
                                    <span>ชื่อหมวด</span>
                                    <input
                                        className="border border-gray-400 rounded-lg px-3 py-2"
                                        value={sec.title}
                                        onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                                    />
                                </label>
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
                            </>)}

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
