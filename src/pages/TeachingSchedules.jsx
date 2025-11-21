import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import TeachingScheduleCalendar from "../components/TeachingScheduleCalendar";

const formatTeacher = (teacher) => {
  if (!teacher) return "-";
  if (typeof teacher === "string") return teacher;
  if (typeof teacher === "object") {
    const name = `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
    return name || teacher.username || teacher.role || "-";
  }
  return String(teacher);
};

const formatRange = (start, end) => {
  if (!start) return "-";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const startText = startDate.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!endDate) return startText;
  const endText = endDate.toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startText} - ${endText}`;
};

const randomColor = () => {
  const palette = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#d946ef"];
  return palette[Math.floor(Math.random() * palette.length)];
};

const toLocalInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  // shift to local before slicing for datetime-local
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toIsoString = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return date.toISOString();
};

const INITIAL_SCHEDULE = {
  title: "",
  description: "",
  location: "",
  start: "",
  end: "",
  allDay: false,
  division: "",
  teacherId: "",
  companyCode: "",
  battalionCode: "",
  color: "",
};

export default function TeachingSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [form, setForm] = useState(() => ({ ...INITIAL_SCHEDULE, color: randomColor() }));
  const [editingId, setEditingId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/teaching-schedules", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = response.data?.data ?? response.data;
        let parsed = [];
        if (Array.isArray(payload)) parsed = payload;
        else if (Array.isArray(payload?.items)) parsed = payload.items;
        else if (payload?.schedule) parsed = [payload.schedule];
        else if (payload) parsed = [payload];
        setSchedules(parsed);
      } catch (err) {
        const msg = err?.response?.data?.message || "ไม่สามารถดึงตารางสอนได้";
        setFetchError(msg);
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: msg });
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/admin/users?role=TEACHER", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = response.data?.data ?? response.data;
        setTeachers(Array.isArray(payload) ? payload : payload?.items || []);
      } catch (err) {
        console.error("failed to load teachers", err);
      }
    };
    fetchTeachers();
  }, []);

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const aTime = a.start ? new Date(a.start).getTime() : 0;
      const bTime = b.start ? new Date(b.start).getTime() : 0;
      return bTime - aTime; // latest first
    });
  }, [schedules]);

  const latestFive = useMemo(() => sortedSchedules.slice(0, 5), [sortedSchedules]);
  const displayedSchedules = useMemo(() => (showAll ? sortedSchedules : latestFive), [showAll, sortedSchedules, latestFive]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm({ ...INITIAL_SCHEDULE, color: randomColor() });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.title || !form.start) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุหัวข้อ และวันเวลาเริ่ม" });
      return;
    }
    const resolvedColor = form.color || randomColor();
    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      start: toIsoString(form.start),
      end: toIsoString(form.end),
      allDay: Boolean(form.allDay),
      division: form.division,
      teacherId: form.teacherId || null,
      companyCode: form.companyCode || null,
      battalionCode: form.battalionCode || null,
      color: resolvedColor,
    };
    const token = localStorage.getItem("token");
    try {
      if (editingId) {
        await axios.put(`/api/admin/teaching-schedules/${editingId}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        Swal.fire({ icon: "success", title: "อัปเดตตารางสอนสำเร็จ" });
      } else {
        await axios.post("/api/admin/teaching-schedules", payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        Swal.fire({ icon: "success", title: "เพิ่มตารางสอนสำเร็จ" });
      }
      resetForm();
      setLoading(true);
      const refresh = await axios.get("/api/teaching-schedules", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const refreshed = refresh.data?.data ?? refresh.data ?? [];
      setSchedules(Array.isArray(refreshed) ? refreshed : refreshed?.items || []);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: editingId ? "อัปเดตไม่สำเร็จ" : "เพิ่มไม่สำเร็จ",
        text: err?.response?.data?.message || err?.message || "กรุณาลองใหม่",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || item.subject || "",
      description: item.description || "",
      location: item.location || "",
      start: toLocalInputValue(item.start),
      end: toLocalInputValue(item.end),
      allDay: Boolean(item.allDay),
      division: item.division || item.category || "",
      teacherId: item.teacherId || item.teacher?.id || "",
      companyCode: item.companyCode || "",
      battalionCode: item.battalionCode || "",
      color: item.color || "",
    });
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ",
      text: "ต้องการลบตารางสอนนี้หรือไม่?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/admin/teaching-schedules/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      Swal.fire({ icon: "success", title: "ลบสำเร็จ" });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: err?.response?.data?.message || err?.message || "กรุณาลองใหม่",
      });
    }
  };

  return (
    <div className="flex flex-col w-full gap-5">
      <section className="bg-white shadow rounded-2xl p-6 border border-gray-100 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold w-fit">
              MANAGEMENT
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">การจัดการตารางสอน</h1>
            <p className="text-sm text-gray-500">สำหรับผู้ดูแลระบบและผู้บังคับบัญชา</p>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="bg-white shadow rounded-2xl p-5 border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">{editingId ? "แก้ไขตารางสอน" : "เพิ่มตารางสอน"}</p>
            <p className="text-xs text-gray-500">กรอกข้อมูลให้ครบแล้วบันทึก</p>
          </div>
          <button
            onClick={resetForm}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            ล้างฟอร์ม
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col text-sm text-gray-700">
            หัวข้อสอน
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            สถานที่
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            เริ่ม
            <input
              type="datetime-local"
              name="start"
              value={form.start}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            สิ้นสุด
            <input
              type="datetime-local"
              name="end"
              value={form.end}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            หมวด/แผนก
            <input
              type="text"
              name="division"
              value={form.division}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            กองร้อยที่
            <input
              type="text"
              name="companyCode"
              value={form.companyCode}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            กองพันที่
            <input
              type="text"
              name="battalionCode"
              value={form.battalionCode}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            ครูผู้สอน
            <select
              name="teacherId"
              value={form.teacherId}
              onChange={handleInputChange}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            >
              <option value="">-- เลือกครูผู้สอน --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatTeacher(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="allDay"
              checked={form.allDay}
              onChange={handleInputChange}
              className="size-4 accent-blue-600"
            />
            ทั้งวัน
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            สีประจำวิชา
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                name="color"
                value={form.color || "#2563eb"}
                onChange={handleInputChange}
                className="h-10 w-16 rounded-md border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                name="color"
                value={form.color || ""}
                onChange={handleInputChange}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                placeholder="#2563eb"
              />
            </div>
          </label>
          <label className="flex flex-col text-sm text-gray-700 sm:col-span-2">
            รายละเอียด
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows={3}
              className="border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={resetForm}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
          >
            {editingId ? "บันทึกการแก้ไข" : "เพิ่มตารางสอน"}
          </button>
        </div>
      </section>

      {/* CALENDAR + LIST */}
      <section className="bg-white shadow rounded-2xl p-5 border border-gray-100 flex flex-col gap-5">
        {loading && <p className="text-blue-600 text-sm">กำลังโหลดตารางสอน...</p>}
        {fetchError && !loading && <p className="text-red-500 text-sm">{fetchError}</p>}
        {!loading && !fetchError && (
          <>
            <div className="grid gap-6">
              <div className="border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">รายการตารางสอน</p>
                    <p className="text-xs text-gray-500">
                      ดูรายละเอียด วิชาสอน ผู้สอน และสถานที่ {showAll ? "(ทั้งหมด)" : "(5 รายการล่าสุด)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">
                      แสดง {displayedSchedules.length}/{schedules.length || 0}
                    </span>
                    {schedules.length > 5 && (
                      <button
                        onClick={() => setShowAll((v) => !v)}
                        className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 text-gray-700 hover:bg-white shadow-sm"
                      >
                        {showAll ? "ดู 5 ล่าสุด" : "ดูทั้งหมด"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 border-b border-gray-100">
                          <th className="px-4 py-3 text-left font-semibold">หัวข้อ</th>
                          <th className="px-4 py-3 text-left font-semibold">ผู้สอน</th>
                          <th className="px-4 py-3 text-left font-semibold">หมวด</th>
                          <th className="px-4 py-3 text-left font-semibold">วันเวลา</th>
                          <th className="px-4 py-3 text-left font-semibold">สังกัด</th>
                          <th className="px-4 py-3 text-left font-semibold">สถานที่</th>
                          <th className="px-4 py-3 text-center font-semibold">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayedSchedules.length === 0 && (
                          <tr>
                            <td className="px-4 py-4 text-center text-gray-500" colSpan={6}>
                              ยังไม่มีข้อมูลตารางสอน
                            </td>
                          </tr>
                        )}
                        {displayedSchedules.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-900 font-semibold flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                                {item.title?.[0] || "ส"}
                              </span>
                              <span>{item.title || item.subject || "ไม่ระบุวิชา"}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{formatTeacher(item.teacher)}</td>
                            <td className="px-4 py-3 text-gray-700">{item.division || item.category || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{formatRange(item.start, item.end)}</td>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="flex flex-col gap-1 text-[12px]">
                                <span className="inline-flex px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                  กองร้อย {item.companyCode || "-"}
                                </span>
                                <span className="inline-flex px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  กองพัน {item.battalionCode || "-"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{item.location || "-"}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => startEdit(item)}
                                  className="px-3 py-1.5 text-xs rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm"
                                >
                                  แก้ไข
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-700 hover:bg-red-50 shadow-sm"
                                >
                                  ลบ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden grid gap-3 p-4">
                  {displayedSchedules.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">ยังไม่มีข้อมูลตารางสอน</p>
                  )}
                  {displayedSchedules.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="border border-gray-100 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                              {item.title?.[0] || "ส"}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {item.title || item.subject || "ไม่ระบุวิชา"}
                              </p>
                              <p className="text-xs text-gray-500">
                                ครูผู้สอน: {formatTeacher(item.teacher)} | หมวด: {item.division || item.category || "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                              <span className="size-2 rounded-full bg-green-500" aria-hidden />
                              {formatRange(item.start, item.end)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                              กองร้อย {item.companyCode || "-"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                              กองพัน {item.battalionCode || "-"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                              📍 {item.location || "-"}
                            </span>
                            {item.allDay && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                ทั้งวัน
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end mt-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="px-3 py-2 text-xs rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 w-full sm:w-auto shadow-sm"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-2 text-xs rounded-lg border border-red-200 text-red-700 hover:bg-red-50 w-full sm:w-auto shadow-sm"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>

                      {item.description && (
                        <p className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">ปฏิทินตารางสอน</p>
                    <p className="text-xs text-gray-500">มุมมองรายเดือนแบบรวม</p>
                  </div>
                  <span className="text-[11px] text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">
                    อัปเดตวันนี้
                  </span>
                </div>
                <div className="overflow-x-auto px-2 pb-2">
                  <TeachingScheduleCalendar schedules={schedules} />
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
