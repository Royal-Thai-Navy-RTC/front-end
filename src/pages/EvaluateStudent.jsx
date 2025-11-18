import React, { useState, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Edit, Search } from "lucide-react";
import axios from "axios";
import { useOutlet } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useLocation, useOutletContext } from "react-router-dom";

export default function EvaluateStudent() {
    const { divisionOptions } = useOutletContext()
    const { state } = useLocation();
    const battalion = state?.battalion;
    const company = state?.company;
    const [searchCompany, setSearchCompany] = useState("");
    const [searchBattalion, setSearchBattalion] = useState("");
    const [searchSubject, setSearchSubject] = useState("");

    const [page, setPage] = useState(1);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const pageSize = 10;

    // State เก็บคะแนน
    const [scores, setScores] = useState({
        discipline: {},
        responsibility: {},
        training: {},
        teamwork: {},
        character: {},
        overall: {}
    });

    // ฟังก์ชันอัปเดตคะแนน
    const handleScore = (section, item, value) => {
        setScores(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [item]: value
            }
        }));
    };

    // UI สำหรับเลือกคะแนน 1–5
    const Rating = ({ section, item }) => (
        <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map(num => (
                <label key={num} className="flex items-center gap-1 cursor-pointer">
                    <input
                        type="radio"
                        name={`${section}-${item}`}
                        value={num}
                        onChange={() => handleScore(section, item, num)}
                    />
                    {num}
                </label>
            ))}
        </div>
    );

    useEffect(() => {
        // const fetchUsers = async () => {
        //     setLoading(true);
        //     setError("");
        //     try {
        //         const token = localStorage.getItem("token");
        //         const response = await axios.get("/api/admin/users", {
        //             params: { role: "TEACHER" },
        //             headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        //         });

        //         const payload = Array.isArray(response.data)
        //             ? response.data
        //             : Array.isArray(response.data?.data)
        //                 ? response.data.data
        //                 : [];

        //         setUsers(payload);
        //     } catch (err) {
        //         const message = err.response?.data?.message || "ไม่สามารถดึงข้อมูลได้";
        //         setError(message);
        //         setUsers([]);
        //     } finally {
        //         setLoading(false);
        //     }
        // };

        // fetchUsers();
    }, []);

    // ---------------------- FILTER ----------------------
    const filtered = useMemo(() => {
        return users.filter((u) => {

            const company = (u.company || "").toString().toLowerCase();
            const battalion = (u.battalion || "").toString().toLowerCase();
            const subject = (u.subject || "").toLowerCase();

            return (
                company.includes(searchCompany.toLowerCase()) &&
                battalion.includes(searchBattalion.toLowerCase()) &&
                subject.includes(searchSubject.toLowerCase())
            );
        });
    }, [users, searchCompany, searchBattalion, searchSubject]);

    const sections = [
        {
            key: "discipline",
            title: "1) หมวดวินัย (Discipline)",
            items: [
                "มาตรงเวลา และเข้าร่วมกิจกรรมครบถ้วน",
                "ปฏิบัติตามคำสั่งผู้บังคับบัญชา",
                "การแต่งกายและความเป็นระเบียบเรียบร้อย",
                "การรักษาทรัพย์สินส่วนรวมของกองร้อย",
                "มารยาทและความสุภาพ"
            ]
        },
        {
            key: "responsibility",
            title: "2) หมวดความรับผิดชอบ (Responsibility)",
            items: [
                "ปฏิบัติงานหรือภารกิจครบถ้วน",
                "ตรวจสอบงานก่อนส่ง มีความละเอียดรอบคอบ",
                "มีความเชื่อถือได้ (ไม่ขาดซ้อม/ไม่ขาดเรียน)",
                "ความกระตือรือร้นในการช่วยงานกองร้อย"
            ]
        },
        {
            key: "training",
            title: "3) หมวดความสามารถด้านการฝึก (Training)",
            items: [
                "ทักษะทางยุทธวิธีพื้นฐาน",
                "ความคล่องตัว / ความพร้อมทางร่างกาย",
                "ความเข้าใจบทเรียนภาคทฤษฎี",
                "ความสามารถภาคปฏิบัติ (ยิงปืน เดินทางไกล ฯลฯ)"
            ]
        },
        {
            key: "teamwork",
            title: "4) หมวดความร่วมมือ (Teamwork)",
            items: [
                "ทำงานร่วมกับเพื่อนได้ดี",
                "น้ำใจ เอื้อเฟื้อ ช่วยเหลือเพื่อน",
                "การสื่อสารภายในทีม",
                "รับฟังความคิดเห็นผู้อื่น"
            ]
        },
        {
            key: "character",
            title: "5) คุณลักษณะส่วนบุคคล (Character)",
            items: [
                "ความตั้งใจและทัศนคติ",
                "การควบคุมอารมณ์",
                "ความมั่นใจในตนเอง",
                "ความซื่อสัตย์",
                "ความเป็นผู้นำ"
            ]
        }
    ];


    return (
        <div className="flex flex-col w-full gap-6">
            <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className='flex flex-col '>
                        <h1 className="text-3xl font-bold text-blue-900">กองร้อย {battalion}</h1>
                        <p className="text-xl text-gray-500">กองพันที่ {company}</p>
                    </div>

                    {/* SEARCH BOX */}
                    <div className="flex flex-col sm:flex-row gap-3 text-gray-600">
                        <select
                            name="subject"
                            value={searchBattalion}
                            onChange={(e) => { setSearchBattalion(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full sm:w-35 md:w-48"
                        >
                            <option value="">-- หมวดวิชา --</option>
                            {divisionOptions.map((v) => (
                                <option key={v.value} value={v.value}>
                                    {v.label}
                                </option>
                            ))}
                        </select>
                        <select
                            name="subject"
                            value={searchBattalion}
                            onChange={(e) => { setSearchBattalion(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full sm:w-35 md:w-60"
                        >
                            <option value="">-- แบบฟอร์มการประเมิน --</option>
                            {divisionOptions.map((v) => (
                                <option key={v.value} value={v.value}>
                                    {v.label}
                                </option>
                            ))}
                        </select>

                        {/* CLEAR BUTTON */}
                        <button
                            onClick={() => {
                                setSearchCompany("");
                                setSearchBattalion("");
                                setPage(1);
                            }}
                            className="px-4 py-2 rounded-xl border border-gray-300  hover:bg-gray-50 whitespace-nowrap"
                        >
                            ค้นหา
                        </button>
                    </div>
                </div>
            </section>

            {/* FORM */}
            <div className="bg-white shadow rounded-2xl p-6 flex flex-col gap-8">
                {/* Loop หมวดทั้งหมด */}
                {sections.map((sec) => (
                    <section key={sec.key}>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">{sec.title}</h2>

                        {sec.items.map((label, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b">
                                <span>{label}</span>
                                <Rating section={sec.key} item={idx} />
                            </div>
                        ))}
                    </section>
                ))}
            </div>

            {/* SCORRE OVER ALL */}
            <div className="bg-white shadow rounded-2xl p-6 flex flex-col gap-8">
                
            </div>
        </div>
    );
}
