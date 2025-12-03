import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import ReactECharts from "echarts-for-react";
import { Upload, BarChart3, Loader2, Download, Trash2 } from "lucide-react";

const SUMMARY_SCOPE = {
  BATTALION: "BATTALION",
  COMPANY: "COMPANY",
};

const COMPANY_CODES = ["1", "2", "3", "4", "5"];
const DEFAULT_BATTALION_CODES = ["1", "2", "3", "4"];
const DEFAULT_COMPANY_CODES = [...COMPANY_CODES];

const SAMPLE_RESULTS = [
  { id: 1, student: "Student 01", battalion: "1", company: "1", subject: "Marksmanship", score: 86 },
  { id: 2, student: "Student 02", battalion: "1", company: "1", subject: "Fitness", score: 78 },
  { id: 3, student: "Student 03", battalion: "1", company: "2", subject: "Marksmanship", score: 82 },
  { id: 4, student: "Student 04", battalion: "1", company: "3", subject: "Navigation", score: 74 },
  { id: 5, student: "Student 05", battalion: "1", company: "4", subject: "Fitness", score: 79 },
  { id: 6, student: "Student 06", battalion: "1", company: "5", subject: "Navigation", score: 88 },
  { id: 7, student: "Student 07", battalion: "2", company: "1", subject: "Fitness", score: 91 },
  { id: 8, student: "Student 08", battalion: "2", company: "2", subject: "Navigation", score: 69 },
  { id: 9, student: "Student 09", battalion: "2", company: "3", subject: "Marksmanship", score: 88 },
  { id: 10, student: "Student 10", battalion: "2", company: "4", subject: "Fitness", score: 72 },
  { id: 11, student: "Student 11", battalion: "2", company: "5", subject: "Navigation", score: 77 },
  { id: 12, student: "Student 12", battalion: "3", company: "1", subject: "Fitness", score: 77 },
  { id: 13, student: "Student 13", battalion: "3", company: "2", subject: "Navigation", score: 80 },
  { id: 14, student: "Student 14", battalion: "3", company: "3", subject: "Marksmanship", score: 73 },
  { id: 15, student: "Student 15", battalion: "3", company: "4", subject: "Fitness", score: 81 },
  { id: 16, student: "Student 16", battalion: "3", company: "5", subject: "Navigation", score: 76 },
  { id: 17, student: "Student 17", battalion: "4", company: "1", subject: "Navigation", score: 84 },
  { id: 18, student: "Student 18", battalion: "4", company: "2", subject: "Fitness", score: 75 },
  { id: 19, student: "Student 19", battalion: "4", company: "3", subject: "Marksmanship", score: 86 },
  { id: 20, student: "Student 20", battalion: "4", company: "4", subject: "Fitness", score: 74 },
  { id: 21, student: "Student 21", battalion: "4", company: "5", subject: "Navigation", score: 79 },
];

const findHeaderIndex = (headers, aliases = []) => {
  const normalized = headers.map((h) => h.toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
};

const parseCsv = (text) => {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length <= 1) return [];

  const headers = rows[0].split(",").map((h) => h.trim());
  const battalionIdx = findHeaderIndex(headers, ["battalion", "bn", "กองพัน"]);
  const companyIdx = findHeaderIndex(headers, ["company", "co", "กองร้อย"]);
  const studentIdx = findHeaderIndex(headers, ["student", "name", "student_name", "ผู้เข้าสอบ", "ชื่อผู้เข้าสอบ"]);
  const scoreIdx = findHeaderIndex(headers, ["score", "point", "คะแนน"]);

  const payload = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cols = rows[i].split(",").map((c) => c.trim());
    if (cols.length === 0) continue;

    const battalion = battalionIdx >= 0 ? cols[battalionIdx] || "" : "";
    const company = companyIdx >= 0 ? cols[companyIdx] || "" : "";
    const student = studentIdx >= 0 ? cols[studentIdx] || `Student ${i}` : `Student ${i}`;
    const scoreValue = scoreIdx >= 0 ? Number(cols[scoreIdx] || 0) : 0;

    if (!battalion && !company && Number.isNaN(scoreValue)) continue;

    payload.push({
      id: i,
      student,
      battalion: battalion || "-",
      company: company || "-",
      subject: "Exam",
      score: Number.isNaN(scoreValue) ? 0 : scoreValue,
    });
  }
  return payload;
};

