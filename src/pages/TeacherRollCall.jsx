import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import ReactECharts from "echarts-for-react";

const INITIAL_FORM = {
  subject: "",
  studentCount: "",
  company: "",
  battalion: "",
  trainingDate: "",
  trainingTime: "",
  location: "",
  duration: "",
  notes: "",
};

const parseReportsPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const getStoredRole = () => {
  try {
    return (localStorage.getItem("role") || "GUEST").toUpperCase();
  } catch {
    return "GUEST";
  }
};

const getParticipantsFromReport = (report = {}) => {
  const value = report.participantCount ?? report.studentCount ?? report.totalParticipants ?? report?.meta?.participantCount ?? 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTeacherIdentifier = (report = {}) =>
  report.teacherId ||
  report.teacher?._id ||
  report.teacher?.username ||
  report.teacherUsername ||
  report.teacherName ||
  report.createdBy ||
  "UNKNOWN";

const getTeacherDisplayName = (report = {}) => {
  const direct = report.teacherName || report.createdByName || report.teacher?.fullName || report.teacher?.name;
  if (direct) return direct;
  const composed = `${report.teacher?.firstName || ""} ${report.teacher?.lastName || ""}`.trim();
  return composed || "ไม่ระบุครูผู้สอน";
};

const adjustThaiYear = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  if (year >= 2400) {
    const adjusted = new Date(date);
    adjusted.setFullYear(year - 543);
    return adjusted;
  }
  return date;
};

const buildDateFromInputs = (dateValue, timeValue) => {
  if (!dateValue && !timeValue) return null;
  if (typeof dateValue === "string" && dateValue.includes("T")) {
    const isoDate = new Date(dateValue);
    if (!Number.isNaN(isoDate.getTime())) {
      if (timeValue && /^\d{1,2}:\d{2}/.test(timeValue)) {
        const [hours = 0, minutes = 0] = timeValue.split(":");
        isoDate.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
      }
      return adjustThaiYear(isoDate);
    }
  }
  if (dateValue) {
    const composed = `${dateValue}${timeValue ? `T${timeValue}` : "T00:00"}`;
    const date = new Date(composed);
    if (!Number.isNaN(date.getTime())) return adjustThaiYear(date);
  }
  if (timeValue) {
    const fallback = new Date(`1970-01-01T${timeValue}`);
    if (!Number.isNaN(fallback.getTime())) return adjustThaiYear(fallback);
  }
  return null;
};

const getReportDate = (report = {}) => {
  const dateFromTraining = buildDateFromInputs(report.trainingDate, report.trainingTime);
  if (dateFromTraining) return dateFromTraining;
  if (report.createdAt) {
    const created = new Date(report.createdAt);
    if (!Number.isNaN(created.getTime())) return created;
  }
  if (report.updatedAt) {
    const updated = new Date(report.updatedAt);
    if (!Number.isNaN(updated.getTime())) return updated;
  }
  return null;
};

const normalizeLeaveSummary = (payload) => {
  const source = payload?.data ?? payload ?? {};
  const totalTeachers = source.totalTeachers ?? source.total ?? 0;
  const onLeave = source.onLeave ?? source.currentOnLeave ?? source.activeLeaves ?? 0;
  const destinationsRaw = Array.isArray(source.destinations)
    ? source.destinations
    : Array.isArray(source.topDestinations)
      ? source.topDestinations
      : source.destination
        ? [{ destination: source.destination, count: source.destinationCount ?? 0 }]
        : [];
  const destinations = destinationsRaw.map((item, index) => ({
    key: item.id || item.destination || item.name || `dest-${index}`,
    label: item.destination || item.name || item.title || "ไม่ระบุ",
    count: item.count ?? item.total ?? item.value ?? 0,
  }));
  return {
    totalTeachers,
    onLeave,
    destinations,
  };
};

