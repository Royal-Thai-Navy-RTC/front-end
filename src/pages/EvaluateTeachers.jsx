import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import navy from "../assets/navy.png";
import Swal from "sweetalert2";
import ReactECharts from "echarts-for-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const resolveAvatarUrl = (value = "") => {
  if (!value) return "";
  if (value.startsWith("data:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path}`;
};

const formatThaiDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const computeEvaluationStats = (evaluation) => {
  if (!evaluation) return { totalAnswers: 0, averageRating: 0 };

  const stats = evaluation.stats || {};
  const statsTotal = Number(stats.totalAnswers);
  const statsAverage = Number(stats.averageRating);

  let totalAnswers = Number.isFinite(statsTotal) && statsTotal > 0 ? statsTotal : 0;
  let averageRating = Number.isFinite(statsAverage) && statsAverage > 0 ? statsAverage : 0;

  if (totalAnswers === 0 || averageRating === 0) {
    const answers = Array.isArray(evaluation.answers) ? evaluation.answers : [];
    const validRatings = answers
      .map((answer) => Number(answer.rating))
      .filter((rating) => Number.isFinite(rating) && rating >= 0);

    if (validRatings.length > 0) {
      const sum = validRatings.reduce((acc, rating) => acc + rating, 0);
      totalAnswers = validRatings.length;
      averageRating = sum / validRatings.length;
    }
  }

  return {
    totalAnswers,
    averageRating,
  };
};

const aggregateEvaluationStats = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { totalAnswers: 0, averageRating: 0, lastEvaluatedAt: "" };
  }

  const aggregate = items.reduce(
    (acc, item) => {
      const { totalAnswers, averageRating } = computeEvaluationStats(item);

      if (totalAnswers > 0) {
        acc.weightedScore += averageRating * totalAnswers;
        acc.weight += totalAnswers;
      } else if (averageRating > 0) {
        acc.weightedScore += averageRating;
        acc.weight += 1;
      }

      acc.totalAnswers += totalAnswers;

      if (item?.evaluatedAt) {
        const timestamp = new Date(item.evaluatedAt).getTime();
        if (!Number.isNaN(timestamp) && (acc.latestTimestamp === null || timestamp > acc.latestTimestamp)) {
          acc.latestTimestamp = timestamp;
        }
      }

      return acc;
    },
    {
      totalAnswers: 0,
      weightedScore: 0,
      weight: 0,
      latestTimestamp: null,
    }
  );

  return {
    totalAnswers: aggregate.totalAnswers,
    averageRating: aggregate.weight > 0 ? aggregate.weightedScore / aggregate.weight : 0,
    lastEvaluatedAt: aggregate.latestTimestamp ? new Date(aggregate.latestTimestamp).toISOString() : "",
  };
};