const parseExcel = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames?.[0];
        if (!firstSheet) return resolve([]);
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet] || {});
        resolve(parseCsv(csv));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

const normalizeSummaryResponse = (payload = {}) => {
  const source = payload?.data?.battalions || payload?.battalions || [];
  if (!Array.isArray(source)) return [];
  return source
    .map((battalion) => ({
      battalionCode: (battalion.battalionCode ?? battalion.battalion ?? "").toString(),
      averageScore: Number(battalion.averageScore ?? battalion.average ?? 0),
      total: Number(battalion.total ?? battalion.totalStudents ?? battalion.count ?? 0),
      companies: Array.isArray(battalion.companies)
        ? battalion.companies.map((company, index) => ({
            battalionCode: (company.battalionCode ?? battalion.battalionCode ?? battalion.battalion ?? "").toString(),
            companyCode: (company.companyCode ?? company.company ?? index + 1).toString(),
            averageScore: Number(company.averageScore ?? company.average ?? 0),
            total: Number(company.total ?? company.totalStudents ?? company.count ?? 0),
          }))
        : [],
    }))
    .filter((item) => item.battalionCode);
};

const buildRecordsFromSummary = (battalions = []) => {
  if (!Array.isArray(battalions)) return [];
  return battalions.flatMap((battalion) =>
    (battalion.companies || []).map((company, index) => ({
      id: `${battalion.battalionCode}-${company.companyCode || index}`,
      student: `กองร้อย ${company.companyCode || "-"}`,
      battalion: battalion.battalionCode || "-",
      company: company.companyCode || "-",
      subject: "คะแนนเฉลี่ยรวม",
      score: Number(company.averageScore ?? 0),
      total: Number(company.total ?? 0),
    }))
  );
};

const StatPill = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 bg-white/70 backdrop-blur rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
      <Icon size={18} />
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  </div>
);