export default function TeacherRollCall() {
  const [role, setRole] = useState(() => getStoredRole());
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adminReports, setAdminReports] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [leaveSummaryLoading, setLeaveSummaryLoading] = useState(false);
  const [leaveSummaryError, setLeaveSummaryError] = useState("");
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminTeacherStats, setAdminTeacherStats] = useState([]);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const isAdmin = role === "ADMIN";

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get("/api/teacher/training-reports/latest", {
        headers,
        params: { limit: 5 },
      });
      setHistory(parseReportsPayload(response.data));
    } catch (_err) {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [headers]);

  const fetchAdminReports = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    setAdminError("");
    try {
      const response = await axios.get("/api/admin/training-reports", {
        headers,
        params: { limit: 100 },
      });
      const payload = response.data?.data ?? response.data ?? {};
      const normalizedReports = parseReportsPayload(payload.recentReports || payload.reports || payload);
      setAdminReports(normalizedReports);
      setAdminOverview(payload.overview || null);
      setAdminTeacherStats(Array.isArray(payload.teacherStats) ? payload.teacherStats : []);
    } catch (err) {
      setAdminReports([]);
      setAdminOverview(null);
      setAdminTeacherStats([]);
      setAdminError(err?.response?.data?.message || "ไม่สามารถโหลดข้อมูลการรายงานได้");
    } finally {
      setAdminLoading(false);
    }
  }, [headers, isAdmin]);

  const fetchLeaveSummary = useCallback(async () => {
    if (!isAdmin) return;
    setLeaveSummaryLoading(true);
    setLeaveSummaryError("");
    try {
      const response = await axios.get("/api/admin/teacher-leaves/summary", { headers });
      setLeaveSummary(normalizeLeaveSummary(response.data));
    } catch (error) {
      setLeaveSummary(null);
      setLeaveSummaryError(error?.response?.data?.message || "ไม่สามารถโหลดสรุปการลาได้");
    } finally {
      setLeaveSummaryLoading(false);
    }
  }, [headers, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminReports();
      fetchLeaveSummary();
      return;
    }
    fetchHistory();
  }, [fetchAdminReports, fetchHistory, fetchLeaveSummary, isAdmin]);

  useEffect(() => {
    const syncRole = () => setRole(getStoredRole());
    window.addEventListener("storage", syncRole);
    window.addEventListener("auth-change", syncRole);
    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("auth-change", syncRole);
    };
  }, []);

  const sortedAdminReports = useMemo(() => {
    if (!isAdmin) return [];
    return [...adminReports].sort((a, b) => (getReportDate(b)?.getTime() || 0) - (getReportDate(a)?.getTime() || 0));
  }, [adminReports, isAdmin]);

  const adminSummary = useMemo(() => {
    if (!isAdmin) {
      return {
        totalReports: 0,
        totalParticipants: 0,
        uniqueTeachers: 0,
        uniqueSchedules: 0,
        latestUpdatedAt: 0,
        teacherSummaries: [],
      };
    }

    const teacherMap = new Map();
    let totalParticipantsFromReports = 0;
    let latestUpdatedAt = 0;
    sortedAdminReports.forEach((report) => {
      const key = getTeacherIdentifier(report);
      if (!teacherMap.has(key)) {
        teacherMap.set(key, []);
      }
      teacherMap.get(key).push(report);
      totalParticipantsFromReports += getParticipantsFromReport(report);
      const ts = getReportDate(report)?.getTime() || 0;
      if (ts > latestUpdatedAt) {
        latestUpdatedAt = ts;
      }
    });

    let teacherSummaries = Array.from(teacherMap.entries()).map(([key, reports]) => {
      let lastReport = reports[0];
      let lastTimestamp = getReportDate(reports[0])?.getTime() || 0;
      let accumParticipants = 0;

      reports.forEach((report) => {
        const participants = getParticipantsFromReport(report);
        accumParticipants += participants;
        const ts = getReportDate(report)?.getTime() || 0;
        if (ts > lastTimestamp) {
          lastTimestamp = ts;
          lastReport = report;
        }
      });

      return {
        teacherKey: key,
        teacherName: getTeacherDisplayName(lastReport),
        totalReports: reports.length,
        totalParticipants: accumParticipants,
        lastSubject: lastReport?.subject || "-",
        company: lastReport?.company || "-",
        battalion: lastReport?.battalion || "-",
        lastUpdatedAt: lastTimestamp,
      };
    });

    if (adminTeacherStats.length) {
      teacherSummaries = adminTeacherStats.map((stat, index) => ({
        teacherKey: stat.teacherId || stat.teacherName || `teacher-${index}`,
        teacherName: stat.teacherName || "ไม่ระบุครูผู้สอน",
        totalReports: stat.totalReports ?? 0,
        totalParticipants: stat.totalParticipants ?? 0,
        company: stat.company || "-",
        battalion: stat.battalion || "-",
        lastSubject: stat.latestSubject || "-",
        lastUpdatedAt: stat.latestReportAt ? new Date(stat.latestReportAt).getTime() : 0,
      }));

      const latestFromStats = Math.max(
        latestUpdatedAt,
        ...teacherSummaries.map((item) => item.lastUpdatedAt || 0),
        0
      );
      if (latestFromStats > latestUpdatedAt) {
        latestUpdatedAt = latestFromStats;
      }
    }

    const uniqueScheduleSet = new Set(
      sortedAdminReports.map((report) => `${report.trainingDate || report.date || ""}-${report.trainingTime || ""}`)
    );

    const sourceOverview = adminOverview || {};

    return {
      totalReports: sourceOverview.totalReports ?? sortedAdminReports.length,
      totalParticipants: sourceOverview.totalParticipants ?? totalParticipantsFromReports,
      uniqueTeachers: sourceOverview.totalTeachersSubmitted ?? teacherSummaries.length,
      uniqueSchedules: sourceOverview.totalTrainingRounds ?? uniqueScheduleSet.size,
      latestUpdatedAt: sourceOverview.lastReportAt
        ? new Date(sourceOverview.lastReportAt).getTime()
        : latestUpdatedAt,
      teacherSummaries,
    };
  }, [adminOverview, adminTeacherStats, isAdmin, sortedAdminReports]);

  const filteredTeacherSummaries = useMemo(() => {
    if (!isAdmin) return [];
    const term = adminSearch.trim().toLowerCase();
    if (!term) return adminSummary.teacherSummaries;
    return adminSummary.teacherSummaries.filter((item) => {
      const name = item.teacherName?.toLowerCase() || "";
      const company = item.company?.toString().toLowerCase() || "";
      const battalion = item.battalion?.toString().toLowerCase() || "";
      return name.includes(term) || company.includes(term) || battalion.includes(term);
    });
  }, [adminSearch, adminSummary.teacherSummaries, isAdmin]);

  const adminLastSevenDays = useMemo(() => {
    if (!isAdmin) return { labels: [], values: [], total: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);

    const totalsByDay = new Map();
    sortedAdminReports.forEach((report) => {
      const reportDate = getReportDate(report);
      if (!reportDate) return;
      const dayKeyDate = new Date(reportDate);
      dayKeyDate.setHours(0, 0, 0, 0);
      if (dayKeyDate < startDate) return;
      const key = dayKeyDate.toISOString().slice(0, 10);
      totalsByDay.set(key, (totalsByDay.get(key) || 0) + getParticipantsFromReport(report));
    });

    const labels = [];
    const values = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      labels.push(day.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }));
      values.push(totalsByDay.get(key) || 0);
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return { labels, values, total };
  }, [isAdmin, sortedAdminReports]);

  const attendanceChartOptions = useMemo(() => {
    if (!isAdmin) return null;
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: "#2563eb" },
        },
      },
      grid: { left: 32, right: 16, top: 32, bottom: 40 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: adminLastSevenDays.labels,
        axisLine: { lineStyle: { color: "#cbd5f5" } },
        axisLabel: { color: "#475569" },
      },
      yAxis: {
        type: "value",
        name: "จำนวนนักเรียน",
        nameTextStyle: { color: "#475569", padding: [0, 0, 0, 12] },
        axisLine: { lineStyle: { color: "#cbd5f5" } },
        axisLabel: { color: "#475569" },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [
        {
          name: "ยอดผู้เข้าร่วม",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: "#1d4ed8" },
          lineStyle: { color: "#2563eb", width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(37, 99, 235, 0.25)" },
                { offset: 1, color: "rgba(37, 99, 235, 0)" },
              ],
            },
          },
          data: adminLastSevenDays.values,
        },
      ],
      color: ["#2563eb"],
    };
  }, [adminLastSevenDays, isAdmin]);

  const leaveStats = useMemo(() => {
    if (!isAdmin) {
      return { totalTeachers: 0, onLeave: 0, destinations: [] };
    }
    return leaveSummary ?? { totalTeachers: 0, onLeave: 0, destinations: [] };
  }, [isAdmin, leaveSummary]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!form.subject || !form.studentCount || !form.trainingDate || !form.trainingTime) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอกข้อมูลให้ครบ",
        text: "กรอกวิชา, จำนวนผู้เข้าร่วม และเวลาฝึกให้ครบถ้วนก่อนส่งรายงาน",
      });
      return;
    }

    const payload = {
      subject: form.subject,
      participantCount: Number(form.studentCount) || 0,
      company: form.company,
      battalion: form.battalion,
      trainingDate: form.trainingDate,
      trainingTime: form.trainingTime,
      location: form.location,
      notes: form.notes,
    };
    if (form.duration) {
      payload.durationHours = Number(form.duration) || 0;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/teacher/training-reports", payload, { headers });
      Swal.fire({
        icon: "success",
        title: "ส่งยอดสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
      setForm(INITIAL_FORM);
      fetchHistory();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ส่งยอดไม่สำเร็จ",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isAdmin) {
    const latestReports = sortedAdminReports.slice(0, 10);
    return (
      <div className="w-full flex flex-col gap-6">
        <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
          <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">OVERVIEW</p>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-900">แดชบอร์ดการส่งยอดของครูผู้สอน</h1>
              <p className="text-sm text-gray-600">
                ตรวจสอบสถานการณ์รายงานประจำวัน และติดตามว่าครูแต่ละคนได้ส่งยอดการฝึกครบถ้วนแล้วหรือไม่
              </p>
            </div>
            <button
              onClick={fetchAdminReports}
              disabled={adminLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {adminLoading ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="รายงานทั้งหมด"
            value={adminSummary.totalReports.toLocaleString("th-TH")}
            description={`ภายใน ${adminSummary.uniqueSchedules.toLocaleString("th-TH")} รอบการฝึก`}
            accent="from-blue-600 to-blue-500"
          />
          <AdminStatCard
            label="ผู้เข้าร่วมสะสม"
            value={adminSummary.totalParticipants.toLocaleString("th-TH")}
            description="รวมทุกการฝึกที่ส่งเข้ามา"
            accent="from-emerald-500 to-emerald-400"
          />
          <AdminStatCard
            label="ครูที่ส่งแล้ว"
            value={adminSummary.uniqueTeachers.toLocaleString("th-TH")}
            description="นับเฉพาะครูที่ส่งรายงานล่าสุด"
            accent="from-indigo-500 to-indigo-400"
          />
          <AdminStatCard
            label="อัปเดตล่าสุด"
            value={formatThaiDateTimeFromTimestamp(adminSummary.latestUpdatedAt)}
            description="เวลาที่มีรายงานเข้ามาล่าสุด"
            accent="from-amber-500 to-orange-400"
          />
        </section>

        <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">สรุปการลาของครูผู้สอน</p>
              <p className="text-sm text-gray-500">จำนวนครูทั้งหมด ผู้ที่กำลังลาปัจจุบัน และจุดหมายปลายทางที่ได้รับการแจ้ง</p>
            </div>
            <button
              onClick={fetchLeaveSummary}
              disabled={leaveSummaryLoading}
              className="px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            >
              {leaveSummaryLoading ? "กำลังโหลด..." : "รีเฟรชข้อมูลลา"}
            </button>
          </div>
          {leaveSummaryError && (
            <div className="text-center py-4 text-red-500 text-sm">{leaveSummaryError}</div>
          )}
          {!leaveSummaryError && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <LeaveSummaryCard
                  label="จำนวนครูทั้งหมด"
                  value={leaveStats.totalTeachers.toLocaleString("th-TH")}
                  accent="bg-gradient-to-br from-slate-500 to-slate-400"
                />
                <LeaveSummaryCard
                  label="ครูที่ลาปัจจุบัน"
                  value={leaveStats.onLeave.toLocaleString("th-TH")}
                  accent="bg-gradient-to-br from-rose-500 to-pink-400"
                />
                <LeaveSummaryCard
                  label="ครูที่ปฏิบัติหน้าที่"
                  value={(leaveStats.totalTeachers - leaveStats.onLeave >= 0
                    ? leaveStats.totalTeachers - leaveStats.onLeave
                    : 0
                  ).toLocaleString("th-TH")}
                  accent="bg-gradient-to-br from-emerald-500 to-green-400"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-500">จุดหมายยอดนิยม</p>
                {leaveSummaryLoading ? (
                  <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
                ) : leaveStats.destinations.length === 0 ? (
                  <p className="text-sm text-gray-400">ยังไม่มีข้อมูลจุดหมาย</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {leaveStats.destinations.map((destination) => (
                      <span
                        key={destination.key}
                        className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold"
                      >
                        {destination.label} · {destination.count.toLocaleString("th-TH")} คน
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">กราฟยอดนักเรียน 7 วันล่าสุด</p>
              <p className="text-sm text-gray-500">เฉลี่ยจำนวนผู้เข้าร่วมการฝึกของแต่ละวันย้อนหลังหนึ่งสัปดาห์</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">รวม 7 วัน</p>
              <p className="text-2xl font-bold text-blue-700">{adminLastSevenDays.total.toLocaleString("th-TH")} คน</p>
            </div>
          </div>
          {adminLastSevenDays.labels.length > 0 ? (
            <ReactECharts option={attendanceChartOptions} notMerge lazyUpdate style={{ height: 320, width: "100%" }} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีข้อมูลสำหรับการแสดงผลกราฟ</p>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">สถานะการส่งยอดตามครูผู้สอน</p>
              <p className="text-sm text-gray-500">สรุปจำนวนรายงานล่าสุดของแต่ละครู และหน่วยที่รับผิดชอบ</p>
            </div>
            <div className="max-w-xs w-full">
              <input
                type="text"
                value={adminSearch}
                onChange={(event) => setAdminSearch(event.target.value)}
                placeholder="ค้นหาชื่อครูหรือหน่วย"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          {adminLoading && <div className="text-center py-10 text-blue-600 font-semibold">กำลังโหลดข้อมูล...</div>}
          {!adminLoading && adminError && <div className="text-center py-10 text-red-500 font-semibold">{adminError}</div>}
          {!adminLoading && !adminError && filteredTeacherSummaries.length === 0 && (
            <div className="text-center py-10 text-gray-400">ยังไม่มีข้อมูลการส่ง</div>
          )}
          {!adminLoading && !adminError && filteredTeacherSummaries.length > 0 && (
            <div className="grid gap-4">
              {filteredTeacherSummaries.map((item) => (
                <TeacherStatCard key={item.teacherKey} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">รายงานล่าสุด</p>
              <p className="text-sm text-gray-500">แสดง 10 รายการล่าสุดของทุกครู</p>
            </div>
          </div>
          <div className="grid gap-3">
            {latestReports.length === 0 && !adminLoading && (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูลการส่ง</p>
            )}
            {latestReports.map((item) => (
              <div
                key={item.id || item._id || `${item.subject}-${item.trainingDate}-${item.trainingTime}-${item.teacherId}`}
                className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-gray-900">
                    {item.subject || "ไม่ระบุวิชา"} · {getParticipantsFromReport(item).toLocaleString("th-TH")} คน
                  </p>
                  <span className="text-sm text-gray-500">{formatThaiDate(item.trainingDate, item.trainingTime)}</span>
                </div>
                <p className="text-sm text-gray-600">
                  ครู: {getTeacherDisplayName(item)} | ร้อยฝึก {item.company || "-"} | พันฝึก {item.battalion || "-"} | สถานที่{" "}
                  {item.location || "-"}
                </p>
                {item.notes && <p className="text-sm text-gray-500 italic">หมายเหตุ: {item.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
        <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">TEACHER</p>
        <h1 className="text-3xl font-bold text-blue-900">ส่งยอดนักเรียนก่อนเริ่มฝึก</h1>
        <p className="text-sm text-gray-600">
          รายงานจำนวนผู้เข้าร่วม วิชา หน่วยฝึก และกำหนดการ เพื่อให้ฝ่ายอำนวยการรับทราบพร้อมดำเนินการสนับสนุน
        </p>
      </header>

      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-6">
        <div>
          <p className="text-lg font-semibold text-gray-800">ฟอร์มรายงาน</p>
          <p className="text-sm text-gray-500">กรอกข้อมูลรายละเอียดการฝึกให้ครบถ้วนก่อนเริ่มสอน</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span>วิชา</span>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น การใช้อาวุธปืนประจำกาย"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>จำนวนผู้เข้าร่วม</span>
              <input
                type="number"
                min="0"
                name="studentCount"
                value={form.studentCount}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น 160"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>ร้อยฝึกที่</span>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="ระบุร้อยฝึกหรือหมวด"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>พันฝึกที่</span>
              <input
                type="text"
                name="battalion"
                value={form.battalion}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="ระบุพันฝึก/กองร้อย"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>วันที่สอน</span>
              <input
                type="date"
                name="trainingDate"
                value={form.trainingDate}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>เวลา</span>
              <input
                type="time"
                name="trainingTime"
                value={form.trainingTime}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span>สถานที่ฝึก</span>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="ลานฝึก/อาคาร/สนาม"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>ระยะเวลาสอน (ชั่วโมง)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                name="duration"
                value={form.duration}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น 2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span>หมายเหตุเพิ่มเติม</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="ระบุข้อควรระวัง วัสดุที่ต้องการ หรือผู้ช่วยฝึก"
            />
          </label>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => setForm(INITIAL_FORM)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50"
              disabled={submitting}
            >
              ล้างฟอร์ม
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-800 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "กำลังส่ง..." : "ส่งยอดนักเรียน"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-800">ประวัติการส่งล่าสุด</p>
            <p className="text-sm text-gray-500">บันทึก 5 รายการล่าสุดเพื่อการตรวจสอบอย่างรวดเร็ว</p>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-60"
          >
            {loadingHistory ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>
        <div className="grid gap-3">
          {history.length === 0 && !loadingHistory && (
            <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูลการส่ง</p>
          )}
          {history.map((item) => (
            <div
              key={item.id || item._id || `${item.subject}-${item.trainingDateTime}`}
              className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-gray-900">
                  {item.subject || "ไม่ระบุวิชา"} · {item.participantCount || 0} คน
                </p>
                <span className="text-sm text-gray-500">
                  {formatThaiDate(item.trainingDate, item.trainingTime)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                ร้อยฝึก {item.company || "-"} | พันฝึก {item.battalion || "-"} | สถานที่ {item.location || "-"} | ระยะเวลา{" "}
                {item.durationHours ?? "-"} ชม.
              </p>
              {item.notes && <p className="text-sm text-gray-500 italic">หมายเหตุ: {item.notes}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatThaiDate(dateValue, timeValue) {
  const date = buildDateFromInputs(dateValue, timeValue);
  if (!date) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatThaiDateTimeFromTimestamp(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminStatCard({ label, value, description, accent }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow bg-gradient-to-br ${accent}`}>
      <p className="text-sm text-white/80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {description && <p className="text-xs text-white/70 mt-1">{description}</p>}
    </div>
  );
}

function LeaveSummaryCard({ label, value, accent }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow ${accent}`}>
      <p className="text-sm text-white/80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function TeacherStatCard({ item }) {
  const totalReports = Number(item.totalReports || 0).toLocaleString("th-TH");
  const totalParticipants = Number(item.totalParticipants || 0).toLocaleString("th-TH");
  return (
    <div className="border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:border-blue-200 transition">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-gray-900">{item.teacherName || "ไม่ระบุครูผู้สอน"}</p>
          <p className="text-sm text-gray-500">
            จำนวนรายงาน {totalReports} รายงาน · วิชาล่าสุด {item.lastSubject || "-"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">ผู้เข้าร่วมสะสม</p>
          <p className="text-3xl font-bold text-blue-700">{totalParticipants} คน</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4 text-sm text-gray-600">
        <TeacherStatDetail label="ร้อยฝึกที่" value={item.company || "-"} />
        <TeacherStatDetail label="พันฝึกที่" value={item.battalion || "-"} />
        <TeacherStatDetail label="วิชาล่าสุด" value={item.lastSubject || "-"} />
        <TeacherStatDetail label="ส่งล่าสุด" value={formatThaiDateTimeFromTimestamp(item.lastUpdatedAt)} />
      </div>
    </div>
  );
}

function TeacherStatDetail({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-base text-gray-900">{value || "-"}</span>
    </div>
  );
}