export default function EvaluateTeachers() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, fallback } = location.state || {};
  const [teacher, setTeacher] = useState(fallback || null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(Boolean(userId));
  const [evaluationsError, setEvaluationsError] = useState("");
  const [evaluationsReloadKey, setEvaluationsReloadKey] = useState(0);
  const [evaluationMeta, setEvaluationMeta] = useState({
    page: 1,
    pageSize: 0,
    total: 0,
    totalPages: 1,
  });
  const [evaluationStats, setEvaluationStats] = useState({
    totalAnswers: 0,
    averageRating: 0,
    lastEvaluatedAt: "",
  });
  const [activeEvaluationIndex, setActiveEvaluationIndex] = useState(-1);
  const [importingEvaluations, setImportingEvaluations] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError("ไม่พบข้อมูลผู้สอน กรุณากลับไปเลือกรายชื่ออีกครั้ง");
      setEvaluationsLoading(false);
      return;
    }

    const fetchTeacher = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`/api/admin/users/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = response.data?.data ?? response.data;
        setTeacher(payload);
      } catch (err) {
        const message = err.response?.data?.message || "ไม่สามารถดึงข้อมูลผู้สอนได้";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();
  }, [userId]);

  const evaluationTeacherId = teacher?.id ?? userId ?? fallback?.id ?? null;

  useEffect(() => {
    if (!evaluationTeacherId) {
      setEvaluationsLoading(false);
      return;
    }

    let active = true;
    const fetchEvaluations = async () => {
      setEvaluationsLoading(true);
      setEvaluationsError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/evaluations", {
          params: { teacherId: evaluationTeacherId },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!active) return;

        const payload = response.data ?? {};
        const records = Array.isArray(payload.data) ? payload.data : [];

        setEvaluations(records);
        setEvaluationMeta({
          page: payload.page ?? 1,
          pageSize: payload.pageSize ?? records.length,
          total: payload.total ?? records.length,
          totalPages: payload.totalPages ?? 1,
        });

        const aggregated = aggregateEvaluationStats(records);
        setEvaluationStats(aggregated);
      } catch (err) {
        if (!active) return;
        const message = err.response?.data?.message || "ไม่สามารถดึงข้อมูลการประเมินได้";
        setEvaluationsError(message);
        setEvaluations([]);
        setEvaluationMeta({ page: 1, pageSize: 0, total: 0, totalPages: 1 });
        setEvaluationStats({ totalAnswers: 0, averageRating: 0, lastEvaluatedAt: "" });
      } finally {
        if (active) {
          setEvaluationsLoading(false);
        }
      }
    };

    fetchEvaluations();

    return () => {
      active = false;
    };
  }, [evaluationTeacherId, evaluationsReloadKey]);

  useEffect(() => {
    if (evaluations.length > 0) {
      setActiveEvaluationIndex(0);
    } else {
      setActiveEvaluationIndex(-1);
    }
  }, [evaluations.length]);

  const teacherProfile = useMemo(() => {
    const source = teacher || fallback || {};
    const fullName = `${source.firstName || ""} ${source.lastName || ""}`.trim();
    const photo = resolveAvatarUrl(source.avatar || source.profileImage);
    const qualification = source.education || source.qualification || "ไม่ระบุ";
    const subject = source.subject || source.position || source.department || "ไม่ระบุ";
    return {
      name: fullName || source.username || "-",
      rank: source.rank || "ไม่ระบุ",
      qualification,
      subject,
      experience: source.experience || "-",
      cycle: source.evaluationCycle || "-",
      email: source.email || "-",
      phone: source.phone || "-",
      birthDate: source.birthDate ? formatThaiDate(source.birthDate) : "-",
      address: source.fullAddress || "-",
      emergencyContactName: source.emergencyContactName || "-",
      emergencyContactPhone: source.emergencyContactPhone || "-",
      medicalHistory: source.medicalHistory || "-",
      createdAt: source.createdAt ? formatThaiDate(source.createdAt) : "-",
      updatedAt: source.updatedAt ? formatThaiDate(source.updatedAt) : "-",
      photo: photo || navy,
    };
  }, [teacher, fallback]);

  const averageRatingDisplay = Number(evaluationStats.averageRating || 0).toFixed(2);
  const lastEvaluationDisplay = evaluationStats.lastEvaluatedAt ? formatThaiDate(evaluationStats.lastEvaluatedAt) : "-";
  const totalEvaluationsDisplay = evaluationMeta.total ?? evaluations.length;
  const selectedEvaluation = activeEvaluationIndex >= 0 ? evaluations[activeEvaluationIndex] : null;
  const selectedAnswers = Array.isArray(selectedEvaluation?.answers) ? selectedEvaluation.answers : [];

  const chartOptions = useMemo(() => {
    const dates = evaluations.map((item) => (item.evaluatedAt ? formatThaiDate(item.evaluatedAt) : "ไม่ระบุ"));
    const scores = evaluations.map((item) => {
      const stats = computeEvaluationStats(item);
      return Number(stats.averageRating?.toFixed(2)) || 0;
    });

    return {
      textStyle: { fontFamily: "kanit, sans-serif" },
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dates.length ? dates : ["-"],
      },
      yAxis: { type: "value", min: 0, max: 5 },
      series: [
        {
          name: "คะแนนเฉลี่ย",
          type: "line",
          data: scores.length ? scores : [0],
          smooth: true,
          areaStyle: { color: "rgba(37, 99, 235, 0.12)" },
          lineStyle: { color: "#2563eb", width: 3 },
          symbolSize: 10,
        },
      ],
    };
  }, [evaluations]);

  const handleSelectEvaluation = (index) => {
    setActiveEvaluationIndex(index);
  };

  const handleEvaluationImport = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!evaluationTeacherId) {
      Swal.fire({ icon: "warning", title: "ไม่พบผู้สอน", text: "ไม่สามารถนำเข้าข้อมูลได้" });
      input.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("teacherId", evaluationTeacherId);

    setImportingEvaluations(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/evaluations/import", formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "multipart/form-data",
        },
      });
      Swal.fire({ icon: "success", title: "นำเข้าข้อมูลสำเร็จ" });
      setEvaluationsReloadKey((prev) => prev + 1);
    } catch (err) {
      const message = err.response?.data?.message || "ไม่สามารถนำเข้าข้อมูลได้";
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: message });
    } finally {
      setImportingEvaluations(false);
      input.value = "";
    }
  };

  return (
    <div className="flex flex-col w-full h-full gap-6">
      <section className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 w-full lg:w-1/3 shadow-inner border border-blue-100">
            <img src={teacherProfile.photo} alt="Teacher" className="max-w-[240px] w-full object-contain rounded-2xl shadow" />
          </div>
          <div className="flex flex-col gap-6 w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow">
              <p className="text-sm uppercase tracking-widest text-white/80">Teacher</p>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-extrabold">{teacherProfile.name}</p>
                  <p className="text-sm text-white/70 mt-1">ชื่อ-สกุล</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/70">ตำแหน่ง</p>
                  <p className="text-2xl font-semibold">{teacherProfile.rank}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
              <h3 className="text-lg font-semibold text-gray-900">ข้อมูลติดต่อ</h3>
              <div className="grid md:grid-cols-2 gap-3 mt-3 text-gray-600">
                <InfoPair label="อีเมล" value={teacherProfile.email} />
                <InfoPair label="เบอร์ติดต่อ" value={teacherProfile.phone} />
                <InfoPair label="ผู้ติดต่อฉุกเฉิน" value={teacherProfile.emergencyContactName} />
                <InfoPair label="เบอร์ฉุกเฉิน" value={teacherProfile.emergencyContactPhone} />
              </div>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-5 text-gray-700">
          <div className="col-span-2 grid sm:grid-cols-2 gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionPair label="วุฒิการศึกษา" value={teacherProfile.qualification} />
            <SectionPair label="วิชาที่รับผิดชอบ / หน้าที่" value={teacherProfile.subject} />
            <SectionPair label="วันเกิด" value={teacherProfile.birthDate} />
            <SectionPair label="ที่อยู่" value={teacherProfile.address} />
            <SectionPair label="ประวัติการแพทย์" value={teacherProfile.medicalHistory} />
            <SectionPair label="วันที่สร้างข้อมูล" value={teacherProfile.createdAt} />
            <SectionPair label="อัปเดตล่าสุด" value={teacherProfile.updatedAt} />
          </div>
          <div className="bg-gradient-to-b from-blue-50 to-white rounded-2xl p-5 border border-blue-100 shadow-sm flex flex-col gap-4">
            <EvaluationImportPanel onFileSelected={handleEvaluationImport} importing={importingEvaluations} />
            <DownloadTemplatePanel />
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        <MetricCard
          label="จำนวนการประเมิน"
          value={totalEvaluationsDisplay}
          trend={`หน้า ${evaluationMeta.page ?? 1}/${evaluationMeta.totalPages ?? 1}`}
          color="from-blue-500 to-blue-700"
        />
        <MetricCard
          label="คะแนนเฉลี่ย"
          value={averageRatingDisplay}
          trend="เฉลี่ยแบบถ่วงน้ำหนัก"
          color="from-emerald-500 to-emerald-600"
        />
        <MetricCard
          label="จำนวนคำตอบ"
          value={evaluationStats.totalAnswers}
          trend="รวมทุกหัวข้อ"
          color="from-violet-500 to-violet-600"
        />
        <MetricCard
          label="การประเมินล่าสุด"
          value={lastEvaluationDisplay}
          trend={evaluationStats.lastEvaluatedAt ? "มีการส่งผลล่าสุด" : "ยังไม่มีข้อมูลล่าสุด"}
          color="from-amber-500 to-orange-500"
        />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xl font-semibold">สรุปการประเมิน</p>
            <span className="text-sm text-gray-500">โดยนักเรียน</span>
          </div>
          <div className="space-y-4">
            {evaluationsLoading ? (
              <p className="text-sm text-blue-600">กำลังโหลดผลการประเมิน...</p>
            ) : evaluationsError ? (
              <p className="text-sm text-red-600">{evaluationsError}</p>
            ) : evaluations.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีข้อมูลการประเมิน</p>
            ) : (
              evaluations.map((item, index) => (
                <EvaluationItem
                  key={item.id ?? `${item.teacherId}-${item.subject}-${item.evaluatedAt}`}
                  evaluation={item}
                  isActive={index === activeEvaluationIndex}
                  onSelect={() => handleSelectEvaluation(index)}
                />
              ))
            )}
          </div>
        </div>
        <EvaluationAnswers evaluation={selectedEvaluation} answers={selectedAnswers} loading={evaluationsLoading} />
      </section>
    </div>
  );
}

function EvaluationAnswers({ evaluation, answers = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
        <p className="text-xl font-semibold">คำถามในแบบประเมิน</p>
        <p className="text-sm text-blue-600">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
        <p className="text-xl font-semibold">คำถามในแบบประเมิน</p>
        <p className="text-sm text-gray-500">กรุณาเลือกผลการประเมินทางด้านซ้ายเพื่อดูรายละเอียด</p>
      </div>
    );
  }

  const displaySubject = evaluation.subject || "ไม่ระบุหัวข้อ";
  const evaluatedAtText = evaluation.evaluatedAt ? formatThaiDate(evaluation.evaluatedAt) : "-";
  const derivedStats = computeEvaluationStats(evaluation);
  const hasStats = derivedStats.averageRating > 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold">{displaySubject}</p>
          <p className="text-sm text-gray-500">
            โดย {evaluation.evaluatorName || "ไม่ระบุ"} • {evaluatedAtText}
          </p>
          {evaluation.evaluatorUnit && <p className="text-xs text-gray-500 mt-1">{evaluation.evaluatorUnit}</p>}
        </div>
        {hasStats && (
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-700">{derivedStats.averageRating.toFixed(2)}</p>
            <p className="text-xs text-gray-500">เฉลี่ยจาก {derivedStats.totalAnswers ?? "-"} คำตอบ</p>
          </div>
        )}
      </div>

      {answers.length === 0 ? (
        <p className="text-sm text-gray-500">ไม่มีคำตอบสำหรับผลการประเมินนี้</p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {answers.map((answer) => (
            <div
              key={answer.id ?? `${answer.itemCode}-${answer.itemText}`}
              className="border border-gray-100 rounded-xl p-3 hover:border-blue-200 transition"
            >
              <p className="text-sm text-gray-500 mb-1">{answer.itemCode ? `ข้อ ${answer.itemCode}` : "คำถาม"}</p>
              <p className="font-semibold text-gray-900">{answer.itemText}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{answer.section || "ไม่ระบุหมวดหมู่"}</span>
                <span className="text-lg font-bold text-blue-700">{answer.rating ?? "-"}/5</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoPair({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-base font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function SectionPair({ label, value }) {
  return (
    <div className="flex flex-col bg-gray-50/70 rounded-xl p-3 border border-gray-100">
      <span className="text-xs uppercase tracking-wider text-gray-500">{label}</span>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, trend, color }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${color}`}>
      <p className="text-sm text-white/80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 text-white/90">{trend}</p>
    </div>
  );
}

