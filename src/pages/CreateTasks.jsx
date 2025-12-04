import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Clock3, ListChecks, Send, UserRound, FileText, TimerReset, RefreshCw, Filter } from "lucide-react";

const QUICK_DURATIONS = [
  { label: "1 วัน (ด่วน)", value: 1 },
  { label: "3 วัน", value: 3 },
  { label: "7 วัน", value: 7 },
  { label: "14 วัน", value: 14 },
];

const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "สูง" },
  { value: "MEDIUM", label: "กลาง" },
  { value: "LOW", label: "ต่ำ" },
];

const INITIAL_FORM = {
  title: "",
  description: "",
  assigneeId: "",
  startDate: new Date().toISOString().slice(0, 10),
  durationDays: 3,
  dueDate: "",
  priority: "MEDIUM",
  noteToAssignee: "",
  status: "",
};

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
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const computeDueDate = (startDate, durationDays, dueDateInput) => {
  if (dueDateInput) {
    const parsed = new Date(dueDateInput);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (!startDate || !durationDays) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const result = new Date(start);
  result.setDate(result.getDate() + Number(durationDays));
  return result;
};

const priorityBadge = (priority) => {
  const normalized = (priority || "").toUpperCase();
  if (normalized === "HIGH") return "bg-red-50 text-red-700 border-red-200";
  if (normalized === "LOW") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const statusBadge = (status) => {
  const normalized = (status || "").toUpperCase();
  if (normalized === "DONE") return { label: "เสร็จสิ้น", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (normalized === "IN_PROGRESS") return { label: "กำลังทำ", className: "bg-blue-50 text-blue-700 border-blue-200" };
  if (normalized === "PENDING") return { label: "รอเริ่ม", className: "bg-amber-50 text-amber-700 border-amber-200" };
  if (normalized === "CANCELLED") return { label: "ยกเลิก", className: "bg-gray-100 text-gray-600 border-gray-200" };
  return { label: status || "-", className: "bg-slate-50 text-slate-700 border-slate-200" };
};

export default function CreateTasks() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [filters, setFilters] = useState({ status: "", priority: "", assigneeId: "" });
  const [deletingId, setDeletingId] = useState(null);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const dueDate = useMemo(
    () => computeDueDate(form.startDate, form.durationDays, form.dueDate),
    [form.startDate, form.durationDays, form.dueDate],
  );

  const fetchAssignees = useCallback(async () => {
    setLoadingAssignees(true);
    try {
      const response = await axios.get("/api/admin/users", {
        headers,
      });
      const list = normalizeTasks(response.data);
      const filtered = list.filter((user) => (user.role || "").toString().toUpperCase() !== "OWNER");
      setAssignees(filtered);
      if (!form.assigneeId && filtered.length) {
        setForm((prev) => ({ ...prev, assigneeId: filtered[0].id ?? filtered[0]._id ?? "" }));
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "โหลดรายชื่อผู้รับงานไม่สำเร็จ",
        text: error?.response?.data?.message || "กรุณาลองใหม่",
      });
    } finally {
      setLoadingAssignees(false);
    }
  }, [headers, form.assigneeId]);

  const fetchTasks = useCallback(
    async (params = {}) => {
      setLoadingTasks(true);
      try {
        const response = await axios.get("/api/admin/tasks", {
          params: {
            assigneeId: filters.assigneeId || undefined,
            status: filters.status || undefined,
            priority: filters.priority || undefined,
            ...params,
          },
          headers,
        });
        setTasks(normalizeTasks(response.data));
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "ไม่สามารถโหลดงานที่มอบหมายได้",
          text: error?.response?.data?.message || "กรุณาลองใหม่",
        });
      } finally {
        setLoadingTasks(false);
      }
    },
    [filters.assigneeId, filters.priority, filters.status, headers],
  );

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDurationChange = (value) => {
    setForm((prev) => ({ ...prev, durationDays: value }));
  };

  const handlePriorityChange = (value) => {
    setForm((prev) => ({ ...prev, priority: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title || !form.assigneeId || !form.startDate) return;
    const payload = {
      title: form.title,
      assigneeId: form.assigneeId,
      startDate: form.startDate,
      durationDays: form.dueDate ? undefined : Number(form.durationDays) || undefined,
      dueDate: form.dueDate || undefined,
      priority: (form.priority || "MEDIUM").toUpperCase(),
      description: form.description || undefined,
      noteToAssignee: form.noteToAssignee || undefined,
      status: form.status || undefined,
    };
    try {
      await axios.post("/api/admin/tasks", payload, { headers });
      Swal.fire({ icon: "success", title: "สร้างงานสำเร็จ" });
      setForm((prev) => ({ ...INITIAL_FORM, assigneeId: prev.assigneeId || form.assigneeId || "" }));
      fetchTasks();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "สร้างงานไม่สำเร็จ",
        text: error?.response?.data?.message || "กรุณาตรวจสอบข้อมูลแล้วลองใหม่",
      });
    }
  };

  const resetFilters = () => {
    setFilters({ status: "", priority: "", assigneeId: "" });
  };

  const handleDeleteTask = async (id) => {
    if (!id) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบงาน",
      text: "ต้องการลบงานนี้หรือไม่?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/admin/tasks/${id}`, { headers });
      setTasks((prev) => prev.filter((task) => (task.id || task._id) !== id));
      Swal.fire({ icon: "success", title: "ลบงานสำเร็จ" });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ลบงานไม่สำเร็จ",
        text: error?.response?.data?.message || "กรุณาลองใหม่",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const selectedAssignee = useMemo(
    () => assignees.find((option) => option.id === form.assigneeId || option._id === form.assigneeId),
    [assignees, form.assigneeId],
  );

  return (
    <div className="w-full max-w-6xl mx-auto py-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Task Dispatch</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold">ส่งมอบงาน</h1>
              <p className="text-blue-100">
                ระบุชื่องาน รายละเอียด และระยะเวลาที่ต้องทำ
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <ListChecks size={18} />
                <span className="text-sm font-semibold">สร้างงานใหม่</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <Clock3 size={18} />
                <span className="text-sm font-semibold">กำหนดส่งเร็ว</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.7fr,1fr] gap-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur border border-gray-100 shadow rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-[0.2em]">Admin Task Builder</p>
              <h2 className="text-xl font-semibold text-gray-900">สร้างงานใหม่</h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ชื่องาน</span>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="เช่น จัดทำแผนฝึกประจำสัปดาห์"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ส่งมอบให้</span>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5">
                <UserRound size={18} className="text-gray-500" />
                <select
                  name="assigneeId"
                  value={form.assigneeId}
                  onChange={handleChange}
                  className="w-full text-sm bg-transparent focus:outline-none"
                  required
                  disabled={loadingAssignees}
                >
                  {loadingAssignees && <option value="">กำลังโหลด...</option>}
                  {!loadingAssignees && !assignees.length && <option value="">ไม่พบผู้รับงาน</option>}
                  {assignees.map((user) => (
                    <option key={user.id ?? user._id} value={user.id ?? user._id}>
                      {user.rank} {user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "ไม่ระบุ"}
                    </option>
                  ))}
                </select>
              </div>
              {/* <p className="text-xs text-gray-500">หมายเหตุ: ส่งมอบให้ได้ทุกบทบาทยกเว้น OWNER</p> */}
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700">รายละเอียดงาน</span>
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-400">
                <FileText size={18} />
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="ระบุขั้นตอน รายละเอียดของงาน"
                rows={4}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">วันที่เริ่ม</span>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ระยะเวลาที่ให้ทำงาน</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  name="durationDays"
                  value={form.durationDays}
                  onChange={(e) => handleDurationChange(Number(e.target.value) || 1)}
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={!!form.dueDate}
                />
                <span className="text-sm text-gray-600">วัน</span>
                {dueDate && (
                  <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                    กำหนดส่ง ~ {formatDate(dueDate)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_DURATIONS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => handleDurationChange(item.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      Number(form.durationDays) === item.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    }`}
                    disabled={!!form.dueDate}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                หากกำหนดวันส่งเอง ระบบจะไม่คำนวณจากจำนวนวัน
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">กำหนดส่ง</span>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ความสำคัญ</span>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handlePriorityChange(option.value)}
                    className={`px-4 py-2 rounded-xl text-sm border transition ${
                      form.priority === option.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">แนบข้อความถึงผู้รับงาน</span>
              <input
                type="text"
                name="noteToAssignee"
                value={form.noteToAssignee}
                onChange={handleChange}
                placeholder="เช่น ขออัปเดตความคืบหน้าทุก 2 วัน"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            {/* <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">สถานะ (ถ้าต้องการกำหนด)</span>
              <input
                type="text"
                name="status"
                value={form.status}
                onChange={handleChange}
                placeholder="เช่น OPEN, IN_PROGRESS, DONE"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div> */}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            {/* <div className="flex items-center gap-2 text-sm text-gray-500">
              <ListChecks size={18} />
              <span>สรุปส่งงานพร้อมกำหนดเวลา</span>
            </div> */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...INITIAL_FORM, assigneeId: prev.assigneeId }))}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                ล้างแบบฟอร์ม
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Send size={18} />
                ส่งงานให้ผู้รับ
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur border border-gray-100 shadow rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Preview</p>
                <h3 className="text-lg font-semibold text-gray-900">ตัวอย่างงานที่จะสั่ง</h3>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${priorityBadge(form.priority)}`}>
                {form.priority === "HIGH" ? "ความสำคัญสูง" : form.priority === "LOW" ? "ความสำคัญต่ำ" : "ความสำคัญกลาง"}
              </span>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 p-4 bg-gray-50/60">
              <p className="text-sm text-gray-500">ชื่องาน</p>
              <p className="text-base font-semibold text-gray-900 mt-1">{form.title || "— ยังไม่ระบุ —"}</p>
              <div className="mt-3 text-sm text-gray-600 space-y-1">
                <p>ผู้รับ: {selectedAssignee?.fullName || selectedAssignee?.username || "ไม่ระบุ"}</p>
                <p>ระยะเวลา: {form.durationDays || "-"} วัน</p>
                <p>
                  กำหนดส่ง: {dueDate ? formatDate(dueDate) : "ยังไม่คำนวณ"} ({form.startDate || "ไม่ระบุวันเริ่ม"})
                </p>
              </div>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                {form.description || "พิมพ์รายละเอียดงาน เพื่อให้ผู้รับเข้าใจขั้นตอนและผลลัพธ์ที่คาดหวัง"}
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-gray-100 shadow rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Pipeline</p>
                <h3 className="text-lg font-semibold text-gray-900">งานที่มอบหมาย</h3>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => fetchTasks()}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw size={14} /> รีเฟรช
                </button>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Filter size={14} /> ล้างตัวกรอง
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <select
                value={filters.assigneeId}
                onChange={(e) => setFilters((prev) => ({ ...prev, assigneeId: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2"
              >
                <option value="">ผู้รับทั้งหมด</option>
                {assignees.map((user) => (
                  <option key={user.id ?? user._id} value={user.id ?? user._id}>
                    {user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "ไม่ระบุ"}
                  </option>
                ))}
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2"
              >
                <option value="">ทุกความสำคัญ</option>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                placeholder="สถานะ เช่น OPEN"
                className="border border-gray-200 rounded-xl px-3 py-2"
              />
              <button
                onClick={() => fetchTasks()}
                className="sm:col-span-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                ใช้ตัวกรอง
              </button>
            </div>

            {loadingTasks ? (
              <p className="text-sm text-blue-600">กำลังโหลดงาน...</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีงานที่มอบหมาย</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const badge = priorityBadge(task.priority);
                  const assigneeName =
                    task.assignee?.fullName ||
                    `${task.assignee?.firstName || ""} ${task.assignee?.lastName || ""}`.trim() ||
                    task.assigneeName ||
                    "-";
                  const due = task.dueDate || computeDueDate(task.startDate, task.durationDays);
                  const statusMeta = statusBadge(task.status);
                  return (
                    <div
                      key={task.id || task._id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gradient-to-r from-white to-gray-50"
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                        {(assigneeName || "").slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{task.title || "-"}</p>
                        <p className="text-xs text-gray-500">
                          {assigneeName} • เริ่ม {formatDate(task.startDate)} • ส่ง {due ? formatDate(due) : "-"}
                        </p>
                        {task.noteToAssignee && <p className="text-xs text-gray-600 mt-1">หมายเหตุ: {task.noteToAssignee}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge}`}>
                          {task.priority === "HIGH" ? "ความสำคัญสูง" : task.priority === "LOW" ? "ความสำคัญต่ำ" : "ความสำคัญกลาง"}
                        </span>
                        {task.status && (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id || task._id)}
                          disabled={deletingId === (task.id || task._id)}
                          className="text-[11px] text-red-600 border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === (task.id || task._id) ? "กำลังลบ..." : "ลบ"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
