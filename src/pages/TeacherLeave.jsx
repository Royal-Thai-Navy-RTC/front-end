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
  return [];
};

export default function TeacherLeave() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchLeaves = useCallback(async () => {
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
  }, [headers]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

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

  const formatRange = (start, end) => {
    if (!start) return "-";
    const startDate = new Date(start);
    const startText = startDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
    if (!end) return startText;
    const endDate = new Date(end);
    const endText = endDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
    return `${startText} - ${endText}`;
  };

  const getLeaveTypeLabel = (value) => LEAVE_TYPES.find((type) => type.value === value)?.label || value || "-";

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
                  {getLeaveTypeLabel(leave.leaveType)} · {formatRange(leave.startDate, leave.endDate)}
                </p>
                <span className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                  {leave.status ? leave.status : "รออนุมัติ"}
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