function EvaluationImportPanel({ onFileSelected, importing }) {
  return (
    <div className="flex-1 flex flex-col gap-2">
      <p className="text-base font-semibold text-gray-800">อัปโหลดไฟล์ประเมิน</p>
      <p className="text-xs text-gray-500">รองรับไฟล์ Excel (.xlsx, .xls)</p>
      <p className="text-xs text-red-500 font-semibold">ต้องใช้ไฟล์ตาม Template เท่านั้น ไม่รองรับรูปแบบอื่น</p>
      <p className="text-xs text-gray-500">
        ระบบจะนำเข้าข้อมูลการประเมินและอัปเดตสถิติให้โดยอัตโนมัติหลังอัปโหลดสำเร็จ
      </p>
      <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-blue-300 text-blue-700 font-semibold cursor-pointer hover:bg-blue-50 transition w-full">
        {importing ? "กำลังอัปโหลด..." : "เลือกไฟล์เพื่อนำเข้า"}
        <input
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={onFileSelected}
          disabled={importing}
        />
      </label>
    </div>
  );
}

function DownloadTemplatePanel() {
  const handleDownload = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/evaluations/template/download", {
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const disposition = response.headers["content-disposition"] || "";
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || "evaluation-template.xlsx";
      const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err.response?.data?.message || "ไม่สามารถดาวน์โหลดไฟล์ได้";
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: message });
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-2">
      <p className="text-base font-semibold text-gray-800">ดาวน์โหลดเทมเพลต</p>
      <p className="text-xs text-gray-500">
        ใช้ไฟล์นี้เติมผลการประเมินใหม่ แล้วนำกลับมาอัปโหลดเพื่อบันทึกเข้าระบบ
      </p>
      <button
        onClick={handleDownload}
        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-green-400 text-green-700 font-semibold hover:bg-green-50 transition"
      >
        ดาวน์โหลดไฟล์
      </button>
    </div>
  );
}

