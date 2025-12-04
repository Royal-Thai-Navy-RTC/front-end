import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { CheckCircle, ClipboardList, Loader2, RefreshCw, Send, Clock4, ShieldCheck } from "lucide-react";
import { useOutletContext } from "react-router-dom";

const normalizeTasks = (payload) => {
  const source = payload?.data ?? payload ?? [];
  if (Array.isArray(source)) return source;
  if (Array.isArray(source.items)) return source.items;
  return [];
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "รอดำเนินการ" },
  { value: "IN_PROGRESS", label: "กำลังทำ" },
  { value: "DONE", label: "ส่งงาน" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

const statusMeta = (status) => {
  const key = (status || "").toUpperCase();
  if (key === "DONE") return { label: "ส่งงาน", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (key === "IN_PROGRESS") return { label: "กำลังทำ", color: "bg-blue-50 text-blue-700 border-blue-200" };
  if (key === "CANCELLED") return { label: "ยกเลิก", color: "bg-gray-100 text-gray-700 border-gray-200" };
  return { label: "รอดำเนินการ", color: "bg-amber-50 text-amber-700 border-amber-200" };
};

export default function TaskSubmission() {
  const { user } = useOutletContext() || {};
  const userId = user?.id || user?._id || user?.userId;
  const userRole = (user?.role || localStorage.getItem("role") || "").toUpperCase();
  const canViewAll = ["OWNER", "ADMIN"].includes(userRole);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [submitStatus, setSubmitStatus] = useState("IN_PROGRESS");
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const statusOptionsForUser = useMemo(() => {
    if (userRole === "OWNER") return STATUS_OPTIONS;
    return STATUS_OPTIONS.filter((opt) => opt.value !== "CANCELLED");
  }, [userRole]);

  const fetchTasks = useCallback(async () => {
    if (!userId && !canViewAll) {
      setError("ไม่พบข้อมูลผู้ใช้");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (!canViewAll && userId) params.assigneeId = userId;
      const response = await axios.get("/api/admin/tasks", {
        params,
        headers,
      });
      setTasks(normalizeTasks(response.data));
    } catch (err) {
      setError(err?.response?.data?.message || "ไม่สามารถโหลดงานที่ได้รับมอบหมายได้");
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "โหลดงานไม่สำเร็จ" });
    } finally {
      setLoading(false);
    }
  }, [headers, userId, canViewAll]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    if (filterStatus === "ALL") return tasks;
    return tasks.filter((task) => (task.status || "").toUpperCase() === filterStatus);
  }, [filterStatus, tasks]);

  const selectedTask = useMemo(
    () => filteredTasks.find((task) => (task.id || task._id) === selectedId),
    [filteredTasks, selectedId],
  );

  const stats = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        const key = (task.status || "").toUpperCase();
        acc.total += 1;
        if (key === "DONE") acc.done += 1;
        else if (key === "IN_PROGRESS") acc.inProgress += 1;
        else if (key === "CANCELLED") acc.cancelled += 1;
        else acc.pending += 1;
        return acc;
      },
      { total: 0, pending: 0, inProgress: 0, done: 0, cancelled: 0 },
    );
  }, [tasks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกงานที่จะส่ง" });
      return;
    }
    if (submitStatus === "CANCELLED" && userRole !== "OWNER") {
      Swal.fire({ icon: "warning", title: "ยกเลิกได้เฉพาะ OWNER" });
      return;
    }
    setSubmitting(true);
    try {
      await axios.patch(
        `/api/admin/tasks/${selectedId}`,
        {
          status: submitStatus,
          submissionNote: submissionNote || undefined,
        },
        { headers },
      );
      Swal.fire({ icon: "success", title: "ส่งงานสำเร็จ" });
      setSubmissionNote("");
        setSubmitStatus("IN_PROGRESS");
        fetchTasks();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ส่งงานไม่สำเร็จ",
        text: err?.response?.data?.message || "กรุณาลองใหม่",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-700 to-sky-500 text-white shadow-xl p-6 sm:p-8">
        <div className="absolute -right-10 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-indigo-400/30 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-50">
            ส่งงาน
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">ส่งงานที่ได้รับมอบหมาย</h1>
              <p className="text-sm text-blue-100 max-w-3xl">
                เลือกงานที่ได้รับมอบหมาย อัปเดตสถานะ พร้อมบันทึกเพื่อให้ผู้มอบหมายเห็นความคืบหน้าชัดเจน
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={fetchTasks}
                className="inline-flex items-center gap-1 rounded-xl border border-white/30 bg-white/15 px-4 py-2 font-semibold text-white shadow-sm hover:bg-white/25 transition"
              >
                <RefreshCw size={14} /> รีเฟรช
              </button>
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-blue-50 border border-white/20">
                <ShieldCheck size={14} />
                <span className="font-semibold">{canViewAll ? "ดูทุกงาน" : "งานของฉัน"}</span>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <StatCard label="งานทั้งหมด" value={stats.total} accent="from-white/90 to-white/60" />
            <StatCard label="รอดำเนินการ" value={stats.pending} accent="from-amber-100/80 to-yellow-50" />
            <StatCard label="กำลังทำ / ส่งงาน" value={`${stats.inProgress} / ${stats.done}`} accent="from-blue-100/80 to-emerald-50" />
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.35fr,1fr] gap-6">
        <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_rgba(15,23,42,0.08)] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Assigned Tasks</p>
              <h2 className="text-xl font-semibold text-gray-900">
                {canViewAll ? "งานทั้งหมด" : "รายการงานของฉัน"}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock4 size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="PENDING">รอดำเนินการ</option>
                <option value="IN_PROGRESS">กำลังทำ</option>
                <option value="DONE">ส่งงาน</option>
                <option value="CANCELLED">ยกเลิก</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="animate-spin" size={18} />
              <span>กำลังโหลดงาน...</span>
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-sm text-gray-500">ยังไม่มีงานที่ได้รับมอบหมาย</div>
          ) : (
            <div className="grid gap-3">
              {filteredTasks.map((task) => {
                const id = task.id || task._id;
                const active = selectedId === id;
                const status = (task.status || "").toUpperCase();
                const meta = statusMeta(status);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`w-full text-left rounded-2xl border px-4 py-4 transition ${
                      active
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-inner"
                        : "border-gray-100 bg-white hover:border-blue-100/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                          {(task.assigneeName || task.assignee?.fullName || task.title || "งาน").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{task.title || "ไม่ระบุชื่อ"}</p>
                          <p className="text-xs text-gray-500">
                            ส่ง {formatDate(task.dueDate || task.startDate)} • เริ่ม {formatDate(task.startDate)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${meta.color}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">สถานะ: {status || "ไม่ระบุ"}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_rgba(15,23,42,0.08)] p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-blue-600" size={20} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Submit</p>
              <h2 className="text-lg font-semibold text-gray-900">ส่งงาน / อัปเดตสถานะ</h2>
            </div>
          </div>

          {!selectedTask ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
              เลือกงานจากด้านซ้ายเพื่อเริ่มส่งงาน
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 shadow-inner">
                <p className="text-sm font-semibold text-gray-900">{selectedTask.title}</p>
                <p className="text-xs text-gray-600">
                  เริ่ม {formatDate(selectedTask.startDate)} • ส่ง {formatDate(selectedTask.dueDate || selectedTask.startDate)}
                </p>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-gray-800">บันทึกส่งงาน / หมายเหตุ</span>
                <textarea
                  rows={4}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  className="border border-gray-200 rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white shadow-inner"
                  placeholder="สรุปผลลัพธ์ เอกสารที่แนบ หรือจุดที่ต้องการให้ตรวจสอบ"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-gray-800">สถานะที่ต้องการอัปเดต</span>
              <div className="flex flex-wrap gap-2">
                {statusOptionsForUser.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSubmitStatus(option.value)}
                    className={`px-4 py-2 rounded-xl border text-sm transition ${
                      submitStatus === option.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-200"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {submitting ? "กำลังส่ง..." : "ส่งงาน"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-gray-900 shadow-lg shadow-black/5 border border-white/30 bg-gradient-to-br ${accent}`}>
      <p className="text-xs text-gray-700/80">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
