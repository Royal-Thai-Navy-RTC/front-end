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
export default function FormEvaluateStudent() {
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
        battalionCount: 0,
        teacherEvaluatorCount: 0,
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

        const payload = {
            id: template.id ?? null,
            name: (template.name || "").trim(),
            description: (template.description || "").trim(),
            templateType: template.templateType || "SERVICE",
            battalionCount: template.templateType === "BATTALION" ? Number(template.battalionCount || 0) : undefined,
            teacherEvaluatorCount: template.templateType === "BATTALION" ? Number(template.teacherEvaluatorCount || 0) : undefined,
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

                    <div className='flex sm:flex-row flex-col gap-3 w-full'>

                        {/* เลือกประเภท */}
                        <select
                            className="border border-gray-400 rounded-lg p-2 pr-10 text-gray-700"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="">- ประเภทการประเมิน -</option>
                            <option value="BATTALION">กองพัน</option>
                            <option value="COMPANY">กองร้อย</option>
                            <option value="SERVICE">ข้าราชการ</option>
                        </select>

                        {/* ค้นหาตามชื่อ */}
                        <div className="relative w-full">
                            <input
                                className="border border-gray-400 rounded-lg p-2 pr-10 w-full text-gray-700"
                                placeholder="ชื่อแบบฟอร์ม..."
                                value={searchKey}
                                onChange={(e) => setSearchKey(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* LIST */}
                {listEvaluate
                    .filter(v => {
                        const matchName = v.name.toLowerCase().includes(searchKey.toLowerCase());
                        const matchType = searchType ? v.templateType === searchType : true;
                        return matchName && matchType;
                    })
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
                                        {/* ประเภทฟอร์ม: {v.templateType === "COMPANY" ? "ประเมินกองร้อย" : "ประเมินกองพัน"} */}
                                        ประเภทฟอร์ม: {v.templateType === "COMPANY" ? "ประเมินกองร้อย" : v.templateType === "BATTALION" ? "ประเมินกองพัน" : "ประเมินข้าราชการ"}
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

                                {/* IF BATTALION */}
                                {v.templateType === "BATTALION" ? (
                                    <div className="border-t pt-3 border-gray-400">
                                        <div className="flex gap-x-5 mb-4 text-sm text-gray-700">
                                            {/* <p>{v.battalionCount} กองพัน</p> */}
                                            <p>ผู้ประเมินจำนวน {v.teacherEvaluatorCount} คน</p>
                                        </div>
                                        <div className=' flex flex-col'>
                                            {v.sections
                                                .sort((a, b) => a.sectionOrder - b.sectionOrder)
                                                .map(section => (
                                                    <div key={section.id} className="mb-3">
                                                        {/* <p className="font-bold text-blue-700">
                                                            {section.sectionOrder}. {section.title}
                                                        </p> */}
                                                        <ul className="pl-6 text-sm text-gray-700 list-decimal flex flex-col gap-1">
                                                            {section.questions.map((q, i) => (
                                                                <li key={i} className="flex flex-col sm:flex-row sm:justify-between">
                                                                    <p className="font-bold text-blue-700">{section.sectionOrder}. {q.prompt}</p>
                                                                    <span className="text-blue-700 text-xs w-1/2 text-start font-semibold">
                                                                        คะแนนเต็ม {q.maxScore}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-t pt-3 border-gray-400">
                                        {v.sections
                                            .sort((a, b) => a.sectionOrder - b.sectionOrder)
                                            .map(section => (
                                                <div key={section.id} className="mb-3">
                                                    <p className="font-bold text-blue-700">
                                                        {section.sectionOrder}. {section.title}
                                                    </p>
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
                                                </div>
                                            ))}
                                    </div>
                                )
                                }



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
                    teachers={teachers}
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
function ModalEditForm({ template, setTemplate, onClose, onSave, saving, teachers }) {
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

                <FormEvaluate template={template} setTemplate={setTemplate} teachers={teachers} />

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
            {/* Type */}
            {template.id == null ?
                <label className="flex flex-col text-sm">
                    <span>ประเภทฟอร์ม</span>
                    <select
                        className={`border rounded-xl px-3 py-2 ${template.id !== null && "bg-gray-200 cursor-not-allowed"}`}
                        value={template.templateType}
                        onChange={(e) => updateField("templateType", e.target.value)}
                        disabled={template.id !== null}
                    >
                        <option value="COMPANY">ประเมินกองร้อย</option>
                        <option value="BATTALION">ประเมินกองพัน</option>
                        <option value="SERVICE">ประเมินข้าราชการ</option>
                    </select>
                </label> :
                <div className='flex gap-1 font-bold border-t border-gray-300 pt-2'>
                    <p className=''>แบบฟอร์มประเมิน</p>
                    <p className='text-blue-800'>
                        {template.templateType === "BATTALION"
                            ? "กองพัน"
                            : template.templateType === "SERVICE"
                                ? "ข้าราชการ"
                                : "กองร้อย"}
                    </p>
                </div>
            }

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
            {template.templateType === "BATTALION" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            value={template.teacherEvaluatorCount ?? 0}
                            onChange={(e) => { updateField("teacherEvaluatorCount", Number(e.target.value)) }}
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
