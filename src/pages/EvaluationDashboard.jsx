import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";
import ReactECharts from "echarts-for-react";

const SUMMARY_TYPES = {
  COMPANY: "COMPANY",
  BATTALION: "BATTALION",
};

export default function EvaluationDashboard() {
  const { user } = useOutletContext();
  const role = (user?.role || "").toString().toUpperCase();
  const canDelete = role === "ADMIN" || role === "OWNER";

  const battalionOptions = useMemo(() => Array.from({ length: 4 }, (_, i) => `${i + 1}`), []);
  const companyOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => `${i + 1}`), []);

  const [templates, setTemplates] = useState([]);
  const [summaryType, setSummaryType] = useState(SUMMARY_TYPES.COMPANY);
  const [filters, setFilters] = useState({
    templateId: "",
    battalionCode: battalionOptions[0] || "",
    companyCode: companyOptions[0] || "",
  });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [comparisonData, setComparisonData] = useState({
    companyAverages: [],
    battalionAverages: [],
    overallCompanyAverage: 0,
    templateName: "",
  });
  const [comparisonTemplateId, setComparisonTemplateId] = useState("");
  const [loadingComparison, setLoadingComparison] = useState(false);
  const nonServiceTemplates = useMemo(
    () => templates.filter((t) => (t.templateType || "").toUpperCase() !== "SERVICE"),
    [templates]
  );

  const isCompanySummary = summaryType === SUMMARY_TYPES.COMPANY;
  const filtersReady = isCompanySummary
    ? Boolean(filters.templateId && filters.battalionCode && filters.companyCode)
    : Boolean(filters.templateId && filters.battalionCode);
  const lastFetchKey = useRef("");

  const buildFetchKey = () =>
    `${summaryType}|${filters.templateId}|${filters.battalionCode}|${isCompanySummary ? filters.companyCode : "-"}`;

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
          text: err?.response?.data?.message || err?.message || "ไม่สามารถดึงรายการแบบประเมินได้",
        });
      } finally {
        setFetchingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    setSummary(null);
    setFilters((prev) => {
      if (isCompanySummary && !prev.companyCode) {
        return { ...prev, companyCode: companyOptions[0] || "" };
      }
      if (!isCompanySummary && prev.companyCode) {
        return { ...prev, companyCode: "" };
      }
      return prev;
    });
    // allow re-fetch when switching summary type
    lastFetchKey.current = "";
  }, [companyOptions, isCompanySummary]);

  useEffect(() => {
    if (!filtersReady) return;
    handleFetch({ silent: true });
  }, [filtersReady, summaryType, filters.templateId, filters.battalionCode, filters.companyCode]);

  const fetchComparison = useCallback(
    async (templateIdParam) => {
      setLoadingComparison(true);
      try {
        const token = localStorage.getItem("token");
        const params = {
          battalionCodes: battalionOptions.join(","),
          companyCodes: companyOptions.join(","),
        };
        const selectedTemplate = nonServiceTemplates.find((t) => `${t.id}` === `${templateIdParam || comparisonTemplateId}`);
        if (selectedTemplate) {
          params.templateId = selectedTemplate.id;
        }

        const res = await axios.get("/api/student-evaluations/comparison", {
          params,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const comparisonPayload = res.data?.comparison || res.data || {};
        const companySource = Array.isArray(comparisonPayload.companies)
          ? comparisonPayload.companies
          : Array.isArray(comparisonPayload.battalions)
            ? comparisonPayload.battalions.flatMap((b) =>
                (b.companies || []).map((c) => ({ ...c, battalionCode: c.battalionCode ?? b.battalionCode }))
              )
            : [];

        const companyAverages = companySource
          .map((c) => ({
            code: c.companyCode ?? "-",
            battalionCode: c.battalionCode ?? "-",
            totalScore: Number(c.totalScore || 0),
            totalEvaluations: Number(c.totalEvaluations || 0),
            average: Number(c.averageOverallScore || 0),
            label: c.companyCode
              ? `กองร้อย ${c.companyCode}${c.battalionCode ? ` / กองพัน ${c.battalionCode}` : ""}`
              : "ไม่ระบุกองร้อย",
          }))
          .sort((a, b) => (b.average || 0) - (a.average || 0));

        const battalionAverages = Array.isArray(comparisonPayload.battalions)
          ? comparisonPayload.battalions
              .map((b) => ({
                code: b.battalionCode ?? "-",
                totalScore: Number(b.totalScore || 0),
                totalEvaluations: Number(b.totalEvaluations || 0),
                average: Number(b.averageOverallScore || 0),
                label: b.battalionCode ? `กองพัน ${b.battalionCode}` : "ไม่ระบุกองพัน",
              }))
              .sort((a, b) => (b.average || 0) - (a.average || 0))
          : [];

        const overallCompanyAverage = (() => {
          const totalScoreAll = companyAverages.reduce((sum, item) => sum + (item.totalScore || 0), 0);
          const totalEvalAll = companyAverages.reduce((sum, item) => sum + (item.totalEvaluations || 0), 0);
          if (totalEvalAll) return totalScoreAll / totalEvalAll;
          const totalAvg = companyAverages.reduce((sum, item) => sum + (item.average || 0), 0);
          return companyAverages.length ? totalAvg / companyAverages.length : 0;
        })();

        const templateNameResolved = selectedTemplate?.name || "-";

        setComparisonData({
          companyAverages,
          battalionAverages,
          overallCompanyAverage,
          templateName: templateNameResolved,
        });
      } catch {
        setComparisonData({
          companyAverages: [],
          battalionAverages: [],
          overallCompanyAverage: 0,
          templateName: "ทุกแบบประเมิน",
        });
      } finally {
        setLoadingComparison(false);
      }
    },
    [battalionOptions, companyOptions, nonServiceTemplates, comparisonTemplateId]
  );

  useEffect(() => {
    fetchComparison(comparisonTemplateId);
  }, [fetchComparison, comparisonTemplateId]);

  useEffect(() => {
    if (!comparisonTemplateId && nonServiceTemplates.length) {
      setComparisonTemplateId(nonServiceTemplates[0].id);
    }
  }, [comparisonTemplateId, nonServiceTemplates]);

  const handleResetFilters = () => {
    setFilters({
      templateId: "",
      battalionCode: battalionOptions[0] || "",
      companyCode: isCompanySummary ? companyOptions[0] || "" : "",
    });
    setSummary(null);
    lastFetchKey.current = "";
  };

  const handleFetch = async ({ silent = false, force = false } = {}) => {
    if (!filtersReady) {
      if (!silent) {
        Swal.fire({
          icon: "warning",
          title: "กรุณากรอกข้อมูลให้ครบ",
          text: "เลือกแบบประเมิน กองพัน และกองร้อยให้ครบก่อนดึงข้อมูล",
        });
      }
      return;
    }

    const key = buildFetchKey();
    if (!force && key === lastFetchKey.current) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {
        templateId: filters.templateId,
        battalionCode: filters.battalionCode,
        page: 1,
        pageSize: 20,
        includeAnswers: true,
        summaryType,
      };
      if (isCompanySummary) {
        params.companyCode = filters.companyCode;
      }

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
              prompt: ans?.question?.prompt || `คำถามที่ ${qid}`,
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

      lastFetchKey.current = key;
      setSummary(summaryPayload);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ดึงข้อมูลสรุปไม่สำเร็จ",
        text: err?.response?.data?.message || err?.message || "ไม่สามารถดึงข้อมูลสรุปการประเมินได้",
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
      title: "ยืนยันลบรายการประเมิน?",
      text: "คุณต้องการลบข้อมูลการประเมินนี้หรือไม่",
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
      await handleFetch({ silent: true, force: true });
      Swal.fire({ icon: "success", title: "ลบข้อมูลเรียบร้อย" });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ลบข้อมูลไม่สำเร็จ",
        text: err?.response?.data?.message || err?.message || "เกิดข้อผิดพลาดในการลบข้อมูล",
      });
    }
  };

  const groupedQuestions = useMemo(() => {
    if (!summary?.questionSummaries) return [];
    const groups = {};
    summary.questionSummaries.forEach((q) => {
      const section = q.sectionTitle || "ไม่ระบุหมวด";
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

  const companyChartOption = useMemo(() => {
    const list = comparisonData?.companyAverages || [];
    if (!list.length) return null;
    const categories = list.map((item) => item.label || "-");
    const data = list.map((item) => ({
      value: Number.isFinite(Number(item.average)) ? Math.round(Number(item.average) * 100) / 100 : 0,
    }));
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const point = params?.[0];
          if (!point) return "";
          const valueText = Number(point.data?.value ?? 0).toFixed(2);
          return `${point.name}<br/>กองร้อย: ${valueText}`;
        },
      },
      grid: { left: 50, right: 20, top: 30, bottom: 60 },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: categories.some((c) => c.length > 12) ? 20 : 0,
        },
      },
      yAxis: {
        type: "value",
        name: "คะแนนเฉลี่ย",
        min: 0,
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 42,
          itemStyle: { color: "#2563eb" },
          data,
          label: {
            show: true,
            position: "top",
            formatter: ({ data }) => Number(data?.value ?? 0).toFixed(2),
          },
        },
      ],
      animationDuration: 500,
    };
  }, [comparisonData?.companyAverages]);

  const battalionChartOption = useMemo(() => {
    const list = comparisonData?.battalionAverages || [];
    if (!list.length) return null;
    const categories = list.map((item) => item.label || "-");
    const data = list.map((item) => ({
      value: Number.isFinite(Number(item.average)) ? Math.round(Number(item.average) * 100) / 100 : 0,
    }));
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const point = params?.[0];
          if (!point) return "";
          const valueText = Number(point.data?.value ?? 0).toFixed(2);
          return `${point.name}<br/>กองพัน: ${valueText}`;
        },
      },
      grid: { left: 50, right: 20, top: 30, bottom: 60 },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: categories.some((c) => c.length > 12) ? 20 : 0,
        },
      },
      yAxis: {
        type: "value",
        name: "คะแนนเฉลี่ย",
        min: 0,
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 42,
          itemStyle: { color: "#10b981" },
          data,
          label: {
            show: true,
            position: "top",
            formatter: ({ data }) => Number(data?.value ?? 0).toFixed(2),
          },
        },
      ],
      animationDuration: 500,
    };
  }, [comparisonData?.battalionAverages]);

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
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-gray-500">กราฟเปรียบเทียบคะแนนเฉลี่ย</p>
            <p className="text-sm text-gray-700">
              เปรียบเทียบคะแนนเฉลี่ยของกองพันและกองร้อยที่เกี่ยวข้อง (จัดอันดับมากไปหาน้อย)
            </p>
            <p className="text-xs text-gray-500">
              เทมเพลต: <span className="font-semibold text-gray-800">{comparisonData.templateName || "-"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">กองร้อย</span>
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">กองพัน</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col text-sm text-gray-700">
            <span>เลือกแบบประเมิน (สำหรับกราฟ)</span>
            <select
              value={comparisonTemplateId}
              onChange={(e) => setComparisonTemplateId(e.target.value)}
              className="border rounded-xl px-3 py-2 mt-1"
            >
              {nonServiceTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <span className="text-xs uppercase tracking-[0.08em] text-blue-700">สรุปทุกกองร้อย</span>
            <p className="text-lg font-bold text-blue-900 mt-1">
              คะแนนเฉลี่ยรวมทุกกองร้อย: {formatScore(comparisonData?.overallCompanyAverage || 0)}
            </p>
            <p className="text-xs text-blue-800/80">
              รวม {comparisonData?.companyAverages?.length || 0} กองร้อยในข้อมูลนี้
            </p>
          </div>
        </div>
        <div>
          {loadingComparison ? (
            <p className="text-sm text-gray-500">กำลังโหลดกราฟ...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">กองร้อย</p>
                  <span className="text-xs text-gray-500">จัดอันดับมากไปหาน้อย</span>
                </div>
                {companyChartOption ? (
                  <ReactECharts option={companyChartOption} notMerge lazyUpdate style={{ height: 320, width: "100%" }} />
                ) : (
                  <p className="text-sm text-gray-500 mt-2">ยังไม่มีข้อมูลกองร้อย</p>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">กองพัน</p>
                  <span className="text-xs text-gray-500">จัดอันดับมากไปหาน้อย</span>
                </div>
                {battalionChartOption ? (
                  <ReactECharts option={battalionChartOption} notMerge lazyUpdate style={{ height: 320, width: "100%" }} />
                ) : (
                  <p className="text-sm text-gray-500 mt-2">ยังไม่มีข้อมูลกองพัน</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold w-fit">
              Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isCompanySummary ? "สรุปผลการประเมินกองร้อย" : "สรุปผลการประเมินกองพัน"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              รีเซ็ตตัวกรอง
            </button>
            <button
              onClick={() => handleFetch({ force: true })}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 shadow"
            >
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-300 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">ตัวกรองผลสรุป</p>
              <p className="text-sm text-gray-700">
                เลือกประเภทสรุปและข้อมูลหน่วย เพื่อแสดงผลเฉพาะที่ต้องการ
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[SUMMARY_TYPES.COMPANY, SUMMARY_TYPES.BATTALION].map((mode) => {
                const active = summaryType === mode;
                const label = mode === SUMMARY_TYPES.COMPANY ? "กองร้อย" : "กองพัน";
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSummaryType(mode)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                      active
                        ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="flex flex-col text-sm text-gray-700">
              <span>แบบประเมิน</span>
              <select
                value={filters.templateId}
                onChange={(e) => setFilters((prev) => ({ ...prev, templateId: e.target.value }))}
                className="border rounded-xl px-3 py-2 mt-1"
              >
                <option value="">-- เลือกแบบประเมิน --</option>
                {nonServiceTemplates.map((t) => (
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
            {isCompanySummary && (
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
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="px-3 py-1 rounded-full bg-white border border-gray-200">
              สรุปแบบ: {isCompanySummary ? "กองร้อย + กองพัน" : "กองพันรวม"}
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-gray-200">
              กองพันที่: {filters.battalionCode || "-"}
            </span>
            {isCompanySummary && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200">
                กองร้อยที่: {filters.companyCode || "-"}
              </span>
            )}
          </div>
        </div>
      </section>

      {summary && (
        <>
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-gray-500">ข้อมูลสรุป</p>
                <h2 className="text-xl font-semibold text-gray-900">
                  {summary.template?.name || "ยังไม่ระบุแบบประเมิน"}
                </h2>
                <p className="text-sm text-gray-600">
                  อัปเดตล่าสุด: <span className="font-semibold">{latestText}</span>
                </p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                จำนวนการประเมิน {summary.evaluationCount || 0} ครั้ง
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <SummaryCard label="คะแนนรวมทั้งหมด" value={formatScore(summary.totalScore)} hint="รวมคะแนนทุกข้อ" />
              <SummaryCard label="คะแนนเฉลี่ยต่อข้อ" value={formatScore(summary.averageScore)} hint="เฉลี่ยคะแนนทุกคำถาม" />
              <SummaryCard label="คะแนนเฉลี่ยรวมแบบประเมิน" value={formatScore(summary.overallScoreAverage)} hint="เฉลี่ยคะแนนรวมต่อการประเมิน" />
            </div>

          {summary.evaluations?.length ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                รายการการประเมินล่าสุด
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
                        ผู้ประเมิน: {ev.evaluator || "-"} | หัวข้อ/บุคคล: {ev.subject || "-"}
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
            <p className="text-sm text-gray-500">ยังไม่มีข้อมูลการประเมิน</p>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">สรุปคะแนนรายคำถาม</h3>
              <span className="text-xs text-gray-500">
                เรียงจากคะแนนรวมสูง &gt; ต่ำ
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {groupedQuestions.length === 0 && (
                <p className="text-sm text-gray-500">ยังไม่มีข้อมูลคำถาม</p>
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
                              จำนวนการประเมิน {q.evaluationCount || 0} ครั้ง
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">คะแนนเฉลี่ย</p>
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
