import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

export default function EvaluateStudent() {
  const { divisionOptions } = useOutletContext();
  const { state } = useLocation();
  const battalion = state?.battalion;
  const company = state?.company;

  const [searchSubject, setSearchSubject] = useState("");
  const [searchForm, setSearchForm] = useState("");
  const [optionEvaluate, setOptionEvaluate] = useState([]);
  const [listEvaluate, setListEvaluate] = useState([]);
  const [formEvaluate, setFormEvaluate] = useState(null);
  const [evaluationDate, setEvaluationDate] = useState("");
  const [summary, setSummary] = useState("");
  const [overallScore, setOverallScore] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/admin/student-evaluation-templates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.data?.data || [];
        setListEvaluate(data);
        const mapped = data.map((f) => ({ label: f.name, value: f.id }));
        setOptionEvaluate(mapped);
      } catch (err) {
        console.log("Error loading templates", err);
      }
    };
    fetchTemplates();
  }, []);

  const [scores, setScores] = useState({});

  const answerList = useMemo(() => {
    if (!formEvaluate) return [];
    const collected = [];
    formEvaluate.sections?.forEach((sec) => {
      sec.questions?.forEach((q) => {
        const val = scores?.[sec.id]?.[q.id];
        if (val != null && val !== "") {
          collected.push({ questionId: q.id, score: Number(val) });
        }
      });
    });
    return collected;
  }, [formEvaluate, scores]);

  const computedOverall = useMemo(() => {
    if (!answerList.length) return 0;
    const total = answerList.reduce((sum, a) => sum + Number(a.score || 0), 0);
    return Math.round((total / answerList.length) * 10) / 10;
  }, [answerList]);

  const handleScore = (sectionId, questionId, value) => {
    setScores((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [questionId]: value },
    }));
  };


  const handleSubmit = async () => {
    if (!formEvaluate) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกแบบฟอร์ม" });
      return;
    }
    if (!searchSubject) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกหมวดวิชา" });
      return;
    }
    if (!evaluationDate) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกช่วงประเมิน" });
      return;
    }
    if (!answerList.length) {
      Swal.fire({ icon: "warning", title: "ยังไม่ได้ให้คะแนน" });
      return;
    }

    const payload = {
      templateId: formEvaluate.id,
      subject: searchSubject,
      companyCode: company != null ? String(company) : "",
      battalionCode: battalion != null ? String(battalion) : "",
      evaluationPeriod: evaluationDate,
      summary: summary || "",
      overallScore: Number(overallScore || computedOverall || 0),
      answers: answerList,
    };

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/student-evaluations", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      Swal.fire({ icon: "success", title: "บันทึกแบบประเมินสำเร็จ" });
      setSummary("");
      setOverallScore("");
      setEvaluationDate("");
      setScores({});
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err?.response?.data?.message || err?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-blue-900">กองร้อย {battalion}</h1>
            <p className="text-xl text-gray-500">กองพันที่ {company}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 text-gray-600">
            <select
              name="subject"
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl w-full sm:w-35 md:w-48"
            >
              <option value="">-- หมวดวิชา --</option>
              {divisionOptions.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>

            <select
              name="form"
              value={searchForm}
              onChange={(e) => {
                const formId = e.target.value;
                setSearchForm(formId);
                const selectedForm = listEvaluate.find((f) => f.id == formId);
                setFormEvaluate(selectedForm || null);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl w-full sm:w-35 md:w-60"
            >
              <option value="">-- แบบฟอร์มการประเมิน --</option>
              {optionEvaluate.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="bg-white shadow rounded-2xl flex flex-col pb-5">
        <h2 className="bg-blue-800 p-3 text-white rounded-t-2xl text-xl sm:text-2xl font-bold">
          {formEvaluate?.name || "แบบฟอร์มการประเมิน"}
        </h2>

        {!formEvaluate ? (
          <p className="text-center sm:text-xl text-blue-800 mt-5 w-full">
            โปรดเลือก แบบฟอร์มการประเมิน
          </p>
        ) : (
          <div className="px-6 pt-4">
            {formEvaluate.sections
              ?.sort((a, b) => a.sectionOrder - b.sectionOrder)
              .map((sec) => (
                <div
                  key={sec.id}
                  className="w-full mb-6 border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-blue-800 text-white px-4 py-3 font-semibold">
                    {sec.title}
                  </div>

                  <div className="flex flex-col gap-3 p-4 bg-white">
                    {sec.questions
                      ?.sort((a, b) => a.questionOrder - b.questionOrder)
                      .map((q) => {
                        const maxScore = q.maxScore || 5;
                        const currentScore = scores?.[sec.id]?.[q.id];
                        return (
                          <div
                            key={q.id}
                            className="border border-gray-100 rounded-xl p-3 flex flex-col gap-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                  {q.prompt}
                                </p>
                                <p className="text-xs text-gray-500">
                                  อยู่ในหมวด: {sec.title}
                                </p>
                              </div>
                              <div className="text-right min-w-[90px]">
                                <p className="text-xs text-gray-500">ได้</p>
                                <p className="text-lg font-bold text-blue-800">
                                  {currentScore ?? "-"} / {maxScore}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: maxScore }, (_, i) => {
                                const scoreValue = i + 1;
                                const selected =
                                  scores?.[sec.id]?.[q.id] === scoreValue;
                                return (
                                  <button
                                    type="button"
                                    key={scoreValue}
                                    onClick={() =>
                                      handleScore(sec.id, q.id, scoreValue)
                                    }
                                    className={`px-3 py-1 rounded-lg border text-sm transition ${
                                      selected
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                                    }`}
                                  >
                                    {scoreValue} คะแนน
                                  </button>
                                );
                              })}
                            </div>

                            
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <label className="flex flex-col text-sm text-gray-700">
                <span>ช่วงประเมิน</span>
                <input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                  className="border rounded-xl px-3 py-2 mt-1"
                />
              </label>
              <label className="flex flex-col text-sm text-gray-700">
                <span>คะแนนรวม/เฉลี่ย</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overallScore || computedOverall}
                  onChange={(e) => setOverallScore(e.target.value)}
                  className="border rounded-xl px-3 py-2 mt-1"
                />
                <span className="text-xs text-gray-500 mt-1">
                  ตั้งค่าเองได้ หากเว้นว่างจะใช้ค่าเฉลี่ยอัตโนมัติ
                </span>
              </label>
            </div>

            <label className="flex flex-col text-sm text-gray-700 mt-3">
              <span>สรุปผลการประเมิน</span>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="border rounded-xl px-3 py-2 mt-1"
                placeholder="สรุปข้อสังเกตหรือข้อแนะนำ"
              />
            </label>

            <button
              className="px-4 py-2 rounded-xl w-full bg-blue-800 text-lg cursor-pointer text-white mt-4 disabled:opacity-60"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
