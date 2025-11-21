import React, { useEffect, useState } from "react";
import axios from "axios";
import TeachingScheduleCalendar from "../components/TeachingScheduleCalendar";

export default function PublicTeachingSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

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
          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">ปฏิทินตารางสอน</p>
                <p className="text-xs text-gray-500">มุมมองรายเดือนแบบรวม</p>
              </div>
            </div>
            <div className="overflow-x-auto px-2 pb-2">
              <TeachingScheduleCalendar schedules={schedules} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