function EvaluationItem({ evaluation, isActive, onSelect }) {
  const { subject, evaluatorName, evaluatedAt, notes } = evaluation || {};
  const derivedStats = computeEvaluationStats(evaluation);
  const scoreDisplay = derivedStats.averageRating ? derivedStats.averageRating.toFixed(2) : "-";
  const totalAnswers = derivedStats.totalAnswers ?? "-";

  const subtitleParts = [];
  if (evaluatorName) subtitleParts.push(`โดย ${evaluatorName}`);
  const evaluatedText = evaluatedAt ? formatThaiDate(evaluatedAt) : "";
  if (evaluatedText) subtitleParts.push(evaluatedText);
  const subtitle = subtitleParts.join(" • ");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between border rounded-xl p-4 text-left transition ${
        isActive ? "border-blue-400 bg-blue-50/40" : "border-gray-100 hover:border-blue-200"
      }`}
    >
      <div>
        <p className="font-semibold text-gray-900">{subject || "ไม่ระบุหัวข้อ"}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        {notes && <p className="text-sm text-gray-500 mt-1">{notes}</p>}
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-blue-700">{scoreDisplay}</p>
        <p className="text-xs text-gray-500">เฉลี่ยจาก {totalAnswers} คำตอบ</p>
      </div>
    </button>
  );
}
