import React, { useState, useEffect } from 'react';
import { useLocation, useOutletContext } from "react-router-dom";
import axios from "axios";

export default function EvaluateStudent() {

    const { divisionOptions } = useOutletContext();
    const { state } = useLocation();
    const battalion = state?.battalion;
    const company = state?.company;

    // Dropdown state
    const [searchSubject, setSearchSubject] = useState("");
    const [searchForm, setSearchForm] = useState("");

    // Data from API
    const [optionEvaluate, setOptionEvaluate] = useState([]);
    const [listEvaluate, setListEvaluate] = useState([]);
    const [formEvaluate, setFormEvaluate] = useState(null);
    
    // Load form templates
    useEffect(() => {
        const token = localStorage.getItem("token");

        const fetchTemplates = async () => {
            try {
                const response = await axios.get("/api/admin/student-evaluation-templates", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = response.data?.data || [];
                setListEvaluate(data);

                const mapped = data.map(f => ({ label: f.name, value: f.id }));
                setOptionEvaluate(mapped);

            } catch (err) {
                console.log("Error loading templates", err);
            }
        };

        fetchTemplates();
    }, []);

    // Score state
    const [scores, setScores] = useState({});

    const handleScore = (sectionId, questionId, value) => {
        setScores(prev => ({
            ...prev,
            [sectionId]: {
                ...prev[sectionId],
                [questionId]: value,
            },
        }));
    };
    // console.log(scores);
    // console.log(formEvaluate);
    

    return (
        <div className="flex flex-col w-full gap-6">
            {/* HEADER */}
            <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                    <div className='flex flex-col'>
                        <h1 className="text-3xl font-bold text-blue-900">กองร้อย {battalion}</h1>
                        <p className="text-xl text-gray-500">กองพันที่ {company}</p>
                    </div>

                    {/* SELECT BOXES */}
                    <div className="flex flex-col sm:flex-row gap-3 text-gray-600">
                        {/* เลือกวิชา */}
                        <select
                            name="subject"
                            value={searchSubject}
                            onChange={(e) => setSearchSubject(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl w-full sm:w-35 md:w-48"
                        >
                            <option value="">-- หมวดวิชา --</option>
                            {divisionOptions.map((v) => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                        </select>

                        {/* เลือกแบบฟอร์ม */}
                        <select name="form" value={searchForm}
                            onChange={(e) => {
                                const formId = e.target.value;
                                setSearchForm(formId);

                                const selectedForm = listEvaluate.find(f => f.id == formId);
                                setFormEvaluate(selectedForm || null);
                            }}
                            className="px-3 py-2 border border-gray-200 rounded-xl w-full sm:w-35 md:w-60" >
                            <option value="">-- แบบฟอร์มการประเมิน --</option>
                            {optionEvaluate.map((v) => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                        </select>

                    </div>
                </div>

                {/* SCORE SUMMARY */}
                <div className="grid sm:grid-cols-4 gap-3 text-white text-start">
                    <div className='flex flex-col p-2 pl-4 bg-green-500 rounded-2xl'>
                        <p className='text-sm'>คะแนนรวม</p>
                        <p className='text-4xl'>60</p>
                        <p className='text-sm'>จากทุกหัวข้อ</p>
                    </div>
                    <div className='flex flex-col p-2 pl-4 bg-yellow-500 rounded-2xl'>
                        <p className='text-sm'>คะแนนเฉลี่ย</p>
                        <p className='text-4xl'>70</p>
                        <p className='text-sm'>จากทุกหัวข้อ</p>
                    </div>
                    <div className='flex flex-col p-2 pl-4 bg-orange-500 rounded-2xl'>
                        <p className='text-sm'>คะแนนวิชา</p>
                        <p className='text-4xl'>80</p>
                        <p className='text-sm'>จากทุกหัวข้อ</p>
                    </div>
                    <div className='flex flex-col p-2 pl-4 bg-red-500 rounded-2xl'>
                        <p className='text-sm'>คะแนนวินัย</p>
                        <p className='text-4xl'>90</p>
                        <p className='text-sm'>จากทุกหมวดวิชา</p>
                    </div>
                </div>
            </section>

            {/* FORM CONTENT */}
            <div className="bg-white shadow rounded-2xl flex flex-col pb-5">
                <h2 className='bg-blue-800 p-3 text-white rounded-t-2xl text-xl sm:text-4xl font-bold'>
                    {formEvaluate?.name || "แบบฟอร์มการประเมิน"}
                </h2>

                {/* ถ้ายังไม่เลือกฟอร์ม */}
                {!formEvaluate ? (
                    <p className='text-center sm:text-xl text-blue-800 mt-5 w-full'>
                        โปรดเลือก แบบฟอร์มการประเมิน
                    </p>
                ) : (
                    /* ถ้าเลือกฟอร์มแล้ว */
                    <div className='px-6 pt-4'>
                        {formEvaluate.sections?.sort((a, b) => a.sectionOrder - b.sectionOrder).map((sec) => {
                            const maxScore = sec.questions[0]?.maxScore || 5;
                            return (
                                <table key={sec.id} className="w-full mb-6 border border-gray-400">
                                    {/* SECTION HEADER */}
                                    <thead className="bg-blue-800 text-white">
                                        <tr>
                                            <th className="text-left p-3 w-1/2">{sec.title}</th>
                                            {Array.from({ length: maxScore }, (_, i) => (
                                                <th key={i} className="text-center p-2 w-10">
                                                    {i + 1}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    {/* QUESTIONS */}
                                    <tbody>
                                        {sec.questions
                                            ?.sort((a, b) => a.questionOrder - b.questionOrder)
                                            .map((q) => (
                                                <tr key={q.id} className="hover:bg-gray-200">
                                                    {/* คำถาม */}
                                                    <td className="p-3">{q.prompt}</td>
                                                    {/* ช่องคะแนน */}
                                                    {Array.from({ length: maxScore }, (_, i) => {
                                                        const scoreValue = i + 1;
                                                        const selected =
                                                            scores?.[sec.id]?.[q.id] === scoreValue;

                                                        return (
                                                            <td key={i} className="text-center p-2" >
                                                                <input type="checkbox" checked={selected}
                                                                    onChange={() =>
                                                                        handleScore(sec.id, q.id, scoreValue)
                                                                    }
                                                                    className="size-5 cursor-pointer"
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            );
                        })}
                        <button
                            className="px-4 py-2 rounded-xl w-full bg-blue-800 text-xl cursor-pointer text-white mt-4"
                        // onClick={handleSave}
                        // disabled={savingProfile}
                        >
                            บันทึกข้อมูล
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
