import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const LEAVE_TYPES = [
  { value: "PERSONAL", label: "ลากิจ" },
  { value: "SICK", label: "ลาป่วย" },
  { value: "ANNUAL", label: "ลาพักผ่อน" },
  { value: "OTHER", label: "อื่นๆ" },
];

const INITIAL_FORM = {
  leaveType: "PERSONAL",
  startDate: "",
  endDate: "",
  destination: "",
  reason: "",
};

const parseLeaves = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.items)) return raw.data.items;
  return [];
};

const getStoredRole = () => {
  try {
    return (localStorage.getItem("role") || "GUEST").toUpperCase();
  } catch {
    return "GUEST";
  }
};

const normalizeSummary = (payload) => {
  const source = payload?.data ?? payload ?? {};
  const overview = source.overview || {};
  const totalTeachers = overview.totalTeachers ?? source.totalTeachers ?? source.total ?? 0;
  const totalLeaveRequests = overview.totalLeaveRequests ?? source.totalLeaveRequests ?? 0;
  const onLeave = overview.currentOnLeave ?? source.currentOnLeave ?? source.onLeave ?? 0;
  const availableTeachers =
    overview.availableTeachers ??
    source.availableTeachers ??
    (totalTeachers - onLeave >= 0 ? totalTeachers - onLeave : 0);
  const currentLeaves = parseLeaves(source.currentLeaves);
  const recentLeaves = parseLeaves(source.recentLeaves);
  return {
    totalTeachers,
    totalLeaveRequests,
    onLeave,
    availableTeachers,
    currentLeaves,
    recentLeaves,
  };
};