export default function Exam() {
  const [records, setRecords] = useState(SAMPLE_RESULTS);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [overview, setOverview] = useState({ total: 0, averageScore: 0, latest: null });
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [latestResults, setLatestResults] = useState([]);
  const [latestMeta, setLatestMeta] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestError, setLatestError] = useState("");
  const [latestDeletingId, setLatestDeletingId] = useState(null);
  const [latestFetched, setLatestFetched] = useState(false);
  const [summaryScope, setSummaryScope] = useState(SUMMARY_SCOPE.BATTALION);
  const [filters, setFilters] = useState({ battalion: SAMPLE_RESULTS[0].battalion, company: "ALL" });
  const [uploadStatus, setUploadStatus] = useState({ fileName: "", message: "", state: "" });
  const [uploading, setUploading] = useState(false);

  const battalionOptions = useMemo(() => {
    if (summaryData?.length) {
      return summaryData
        .map((item) => item.battalionCode)
        .filter(Boolean)
        .sort();
    }
    const uniq = Array.from(new Set(records.map((r) => r.battalion)));
    return uniq.sort();
  }, [records, summaryData]);

  const companyOptions = useMemo(() => ["ALL", ...COMPANY_CODES], []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/exam-results/summary", {
        params: {
          battalionCodes: DEFAULT_BATTALION_CODES.join(","),
          companyCodes: DEFAULT_COMPANY_CODES.join(","),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const normalized = normalizeSummaryResponse(response.data);
      if (normalized.length === 0) {
        setSummaryError("ไม่พบข้อมูลสรุปผลสอบจากระบบ ใช้ข้อมูลตัวอย่างแทน");
        setSummaryData(null);
        setRecords(SAMPLE_RESULTS);
        return;
      }
      setSummaryData(normalized);
      setRecords(buildRecordsFromSummary(normalized));
      // setUploadStatus({ fileName: "ข้อมูลจากระบบ", message: "ดึงข้อมูลสรุปผลสอบจากระบบสำเร็จ", state: "success" });
      setFilters((prev) => ({
        ...prev,
        battalion: prev.battalion || normalized[0].battalionCode || DEFAULT_BATTALION_CODES[0],
        company: prev.company || "ALL",
      }));
    } catch (err) {
      setSummaryError(err?.response?.data?.message || err?.message || "ไม่สามารถโหลดสรุปผลสอบได้");
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/exam-results/overview", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const source = res.data?.overview || res.data || {};
      setOverview({
        total: Number(source.total || 0),
        averageScore: Number(source.averageScore || 0),
        latest: source.latest || null,
      });
    } catch (err) {
      setOverviewError(err?.response?.data?.message || err?.message || "ไม่สามารถโหลดสรุปภาพรวมได้");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const fetchLatestResults = useCallback(
    async (pageOverride) => {
      setLatestLoading(true);
      setLatestError("");
      const nextPage = pageOverride || latestMeta.page || 1;
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/exam-results", {
          params: {
            page: nextPage,
            pageSize: latestMeta.pageSize || 10,
            sort: "-timestamp",
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = response.data || {};
        const items = Array.isArray(data.items) ? data.items : [];
        setLatestResults(items);
        setLatestMeta({
          page: data.page || nextPage,
          pageSize: data.pageSize || latestMeta.pageSize || 10,
          total: data.total || 0,
          totalPages: data.totalPages || 0,
        });
        setLatestFetched(true);
      } catch (err) {
        setLatestError(err?.response?.data?.message || err?.message || "ไม่สามารถโหลดข้อมูลล่าสุดได้");
      } finally {
        setLatestLoading(false);
      }
    },
    [latestMeta.page, latestMeta.pageSize]
  );

  useEffect(() => {
    fetchLatestResults();
  }, [fetchLatestResults]);

  const handleDeleteResult = useCallback(
    async (id) => {
      if (!id) return;
      const confirmation = await Swal.fire({
        title: "ยืนยันลบรายการผลสอบ?",
        text: "การลบจะไม่สามารถย้อนกลับได้",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#dc2626",
      });
      if (!confirmation.isConfirmed) return;
      setLatestDeletingId(id);
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`/api/exam-results/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        await fetchLatestResults();
      } catch (err) {
        setLatestError(err?.response?.data?.message || err?.message || "ลบรายการไม่สำเร็จ");
      } finally {
        setLatestDeletingId(null);
      }
    },
    [fetchLatestResults]
  );

  const handleDeleteAllResults = useCallback(async () => {
    const confirmation = await Swal.fire({
      title: "ยืนยันลบผลสอบทั้งหมด?",
      text: "การลบทั้งหมดจะลบทุกบันทึกและไม่สามารถย้อนกลับได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบทั้งหมด",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;
    setLatestLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete("/api/exam-results", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setLatestResults([]);
      setLatestFetched(true);
      setLatestMeta((prev) => ({ ...prev, total: 0, totalPages: 0, page: 1 }));
      await Promise.all([fetchLatestResults(1), fetchOverview()]);
    } catch (err) {
      setLatestError(err?.response?.data?.message || err?.message || "ลบผลสอบทั้งหมดไม่สำเร็จ");
    } finally {
      setLatestLoading(false);
    }
  }, [fetchLatestResults, fetchOverview]);

  useEffect(() => {
    if (!battalionOptions.includes(filters.battalion) && battalionOptions.length > 0) {
      setFilters((prev) => ({ ...prev, battalion: battalionOptions[0] }));
    }
  }, [battalionOptions, filters.battalion]);

  useEffect(() => {
    if (!companyOptions.includes(filters.company) && companyOptions.length > 0) {
      setFilters((prev) => ({ ...prev, company: companyOptions[0] }));
    }
  }, [companyOptions, filters.company]);

  const filteredRecords = useMemo(() => {
    return records.filter(
      (r) =>
        (!filters.battalion || r.battalion === filters.battalion) &&
        (!filters.company || filters.company === "ALL" || r.company === filters.company)
    );
  }, [filters.battalion, filters.company, records]);

  const companySummaryAllBattalions = useMemo(() => {
    if (summaryData?.length) {
      return summaryData.flatMap((battalion) =>
        (battalion.companies || []).map((company) => ({
          label: `พัน ${battalion.battalionCode} / ร้อย ${company.companyCode}`,
          average: Number(company.averageScore || 0),
        }))
      );
    }
    const battalionCodes = Array.from(new Set(records.map((r) => r.battalion))).sort();
    return battalionCodes.flatMap((bn) =>
      COMPANY_CODES.map((co) => {
        const targeted = records.filter((r) => r.battalion === bn && r.company === co);
        const totalScore = targeted.reduce((sum, rec) => sum + Number(rec.score || 0), 0);
        return {
          label: `พัน ${bn} / ร้อย ${co}`,
          average: targeted.length ? Number((totalScore / targeted.length).toFixed(2)) : 0,
        };
      })
    );
  }, [records, summaryData]);

  const companySummarySelectedBattalion = useMemo(() => {
    const battalion = filters.battalion || battalionOptions[0] || "";
    if (summaryData?.length) {
      const target = summaryData.find((item) => `${item.battalionCode}` === `${battalion}`);
      const companies = target?.companies || [];
      return COMPANY_CODES.map((co) => {
        const matched = companies.find((company) => `${company.companyCode}` === `${co}`);
        return {
          label: `กองร้อย ${co}`,
          average: matched ? Number(matched.averageScore || 0) : 0,
        };
      });
    }
    return COMPANY_CODES.map((co) => {
      const targeted = records.filter((r) => r.battalion === battalion && r.company === co);
      const totalScore = targeted.reduce((sum, rec) => sum + Number(rec.score || 0), 0);
      return {
        label: `กองร้อย ${co}`,
        average: targeted.length ? Number((totalScore / targeted.length).toFixed(2)) : 0,
      };
    });
  }, [filters.battalion, records, battalionOptions, summaryData]);

  const battalionSummary = useMemo(() => {
    if (summaryData?.length) {
      return summaryData.map((item) => ({
        label: `กองพัน ${item.battalionCode}`,
        average: Number(item.averageScore || 0),
        total: Number(item.total || 0),
      }));
    }
    const map = new Map();
    records.forEach((rec) => {
      const current = map.get(rec.battalion) || { label: `กองพัน ${rec.battalion}`, totalScore: 0, count: 0 };
      map.set(rec.battalion, {
        ...current,
        totalScore: current.totalScore + Number(rec.score || 0),
        count: current.count + 1,
      });
    });
    return Array.from(map.values()).map((item) => ({
      ...item,
      average: item.count ? Number((item.totalScore / item.count).toFixed(2)) : 0,
    }));
  }, [records, summaryData]);

  const summaryRows = summaryScope === SUMMARY_SCOPE.BATTALION ? battalionSummary : companySummaryAllBattalions;

  const overallSummary = useMemo(() => {
    if (summaryData?.length) {
      const scopedBattalion = filters.battalion || summaryData[0]?.battalionCode || "";
      const selectedCompanies =
        filters.company && filters.company !== "ALL" ? [filters.company] : DEFAULT_COMPANY_CODES;

      let totalStudents = 0;
      let totalScoreSum = 0;
      let maxAverage = 0;
      let minAverage = Number.POSITIVE_INFINITY;
      let maxLabel = "";

      summaryData
        .filter((b) => !scopedBattalion || `${b.battalionCode}` === `${scopedBattalion}`)
        .forEach((battalion) => {
          (battalion.companies || []).forEach((company) => {
            if (!selectedCompanies.includes(`${company.companyCode}`)) return;
            const averageScore = Number(company.averageScore || 0);
            const count = Number(company.total || 0);
            totalStudents += count;
            totalScoreSum += averageScore * count;
            maxAverage = Math.max(maxAverage, averageScore);
            minAverage = Math.min(minAverage, averageScore);
            if (averageScore >= maxAverage) {
              maxLabel = `กองร้อย ${company.companyCode} / กองพัน ${battalion.battalionCode}`;
            }
          });
        });

      const average = totalStudents ? Number((totalScoreSum / totalStudents).toFixed(2)) : 0;
      return {
        totalStudents,
        average,
        maxScore: Number(maxAverage.toFixed(2)),
        maxLabel,
        minScore: Number((minAverage === Number.POSITIVE_INFINITY ? 0 : minAverage).toFixed(2)),
      };
    }
    const totalStudents = filteredRecords.reduce((sum, rec) => sum + (Number(rec.total) || 1), 0);
    const totalScore = filteredRecords.reduce((sum, rec) => sum + Number(rec.score || 0), 0);
    const average = totalStudents ? Number((totalScore / totalStudents).toFixed(2)) : 0;
    const maxRecord = filteredRecords.reduce(
      (best, rec) => {
        const score = Number(rec.score || 0);
        if (score >= best.score) {
          return { score, label: `กองพัน ${rec.battalion} / กองร้อย ${rec.company}` };
        }
        return best;
      },
      { score: 0, label: "" }
    );
    const minScore = filteredRecords.reduce((min, rec) => Math.min(min, Number(rec.score || 100)), 100);
    return {
      totalStudents,
      average,
      maxScore: maxRecord.score,
      maxLabel: maxRecord.label,
      minScore: minScore === 100 ? 0 : minScore,
    };
  }, [filteredRecords, filters.battalion, filters.company, summaryData]);

  const buildChartOption = (labels, values, { horizontal = false } = {}) => {
    return {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          if (!params?.length) return "";
          const item = params[0];
          return `${item.name}<br/>คะแนนเฉลี่ย: ${item.data}`;
        },
      },
      grid: horizontal ? { left: 140, right: 30, top: 20, bottom: 20 } : { left: 50, right: 20, top: 30, bottom: 60 },
      xAxis: horizontal
        ? { type: "value", axisLabel: { color: "#475569" }, splitLine: { lineStyle: { color: "#e2e8f0" } }, name: "คะแนนเฉลี่ย" }
        : { type: "category", data: labels, axisLabel: { rotate: -10, color: "#475569" }, axisLine: { lineStyle: { color: "#e2e8f0" } } },
      yAxis: horizontal
        ? { type: "category", data: labels, axisLabel: { color: "#475569" }, axisLine: { lineStyle: { color: "#e2e8f0" } } }
        : { type: "value", name: "คะแนนเฉลี่ย", axisLabel: { color: "#475569" }, splitLine: { lineStyle: { color: "#e2e8f0" } } },
      series: [
        {
          type: "bar",
          barWidth: horizontal ? 16 : 32,
          data: values,
          itemStyle: {
            color: "#2563eb",
            borderRadius: horizontal ? [0, 10, 10, 0] : [10, 10, 0, 0],
          },
        },
      ],
      color: ["#2563eb"],
    };
  };

  const mainChartOption = useMemo(() => {
    const labels = summaryRows.map((item) => item.label);
    const values = summaryRows.map((item) => item.average);
    const horizontal = summaryScope === SUMMARY_SCOPE.COMPANY;
    return buildChartOption(labels, values, { horizontal });
  }, [summaryRows, summaryScope]);

  const battalionCompanyChartOption = useMemo(() => {
    const labels = companySummarySelectedBattalion.map((item) => item.label);
    const values = companySummarySelectedBattalion.map((item) => item.average);
    return buildChartOption(labels, values, { horizontal: false });
  }, [companySummarySelectedBattalion]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
    if (!isExcel) {
      setUploadStatus({
        fileName: file.name,
        message: "กรุณาอัปโหลดไฟล์ Excel (.xlsx หรือ .xls)",
        state: "error",
      });
      return;
    }
    setUploading(true);
    setUploadStatus({ fileName: file.name, message: "กำลังอัปโหลดไฟล์ไปยังระบบ...", state: "loading" });
    setSummaryData(null);
    setSummaryError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("excel", file);
    formData.append("upload", file);
    formData.append("sheet", file);

    const token = localStorage.getItem("token");
    axios
      .post("/api/exam-results/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      .then(async (res) => {
        const message =
          res?.data?.message ||
          res?.data?.data?.message ||
          `อัปโหลดไฟล์ ${file.name} สำเร็จ`;
        setUploadStatus({
          fileName: file.name,
          message,
          state: "success",
        });
        // refresh dashboard data
        await Promise.all([fetchSummary(), fetchOverview(), fetchLatestResults(1)]);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "อัปโหลดไฟล์ไม่สำเร็จ";
        setUploadStatus({
          fileName: file.name,
          message: msg,
          state: "error",
        });
        // fallback to local parse so user still sees something
        parseExcel(file)
          .then((parsed) => {
            if (parsed.length === 0) {
              setUploadStatus({
                fileName: file.name,
                message: "ไฟล์ไม่มีข้อมูลคะแนน จะแสดงด้วยข้อมูลตัวอย่าง",
                state: "warning",
              });
              setRecords(SAMPLE_RESULTS);
            } else {
              setUploadStatus({
                fileName: file.name,
                message: `นำเข้า ${parsed.length} แถวสำเร็จ (โหมดออฟไลน์)`,
                state: "success",
              });
              setRecords(parsed);
            }
          })
          .catch(() => {
            setUploadStatus({
              fileName: file.name,
              message: msg,
              state: "error",
            });
            setRecords(SAMPLE_RESULTS);
          });
      })
      .finally(() => setUploading(false));
  };

  const handleExport = () => {
    const header = ["student", "battalion", "company", "subject", "score"];
    const lines = filteredRecords.map((r) =>
      [r.student, r.battalion, r.company, r.subject || "Exam", r.score]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exam-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const sampleRows = useMemo(() => filteredRecords.slice(0, 8), [filteredRecords]);

  const displayResults = latestFetched ? latestResults : sampleRows;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 flex flex-col gap-6">
      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-3xl shadow-lg p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">
              <BarChart3 size={16} />
              สรุปผลสอบ
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">รายงานผลสอบและอัปโหลดไฟล์คะแนน</h1>
            <p className="text-sm sm:text-base text-blue-100 max-w-2xl">
              อัปโหลดไฟล์ผลสอบ (Excel) แล้วดูภาพรวมคะแนน เลือกสรุปตามกองพันหรือเทียบกองร้อยจากทุกกองพัน พร้อมกราฟเปรียบเทียบกองร้อยในกองพันที่เลือก
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <StatPill
              icon={BarChart3}
              label="จำนวนผู้เข้าสอบ (สรุป)"
              value={
                overviewLoading
                  ? "กำลังโหลด..."
                  : `${(overview.total || overallSummary.totalStudents || 0).toLocaleString()} คน`
              }
            />
            <StatPill
              icon={Upload}
              label="คะแนนเฉลี่ยรวม (สรุป)"
              value={
                overviewLoading
                  ? "กำลังโหลด..."
                  : `${overview.averageScore || overallSummary.average || 0}`
              }
            />
          </div>
        </div>
        {overviewError && (
          <div className="text-xs text-red-100 bg-white/10 border border-red-200/40 rounded-lg px-3 py-2">
            {overviewError}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">อัปโหลดผลสอบ</p>
              <h2 className="text-lg font-bold text-gray-900">ไฟล์คะแนนนักเรียน</h2>
            </div>
            {uploading && <Loader2 className="animate-spin text-blue-600" size={18} />}
          </div>

          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 transition rounded-2xl p-5 cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <Upload size={20} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">เลือกไฟล์ผลข้อสอบ</p>
              <p className="text-xs text-gray-500">รองรับไฟล์ Excel (.xlsx, .xls)</p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {uploadStatus.message && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                uploadStatus.state === "success"
                  ? "border-green-200 text-green-700 bg-green-50"
                  : uploadStatus.state === "warning"
                    ? "border-amber-200 text-amber-700 bg-amber-50"
                    : uploadStatus.state === "error"
                      ? "border-red-200 text-red-700 bg-red-50"
                      : "border-blue-100 text-blue-700 bg-blue-50"
              }`}
            >
              {uploadStatus.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
              <p className="text-xs text-gray-500">คะแนนเฉลี่ย</p>
              <p className="text-2xl font-bold text-gray-900">{overallSummary.average}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
              <p className="text-xs text-gray-500">คะแนนสูงสุด</p>
              <p className="text-2xl font-bold text-gray-900">{overallSummary.maxScore}</p>
              {overallSummary.maxLabel && <p className="text-xs text-gray-500">{overallSummary.maxLabel}</p>}
            </div>
            <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
              <p className="text-xs text-gray-500">คะแนนต่ำสุด</p>
              <p className="text-2xl font-bold text-gray-900">{overallSummary.minScore}</p>
            </div>
            {/* <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
              <p className="text-xs text-gray-500">จำนวนรายการ</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRecords.length}</p>
            </div> */}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">แผนภูมิ</p>
              <h3 className="text-lg font-bold text-gray-900">
                {summaryScope === SUMMARY_SCOPE.COMPANY ? "เปรียบเทียบกองร้อยทุกกองพัน" : "กราฟแท่งสรุปผลการสอบ"}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setSummaryScope(SUMMARY_SCOPE.BATTALION)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
                    summaryScope === SUMMARY_SCOPE.BATTALION ? "bg-blue-600 text-white shadow" : "text-gray-600"
                  }`}
                >
                  สรุปทั้งกองพัน
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryScope(SUMMARY_SCOPE.COMPANY)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
                    summaryScope === SUMMARY_SCOPE.COMPANY ? "bg-blue-600 text-white shadow" : "text-gray-600"
                  }`}
                >
                  เทียบกองร้อย (ทุกกองพัน)
                </button>
              </div>
              <select
                value={filters.battalion}
                onChange={(e) => setFilters((prev) => ({ ...prev, battalion: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
              >
                {battalionOptions.map((bn) => (
                  <option key={bn} value={bn}>
                    กองพัน {bn}
                  </option>
                ))}
              </select>
              {summaryScope === SUMMARY_SCOPE.BATTALION && (
                <select
                  value={filters.company}
                  onChange={(e) => setFilters((prev) => ({ ...prev, company: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  {companyOptions.map((co) => (
                    <option key={co} value={co}>
                      {co === "ALL" ? "ทุกกองร้อย" : `กองร้อย ${co}`}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={fetchSummary}
                disabled={summaryLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                {summaryLoading ? <Loader2 className="animate-spin" size={14} /> : <BarChart3 size={14} />}
                ดึงสรุปจากระบบ
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50"
              >
                <Download size={14} />
                ส่งออก CSV
              </button>
            </div>
          </div>

          {summaryError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {summaryError}
            </div>
          )}
          {summaryLoading && !summaryError && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              กำลังโหลดสรุปผลสอบจากระบบ...
            </div>
          )}

          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-3">
            {summaryRows.length > 0 ? (
              <ReactECharts option={mainChartOption} notMerge lazyUpdate style={{ height: summaryScope === SUMMARY_SCOPE.COMPANY ? 520 : 320, width: "100%" }} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">ยังไม่มีข้อมูลสำหรับสรุปผล</p>
            )}
          </div>
        </div>
      </section>

      {summaryScope === SUMMARY_SCOPE.COMPANY && (
        <section className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">กองพันที่เลือก</p>
              <h3 className="text-lg font-bold text-gray-900">เปรียบเทียบกองร้อยภายในกองพัน {filters.battalion}</h3>
            </div>
            <span className="text-xs text-gray-500">กองพัน {filters.battalion} | 5 กองร้อย</span>
          </div>
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-3">
            <ReactECharts option={battalionCompanyChartOption} notMerge lazyUpdate style={{ height: 320, width: "100%" }} />
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">ข้อมูลล่าสุด</p>
            <h3 className="text-lg font-bold text-gray-900">รายการผลสอบล่าสุดจากระบบ</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              แสดง {displayResults.length} รายการ (หน้า {latestMeta.page}/{Math.max(latestMeta.totalPages, 1)})
            </span>
            <button
              type="button"
              onClick={() => fetchLatestResults()}
              disabled={latestLoading}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {latestLoading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              รีเฟรช
            </button>
            <button
              type="button"
              onClick={handleDeleteAllResults}
              disabled={latestLoading || latestResults.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={14} />
              ลบทั้งหมด
            </button>
          </div>
        </div>
        {latestError && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{latestError}</div>}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">ผู้เข้าสอบ</th>
                <th className="px-4 py-2 text-left">หมายเลขทหารเรือ</th>
                <th className="px-4 py-2 text-left">หน่วย</th>
                <th className="px-4 py-2 text-left">คะแนน</th>
                <th className="px-4 py-2 text-left">เวลาสอบ</th>
                <th className="px-4 py-2 text-left">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayResults.map((row) => {
                const dateText = row.timestamp ? new Date(row.timestamp).toLocaleString("th-TH") : "-";
                const scoreText = row.scoreText || `${row.scoreValue ?? "-"}${row.scoreTotal ? ` / ${row.scoreTotal}` : ""}`;
                return (
                  <tr key={row.id || `${row.battalion}-${row.company}-${row.student}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-semibold text-gray-900">{row.fullName || row.student || "-"}</td>
                    <td className="px-4 py-2">{row.navyNumber || "-"}</td>
                    <td className="px-4 py-2">{row.unit || `${row.battalion ? `พัน.${row.battalion}` : ""} ${row.company ? `ร้อย.${row.company}` : ""}`.trim() || "-"}</td>
                    <td className="px-4 py-2 text-left font-semibold">{scoreText}</td>
                    <td className="px-4 py-2">{dateText}</td>
                    <td className="px-4 py-2">
                      {row.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteResult(row.id)}
                          disabled={latestDeletingId === row.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                        >
                          {latestDeletingId === row.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                          ลบ
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayResults.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">
                    ยังไม่มีข้อมูลให้แสดง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>รวม {latestMeta.total || displayResults.length} รายการ</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLatestResults(Math.max(1, latestMeta.page - 1))}
              disabled={latestLoading || latestMeta.page <= 1}
              className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              onClick={() => fetchLatestResults(Math.min(latestMeta.totalPages || latestMeta.page + 1, (latestMeta.page || 1) + 1))}
              disabled={latestLoading || (latestMeta.totalPages && latestMeta.page >= latestMeta.totalPages)}
              className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
