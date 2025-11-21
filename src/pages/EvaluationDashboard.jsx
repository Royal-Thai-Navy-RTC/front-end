import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";

export default function EvaluationDashboard() {
  const { user } = useOutletContext();
  const role = (user?.role || "").toString().toUpperCase();
  const canDelete = role === "ADMIN" || role === "OWNER";
  const [templates, setTemplates] = useState([]);
  const battalionOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => `${i + 1}`), []);
  const companyOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => `${i + 1}`), []);
  const [filters, setFilters] = useState({
    templateId: "",
    battalionCode: battalionOptions[0] || "",
    companyCode: companyOptions[0] || "",
  });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setFetchingTemplates(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/admin/student-evaluation-templates", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = response.data?.data || [];
        setTemplates(data);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "โหลดแบบประเมินไม่สำเร็จ",
          text: err?.response?.data?.message || err?.message || "กรุณาลองใหม่",
        });
      } finally {
        setFetchingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleFetch = async () => {
    if (!filters.templateId || !filters.companyCode || !filters.battalionCode) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอกข้อมูลให้ครบ",
        text: "ระบุแบบประเมิน กองพัน และกองร้อยให้ครบก่อน",
      });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {
        templateId: filters.templateId,
        companyCode: filters.companyCode,
        battalionCode: filters.battalionCode,
        page: 1,
        pageSize: 20,
        includeAnswers: true,
      };
      const response = await axios.get("/api/student-evaluations", {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const items = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      let totalScore = 0;
      let totalQuestions = 0;
      let subjectScoreTotal = 0;
      let subjectCount = 0;
      let disciplineScoreTotal = 0;
      let disciplineCount = 0;
      let latestDate = null;
      let templateName = "";
      const questionMap = new Map();
      const evaluationList = [];

      items.forEach((item) => {
        subjectScoreTotal += Number(item.overallScore || 0);
        subjectCount += 1;
        const submittedAt = item.submittedAt ? new Date(item.submittedAt) : null;
        if (submittedAt && (!latestDate || submittedAt > latestDate)) {
          latestDate = submittedAt;
        }
        if (!templateName && item?.template?.name) {
          templateName = item.template.name;
        }

        evaluationList.push({
          id: item.id,
          template: item?.template?.name || templateName || "-",
          evaluator:
            item?.evaluator?.firstName || item?.evaluator?.lastName
              ? `${item?.evaluator?.firstName || ""} ${item?.evaluator?.lastName || ""}`.trim()
              : item?.evaluator?.username || "-",
          overallScore: item.overallScore,
          submittedAt: submittedAt ? submittedAt.toISOString() : null,
          subject: item.subject,
        });

        (item.answers || []).forEach((ans) => {
          const score = Number(ans.score || 0);
          totalScore += score;
          totalQuestions += 1;
          const sectionTitle = ans?.question?.section?.title || "";
          if (sectionTitle.toLowerCase().includes("วินัย")) {
            disciplineScoreTotal += score;
            disciplineCount += 1;
          }

          const qid = ans.questionId;
          if (!questionMap.has(qid)) {
            questionMap.set(qid, {
              questionId: qid,
              prompt: ans?.question?.prompt || `หัวข้อ ${qid}`,
              sectionTitle: ans?.question?.section?.title || "",
              totalScore: 0,
              evaluationCount: 0,
              maxScore: ans?.question?.maxScore || 5,
            });
          }
          const ref = questionMap.get(qid);
          ref.totalScore += score;
          ref.evaluationCount += 1;
        });
      });

      const summaryPayload = {
        template: templateName ? { name: templateName } : undefined,
        evaluationCount: subjectCount,
        totalScore,
        averageScore: totalQuestions ? totalScore / totalQuestions : 0,
        overallScoreAverage: subjectCount ? subjectScoreTotal / subjectCount : 0,
        disciplineScore: disciplineCount ? disciplineScoreTotal / disciplineCount : 0,
        latestSubmittedAt: latestDate ? latestDate.toISOString() : null,
        questionSummaries: Array.from(questionMap.values()),
        evaluations: evaluationList.sort((a, b) => {
          const dA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dB - dA;
        }),
      };

      setSummary(summaryPayload);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถดึงสรุปผลได้",
        text: err?.response?.data?.message || err?.message || "กรุณาลองใหม่",
      });
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (evaluationId) => {
    if (!evaluationId) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบแบบประเมิน",
      text: "ต้องการลบข้อมูลนี้หรือไม่?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/student-evaluations/${evaluationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await handleFetch();
      Swal.fire({ icon: "success", title: "ลบข้อมูลสำเร็จ" });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ลบข้อมูลไม่สำเร็จ",
        text: err?.response?.data?.message || err?.message || "กรุณาลองใหม่",
      });
    }
  };

  const groupedQuestions = useMemo(() => {
    if (!summary?.questionSummaries) return [];
    const groups = {};
    summary.questionSummaries.forEach((q) => {
      const section = q.sectionTitle || "อื่นๆ";
      if (!groups[section]) groups[section] = [];
      groups[section].push(q);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([section, items]) => ({
        section,
        items: items.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)),
      }));
  }, [summary]);


  const formatScore = (value) => {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return "0";
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  const latestText = summary?.latestSubmittedAt
    ? new Date(summary.latestSubmittedAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  return (
    <div className="flex flex-col gap-5 w-full">
      <section className="bg-white rounded-2xl shadow p-6 border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold w-fit">
              Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">สรุปผลการประเมินกองร้อย</h1>
            {/* <p className="text-sm text-gray-500">Owner / Admin / Sub Admin / Teacher</p> */}
          </div>
          <button
            onClick={handleFetch}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 shadow"
          >
            {loading ? "กำลังโหลด..." : "ดึงข้อมูลสรุป"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex flex-col text-sm text-gray-700">
            <span>แบบประเมิน</span>
            <select
              value={filters.templateId}
              onChange={(e) => setFilters((prev) => ({ ...prev, templateId: e.target.value }))}
              className="border rounded-xl px-3 py-2 mt-1"
            >
              <option value="">-- เลือกแบบประเมิน --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {fetchingTemplates && <span className="text-xs text-gray-400 mt-1">กำลังโหลด...</span>}
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            <span>กองพัน</span>
            <select
              value={filters.battalionCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, battalionCode: e.target.value }))}
              className="border rounded-xl px-3 py-2 mt-1"
            >
              {battalionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            <span>กองร้อย</span>
            <select
              value={filters.companyCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, companyCode: e.target.value }))}
              className="border rounded-xl px-3 py-2 mt-1"
            >
              {companyOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {summary && (
        <>
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-gray-500">ภาพรวม</p>
                <h2 className="text-xl font-semibold text-gray-900">
                  {summary.template?.name || "แบบประเมิน"}
                </h2>
                <p className="text-sm text-gray-600">
                  ล่าสุด: <span className="font-semibold">{latestText}</span>
                </p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                ประเมินแล้ว {summary.evaluationCount || 0} ครั้ง
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <SummaryCard label="คะแนนรวม" value={formatScore(summary.totalScore)} hint="จากทุกหัวข้อ" />
              <SummaryCard label="คะแนนเฉลี่ย" value={formatScore(summary.averageScore)} hint="จากทุกหัวข้อ" />
              <SummaryCard label="คะแนนภาพรวม" value={formatScore(summary.overallScoreAverage)} hint="จากทุกการประเมิน" />
            </div>


          {summary.evaluations?.length ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                รายการแบบประเมินที่ถูกส่ง
              </div>
              <div className="divide-y divide-gray-100">
                {summary.evaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{ev.template}</p>
                      <p className="text-xs text-gray-500">
                        ผู้ประเมิน: {ev.evaluator || "-"} | วิชา: {ev.subject || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {ev.submittedAt ? new Date(ev.submittedAt).toLocaleString("th-TH") : "-"}
                        </p>
                        <p className="text-sm font-bold text-blue-800">
                          คะแนนรวม: {formatScore(ev.overallScore)}
                        </p>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">ยังไม่มีแบบประเมินในตัวกรองนี้</p>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">รายละเอียดหัวข้อที่ถูกประเมิน</h3>
              <span className="text-xs text-gray-500">
                เรียงตามหมวด &gt; คะแนนเฉลี่ย
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {groupedQuestions.length === 0 && (
                <p className="text-sm text-gray-500">ยังไม่มีรายการ</p>
              )}
              {groupedQuestions.map((section) => (
                <div key={section.section} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800">
                    หมวด: {section.section}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {section.items.map((q) => {
                      const avg = q.evaluationCount
                        ? Number(q.totalScore || 0) / Number(q.evaluationCount || 1)
                        : 0;
                      return (
                        <div
                          key={q.questionId}
                          className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{q.prompt}</p>
                            <p className="text-xs text-gray-500">
                              ประเมิน {q.evaluationCount || 0} ครั้ง
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">เฉลี่ย</p>
                            <p className="text-lg font-bold text-blue-800">
                              {formatScore(avg)} / {q.maxScore || 5}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-blue-900 mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}
