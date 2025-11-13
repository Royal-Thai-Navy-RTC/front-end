import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

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

export default function TeacherRollCall() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

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

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
  if (!dateValue) return "-";
  const date = new Date(`${dateValue}T${timeValue || "00:00"}`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
