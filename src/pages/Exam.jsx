import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Upload, FileUp, BarChart3, Loader2, Download } from "lucide-react";

const SUMMARY_SCOPE = {
  BATTALION: "BATTALION",
  COMPANY: "COMPANY",
};

const COMPANY_CODES = ["1", "2", "3", "4", "5"];

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
  const [summaryScope, setSummaryScope] = useState(SUMMARY_SCOPE.BATTALION);
  const [filters, setFilters] = useState({ battalion: SAMPLE_RESULTS[0].battalion, company: "ALL" });
  const [uploadStatus, setUploadStatus] = useState({ fileName: "", message: "", state: "" });
  const [uploading, setUploading] = useState(false);

  const battalionOptions = useMemo(() => {
    const uniq = Array.from(new Set(records.map((r) => r.battalion)));
    return uniq.sort();
  }, [records]);

  const companyOptions = useMemo(() => ["ALL", ...COMPANY_CODES], []);

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

  const summaryRows = useMemo(() => {
    if (summaryScope === SUMMARY_SCOPE.COMPANY) {
      const battalionCodes = Array.from(new Set(records.map((r) => r.battalion))).sort();
      return battalionCodes.flatMap((bn) =>
        COMPANY_CODES.map((co) => {
          const targeted = records.filter((r) => r.battalion === bn && r.company === co);
          const totalScore = targeted.reduce((sum, rec) => sum + Number(rec.score || 0), 0);
          return {
            label: `พัน ${bn} / ร้อย ${co}`,
            totalScore,
            count: targeted.length,
            average: targeted.length ? Number((totalScore / targeted.length).toFixed(2)) : 0,
          };
        })
      );
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
  }, [records, summaryScope]);

  const overallSummary = useMemo(() => {
    const totalStudents = filteredRecords.length;
    const totalScore = filteredRecords.reduce((sum, rec) => sum + Number(rec.score || 0), 0);
    const average = totalStudents ? Number((totalScore / totalStudents).toFixed(2)) : 0;
    const maxScore = filteredRecords.reduce((max, rec) => Math.max(max, Number(rec.score || 0)), 0);
    const minScore = filteredRecords.reduce((min, rec) => Math.min(min, Number(rec.score || 100)), 100);
    return { totalStudents, average, maxScore, minScore: minScore === 100 ? 0 : minScore };
  }, [filteredRecords]);

  const chartOption = useMemo(() => {
    const categories = summaryRows.map((item) => item.label);
    const values = summaryRows.map((item) => item.average);

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          if (!params?.length) return "";
          const item = params[0];
          return `${item.name}<br/>คะแนนเฉลี่ย: ${item.data}`;
        },
      },
      grid:
        summaryScope === SUMMARY_SCOPE.COMPANY
          ? { left: 140, right: 30, top: 20, bottom: 20 }
          : { left: 50, right: 20, top: 30, bottom: 60 },
      xAxis:
        summaryScope === SUMMARY_SCOPE.COMPANY
          ? {
              type: "value",
              axisLabel: { color: "#475569" },
              splitLine: { lineStyle: { color: "#e2e8f0" } },
              name: "คะแนนเฉลี่ย",
            }
          : {
              type: "category",
              data: categories,
              axisLabel: { rotate: -10, color: "#475569" },
              axisLine: { lineStyle: { color: "#e2e8f0" } },
            },
      yAxis:
        summaryScope === SUMMARY_SCOPE.COMPANY
          ? {
              type: "category",
              data: categories,
              axisLabel: { color: "#475569" },
              axisLine: { lineStyle: { color: "#e2e8f0" } },
            }
          : {
              type: "value",
              name: "คะแนนเฉลี่ย",
              axisLabel: { color: "#475569" },
              splitLine: { lineStyle: { color: "#e2e8f0" } },
            },
      series: [
        {
          type: "bar",
          barWidth: summaryScope === SUMMARY_SCOPE.COMPANY ? 16 : 32,
          data: values,
          itemStyle: {
            color: "#2563eb",
            borderRadius: summaryScope === SUMMARY_SCOPE.COMPANY ? [0, 10, 10, 0] : [10, 10, 0, 0],
          },
        },
      ],
      color: ["#2563eb"],
    };
  }, [summaryRows, summaryScope]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus({ fileName: file.name, message: "กำลังอ่านไฟล์...", state: "loading" });

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result?.toString() || "";
        const parsed = parseCsv(text);
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
            message: `นำเข้า ${parsed.length} แถวสำเร็จ`,
            state: "success",
          });
          setRecords(parsed);
        }
      } catch (err) {
        setUploadStatus({
          fileName: file.name,
          message: "ไม่สามารถอ่านไฟล์ กรุณาตรวจสอบรูปแบบ CSV",
          state: "error",
        });
        setRecords(SAMPLE_RESULTS);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file, "utf-8");
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

  return (
    <div className="w-full max-w-7xl mx-auto py-6 flex flex-col gap-6">
      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-3xl shadow-lg p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">
              <BarChart3 size={16} />
              สรุปผลสอบ
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">สรุปผลการสอบและอัปโหลดไฟล์คะแนน</h1>
            <p className="text-sm sm:text-base text-blue-100 max-w-2xl">
              ส่งไฟล์ผลข้อสอบนักเรียน (CSV) แล้วดูกราฟสรุปคะแนน เลือกสรุปทั้งกองพันหรือเปรียบเทียบทุกกองร้อยจากทุกกองพัน
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <StatPill icon={FileUp} label="ไฟล์ล่าสุด" value={uploadStatus.fileName || "ข้อมูลตัวอย่าง"} />
            <StatPill icon={Upload} label="จำนวนผู้เข้าสอบ" value={`${overallSummary.totalStudents} คน`} />
          </div>
        </div>
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
              <p className="text-xs text-gray-500">รองรับไฟล์ .csv (คอลัมน์: battalion, company, student, score)</p>
            </div>
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
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
            </div>
            <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
              <p className="text-xs text-gray-500">คะแนนต่ำสุด</p>
              <p className="text-2xl font-bold text-gray-900">{overallSummary.minScore}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
              <p className="text-xs text-gray-500">จำนวนรายการ</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRecords.length}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">แผนภูมิ</p>
              <h3 className="text-lg font-bold text-gray-900">
                {summaryScope === SUMMARY_SCOPE.COMPANY ? "เปรียบเทียบ 20 กองร้อย (ทุกกองพัน)" : "กราฟแท่งสรุปผลการสอบ"}
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
                  เทียบทุกกองร้อย
                </button>
              </div>
              <select
                value={filters.battalion}
                onChange={(e) => setFilters((prev) => ({ ...prev, battalion: e.target.value }))}
                disabled={summaryScope === SUMMARY_SCOPE.COMPANY}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white disabled:text-gray-400"
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
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50"
              >
                <Download size={14} />
                ส่งออก CSV
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-3">
            {summaryRows.length > 0 ? (
              <ReactECharts option={chartOption} notMerge lazyUpdate style={{ height: summaryScope === SUMMARY_SCOPE.COMPANY ? 520 : 320, width: "100%" }} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">ยังไม่มีข้อมูลสำหรับสรุปผล</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">ข้อมูลล่าสุด</p>
            <h3 className="text-lg font-bold text-gray-900">ตัวอย่างรายการคะแนนจากไฟล์</h3>
          </div>
          <span className="text-xs text-gray-500">แสดง {sampleRows.length} รายการแรกจาก {filteredRecords.length}</span>
        </div>
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">ผู้เข้าสอบ</th>
                <th className="px-4 py-2 text-left">กองพัน</th>
                <th className="px-4 py-2 text-left">กองร้อย</th>
                <th className="px-4 py-2 text-left">วิชา</th>
                <th className="px-4 py-2 text-right">คะแนน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sampleRows.map((row) => (
                <tr key={`${row.battalion}-${row.company}-${row.student}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-gray-900">{row.student}</td>
                  <td className="px-4 py-2">{row.battalion}</td>
                  <td className="px-4 py-2">{row.company}</td>
                  <td className="px-4 py-2">{row.subject}</td>
                  <td className="px-4 py-2 text-right font-semibold">{row.score}</td>
                </tr>
              ))}
              {sampleRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                    ยังไม่มีข้อมูลให้แสดง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
