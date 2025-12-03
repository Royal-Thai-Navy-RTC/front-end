import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const STATUS_LABEL = {
  true: "เปิดรับ",
  false: "ปิดรับ",
};

export default function SoldierIntakeSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/public/soldier-intake/status");
      const data = res.data?.status ?? res.data ?? {};
      const value = typeof data === "boolean" ? data : Boolean(data.enabled ?? data.open ?? false);
      setEnabled(value);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "โหลดสถานะไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggle = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      const nextEnabled = !enabled;
      await axios.patch(
        "/api/admin/soldier-intake/status",
        { enabled: nextEnabled },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setEnabled(nextEnabled);
      setMessage(`ตั้งค่าเป็น${STATUS_LABEL[String(nextEnabled)]}สำเร็จ`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "บันทึกสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 flex flex-col gap-6">
      <section className="bg-white rounded-2xl shadow border border-gray-100 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">ตั้งค่า</p>
            <h1 className="text-2xl font-bold text-gray-900">การเปิดรับลงทะเบียนทหารใหม่</h1>
            <p className="text-sm text-gray-600 mt-1">
              เปิด/ปิดฟอร์มลงทะเบียนทหารใหม่ และตรวจสอบสถานะปัจจุบันจาก API สาธารณะ
            </p>
          </div>
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">สถานะฟอร์มลงทะเบียน</p>
            <p className={`text-2xl font-bold ${enabled ? "text-green-700" : "text-red-700"}`}>
              {enabled ? "เปิดรับอยู่" : "ปิดรับอยู่"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm ${
              enabled
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            } disabled:opacity-60`}
          >
            {saving ? "กำลังบันทึก..." : enabled ? "ปิดรับฟอร์ม" : "เปิดรับฟอร์ม"}
          </button>
        </div>

        {(error || message) && (
          <div
            className={`px-4 py-3 rounded-xl border text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {error || message}
          </div>
        )}
      </section>
    </div>
  );
}
