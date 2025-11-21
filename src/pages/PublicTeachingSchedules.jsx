import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TeachingScheduleCalendar from "../components/TeachingScheduleCalendar";

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

export default function PublicTeachingSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = สัปดาห์นี้

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const response = await axios.get("/api/admin/teaching-schedules");
        const payload = response.data?.data ?? response.data;
        const parsed = Array.isArray(payload) ? payload : payload?.items || [];
        setSchedules(parsed);
      } catch (err) {
        const msg = err?.response?.data?.message || "ไม่สามารถดึงตารางสอนได้";
        setFetchError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);
    const endWindow = new Date(startOfWeek);
    endWindow.setDate(endWindow.getDate() + 7);
    return schedules.filter((item) => {
      if (!item.start) return false;
      const t = new Date(item.start);
      if (Number.isNaN(t.getTime())) return false;
      return t >= startOfWeek && t < endWindow;
    });
  }, [schedules, weekOffset]);

  const weekRangeLabel = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const format = (d) =>
      d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    const prefix = weekOffset === 0 ? "สัปดาห์นี้" : weekOffset > 0 ? `สัปดาห์หน้า +${weekOffset}` : `สัปดาห์ก่อน ${Math.abs(weekOffset)}`;
    return `${prefix} • ${format(start)} - ${format(end)}`;
  }, [weekOffset]);

  return (
    <div className="flex flex-col w-full gap-5">
      <section className="bg-white shadow rounded-2xl p-6 border border-gray-100 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold w-fit">
              SCHEDULE
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ปฏิทินตารางสอน</h1>
            <p className="text-sm text-gray-500">มุมมองรายเดือนแบบรวม (สำหรับผู้ใช้ทั่วไป)</p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-2xl p-5 border border-gray-100 flex flex-col gap-4">
        {loading && <p className="text-blue-600 text-sm">กำลังโหลดตารางสอน...</p>}
        {fetchError && !loading && <p className="text-red-500 text-sm">{fetchError}</p>}
        {!loading && !fetchError && (
          <>
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify_between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">ปฏิทินตารางสอน</p>
                  <p className="text-xs text-gray-500">มุมมองรายเดือนแบบรวม (แสดงทั้งหมด)</p>
                </div>
              </div>
              <div className="overflow-x-auto px-2 pb-2">
                <TeachingScheduleCalendar schedules={schedules} />
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">รายละเอียดตารางสอน</p>
                  <p className="text-xs text-gray-500">{weekRangeLabel}</p>
                </div>
                <span className="text-[11px] text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">
                  ทั้งหมด {filtered.length} รายการ
                </span>
              </div>
              <div className="flex justify-end gap-2 px-4 pt-3">
                <button
                  onClick={() => setWeekOffset((v) => v - 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-white shadow-sm"
                >
                  สัปดาห์ก่อนหน้า
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm"
                >
                  กลับมาสัปดาห์นี้
                </button>
                <button
                  onClick={() => setWeekOffset((v) => v + 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-white shadow-sm"
                >
                  สัปดาห์ถัดไป
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3 p-4">
                {filtered.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4 md:col-span-2">ยังไม่มีข้อมูลตารางสอน</p>
                )}
                {filtered
                  .slice()
                  .sort((a, b) => {
                    const aTime = a.start ? new Date(a.start).getTime() : 0;
                    const bTime = b.start ? new Date(b.start).getTime() : 0;
                    return aTime - bTime;
                  })
                  .map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
                          {item.title?.[0] || "ส"}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{item.title || item.subject || "ไม่ระบุวิชา"}</p>
                          <p className="text-xs text-gray-500">ครูผู้สอน: {item.teacher ? (item.teacher.firstName || "") + " " + (item.teacher.lastName || "") : "-"}</p>
                          <p className="text-xs text-gray-500">วันเวลา: {formatRange(item.start, item.end)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                          📍 {item.location || "-"}
                        </span>
                        {item.companyCode && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            กองร้อย {item.companyCode}
                          </span>
                        )}
                        {item.battalionCode && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            กองพัน {item.battalionCode}
                          </span>
                        )}
                        {item.allDay && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                            ทั้งวัน
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