const formatDateRange = (start, end) => {
  if (!start) return "-";
  const startDate = new Date(start);
  const startText = startDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  if (!end) return startText;
  const endDate = new Date(end);
  const endText = endDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  return `${startText} - ${endText}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getLeaveTypeLabel = (value) => LEAVE_TYPES.find((type) => type.value === value)?.label || value || "-";

const getStatusLabel = (status) => {
  if (!status) return "รออนุมัติ";
  switch ((status || "").toUpperCase()) {
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ไม่อนุมัติ";
    case "ACTIVE":
      return "กำลังลา";
    default:
      return status;
  }
};

const getTeacherDisplayName = (leave) => {
  if (!leave) return "ไม่ระบุชื่อ";
  if (leave.teacherName) return leave.teacherName;
  if (leave.teacher?.fullName) return leave.teacher.fullName;
  const composed = `${leave.teacher?.firstName || ""} ${leave.teacher?.lastName || ""}`.trim();
  if (composed) return composed;
  return leave.teacher?.username || leave.teacherUsername || "ไม่ระบุชื่อ";
};

export default function TeacherLeave() {
  const [role, setRole] = useState(() => getStoredRole());
  const isAdmin = role === "ADMIN";

  // teacher state
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  // admin state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [adminLeaves, setAdminLeaves] = useState([]);
  const [adminLeavesLoading, setAdminLeavesLoading] = useState(false);
  const [adminLeavesError, setAdminLeavesError] = useState("");
  const [adminFilter, setAdminFilter] = useState("PENDING");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  // const [typeBreakdown, setTypeBreakdown] = useState([]);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchLeaves = useCallback(async () => {
    if (isAdmin) return;
    setLoadingLeaves(true);
    try {
      const response = await axios.get("/api/teacher/leaves", { headers });
      setLeaves(parseLeaves(response.data));
    } catch (error) {
      setLeaves([]);
      Swal.fire({
        icon: "error",
        title: "โหลดข้อมูลการลาไม่สำเร็จ",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setLoadingLeaves(false);
    }
  }, [headers, isAdmin]);

  const fetchSummary = useCallback(async () => {
    if (!isAdmin) return;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const response = await axios.get("/api/admin/teacher-leaves/summary", { headers });
      setSummary(normalizeSummary(response.data));
    } catch (error) {
      setSummary(null);
      setSummaryError(error?.response?.data?.message || "ไม่สามารถโหลดสรุปกำลังพลได้");
    } finally {
      setSummaryLoading(false);
    }
  }, [headers, isAdmin]);

  const fetchAdminLeaves = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLeavesLoading(true);
    setAdminLeavesError("");
    try {
      const response = await axios.get("/api/admin/teacher-leaves", {
        headers,
        params: { status: adminFilter, limit: 100 },
      });
      setAdminLeaves(parseLeaves(response.data));
    } catch (error) {
      setAdminLeaves([]);
      setAdminLeavesError(error?.response?.data?.message || "ไม่สามารถโหลดรายการการลาได้");
    } finally {
      setAdminLeavesLoading(false);
    }
  }, [adminFilter, headers, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchSummary();
      fetchAdminLeaves();
      return;
    }
    fetchLeaves();
  }, [fetchAdminLeaves, fetchLeaves, fetchSummary, isAdmin]);

  useEffect(() => {
    const syncRole = () => setRole(getStoredRole());
    window.addEventListener("storage", syncRole);
    window.addEventListener("auth-change", syncRole);
    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("auth-change", syncRole);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || isAdmin) return;

    if (!form.leaveType || !form.startDate || !form.destination) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณาเลือกประเภทการลา ระบุวันเริ่มลา และจุดหมายปลายทาง",
      });
      return;
    }

    if (form.endDate && form.endDate < form.startDate) {
      Swal.fire({
        icon: "warning",
        title: "ช่วงวันไม่ถูกต้อง",
        text: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มลา",
      });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/teacher/leaves", form, { headers });
      Swal.fire({
        icon: "success",
        title: "บันทึกคำขอลาสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
      setForm(INITIAL_FORM);
      fetchLeaves();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ส่งคำขอลาไม่สำเร็จ",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (leaveId, nextStatus) => {
    if (!isAdmin || !leaveId || !nextStatus) return;
    setUpdatingStatusId(leaveId);
    try {
      await axios.patch(
        `/api/admin/teacher-leaves/${leaveId}/status`,
        { status: nextStatus },
        { headers }
      );
      fetchSummary();
      fetchAdminLeaves();
      Swal.fire({
        icon: "success",
        title: nextStatus === "APPROVED" ? "อนุมัติคำขอลาสำเร็จ" : "ปฏิเสธคำขอลาสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถอัปเดตสถานะได้",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  if (isAdmin) {
    const totalTeachers = summary?.totalTeachers ?? 0;
    const onLeave = summary?.onLeave ?? 0;
    const available = summary?.availableTeachers ?? Math.max(totalTeachers - onLeave, 0);
    const totalRequests = summary?.totalLeaveRequests ?? 0;
    const currentLeaves = summary?.currentLeaves ?? [];
    const recentLeaves = summary?.recentLeaves ?? [];

    return (
      <div className="w-full flex flex-col gap-6">
        <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
          <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">ADMIN</p>
          <h1 className="text-3xl font-bold text-blue-900">แดชบอร์ดการลาของครูผู้สอน</h1>
          <p className="text-sm text-gray-600">สรุปจำนวนครูทั้งหมด ผู้ที่กำลังลาปัจจุบัน และรายละเอียดคำขอลาแบบล่าสุด</p>
        </header>

        <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">ภาพรวมกำลังพล</p>
              <p className="text-sm text-gray-500">ข้อมูลอัปเดตจากระบบแจ้งลา</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={adminFilter}
                onChange={(event) => setAdminFilter(event.target.value)}
                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="PENDING">รออนุมัติ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="REJECTED">ไม่อนุมัติ</option>
              </select>
              <button
                onClick={() => {
                  fetchSummary();
                  fetchAdminLeaves();
                }}
                disabled={summaryLoading || adminLeavesLoading}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {summaryLoading || adminLeavesLoading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
              </button>
            </div>
          </div>

          {summaryError && <div className="text-center py-4 text-red-500">{summaryError}</div>}

          {!summaryError && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <AdminLeaveStatCard label="ครูทั้งหมด" value={totalTeachers.toLocaleString("th-TH")} accent="from-slate-600 to-slate-500" />
                <AdminLeaveStatCard label="กำลังลา" value={onLeave.toLocaleString("th-TH")} accent="from-rose-500 to-pink-500" />
                <AdminLeaveStatCard label="พร้อมปฏิบัติหน้าที่" value={available.toLocaleString("th-TH")} accent="from-emerald-500 to-green-500" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <AdminLeaveStatCard label="คำขอลาทั้งหมด" value={totalRequests.toLocaleString("th-TH")} accent="from-indigo-500 to-indigo-400" />
                <div className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 md:col-span-2">
                  <p className="text-sm text-gray-500">กำลังลาปัจจุบัน</p>
                  {summaryLoading ? (
                    <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
                  ) : currentLeaves.length === 0 ? (
                    <p className="text-sm text-gray-400">ไม่มีครูที่กำลังลา</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {currentLeaves.map((leave) => (
                        <div key={leave.id || `${leave.teacherId}-${leave.startDate}`} className="flex flex-wrap items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{getTeacherDisplayName(leave)} · {getLeaveTypeLabel(leave.leaveType)}</p>
                            <p className="text-xs text-gray-500">{formatDateRange(leave.startDate, leave.endDate)} · จุดหมาย {leave.destination || "-"}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">{getStatusLabel(leave.status)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">คำขอลา ({adminFilter === "PENDING" ? "รออนุมัติ" : adminFilter === "APPROVED" ? "อนุมัติแล้ว" : "ไม่อนุมัติ"})</p>
              <p className="text-sm text-gray-500">แสดงสูงสุด 100 รายการล่าสุดตามสถานะที่เลือก</p>
            </div>
          </div>
          {adminLeavesLoading ? (
            <div className="text-center py-8 text-blue-600 font-semibold">กำลังโหลดข้อมูล...</div>
          ) : adminLeavesError ? (
            <div className="text-center py-8 text-red-500">{adminLeavesError}</div>
          ) : adminLeaves.length === 0 ? (
            <div className="text-center py-8 text-gray-400">ไม่พบคำขอลาตามสถานะนี้</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-3 text-left">ครูผู้สอน</th>
                    <th className="p-3 text-left">ประเภท</th>
                    <th className="p-3 text-left">ช่วงวันลา</th>
                    <th className="p-3 text-left">จุดหมาย</th>
                    <th className="p-3 text-left">สถานะ</th>
                    <th className="p-3 text-left">บันทึกเมื่อ</th>
                    {adminFilter === "PENDING" && <th className="p-3 text-left">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody>
                  {adminLeaves.map((leave) => (
                    <tr key={leave.id || `${leave.teacherId}-${leave.createdAt}`} className="border-t border-gray-100">
                      <td className="p-3 font-semibold text-gray-900">{getTeacherDisplayName(leave)}</td>
                      <td className="p-3">{getLeaveTypeLabel(leave.leaveType)}</td>
                      <td className="p-3">{formatDateRange(leave.startDate, leave.endDate)}</td>
                      <td className="p-3">{leave.destination || "-"}</td>
                      <td className="p-3">{getStatusLabel(leave.status)}</td>
                      <td className="p-3">{formatDateTime(leave.createdAt)}</td>
                      {adminFilter === "PENDING" && (
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(leave.id, "APPROVED")}
                              disabled={updatingStatusId === leave.id}
                              className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60"
                            >
                              {updatingStatusId === leave.id ? "กำลังบันทึก..." : "อนุมัติ"}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(leave.id, "REJECTED")}
                              disabled={updatingStatusId === leave.id}
                              className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-60"
                            >
                              {updatingStatusId === leave.id ? "กำลังบันทึก..." : "ไม่อนุมัติ"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
        <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">TEACHER</p>
        <h1 className="text-3xl font-bold text-blue-900">แจ้งการลา</h1>
        <p className="text-sm text-gray-600">บันทึกคำขอลา พร้อมตรวจสอบประวัติการลาของคุณภายในหน้าเดียว</p>
      </header>

      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-6">
        <div>
          <p className="text-lg font-semibold text-gray-800">ฟอร์มแจ้งการลา</p>
          <p className="text-sm text-gray-500">กรอกข้อมูลให้ครบถ้วนเพื่อให้ผู้บังคับบัญชาดำเนินการอนุมัติ</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span>ประเภทการลา</span>
              <select
                name="leaveType"
                value={form.leaveType}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {LEAVE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>จุดหมายปลายทาง</span>
              <input
                type="text"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น บ้านพัก จ.ชลบุรี"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>วันเริ่มลา</span>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>วันสิ้นสุด</span>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span>เหตุผลเพิ่มเติม</span>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={4}
              placeholder="อธิบายเหตุผลและรายละเอียดเพิ่มเติม"
              className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              {submitting ? "กำลังบันทึก..." : "ส่งคำขอลา"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-800">ประวัติการลา</p>
            <p className="text-sm text-gray-500">ตรวจสอบสถานะคำขอลา และรายละเอียดรอบล่าสุด</p>
          </div>
          <button
            onClick={fetchLeaves}
            disabled={loadingLeaves}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-60"
          >
            {loadingLeaves ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>
        <div className="grid gap-3">
          {leaves.length === 0 && !loadingLeaves && (
            <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูลการลา</p>
          )}
          {leaves.map((leave) => (
            <div key={leave.id || leave._id || `${leave.leaveType}-${leave.startDate}-${leave.createdAt}`} className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-gray-900">
                  {getLeaveTypeLabel(leave.leaveType)} · {formatDateRange(leave.startDate, leave.endDate)}
                </p>
                <span className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                  {leave.status ? getStatusLabel(leave.status) : "รออนุมัติ"}
                </span>
              </div>
              <p className="text-sm text-gray-600">จุดหมาย: {leave.destination || "-"}</p>
              {leave.reason && <p className="text-sm text-gray-500 italic">เหตุผล: {leave.reason}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminLeaveStatCard({ label, value, accent }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow bg-gradient-to-br ${accent}`}>
      <p className="text-sm text-white/80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
