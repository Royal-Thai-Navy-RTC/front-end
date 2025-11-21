import { useEffect, useState } from "react";
import axios from "axios";

const MOCK_ITEMS = [
  {
    id: "mock-1",
    title: "คู่มือทหารใหม่",
    description: "เอกสารพื้นฐานสำหรับทหารใหม่ ครอบคลุมระเบียบวินัยและการฝึกเบื้องต้น",
    category: "คู่มือ",
    fileUrl: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    title: "การเอาชีวิตรอดเบื้องต้น",
    description: "สรุปเทคนิคการเอาตัวรอดในภาคสนามและการปฐมพยาบาล",
    category: "ความรู้",
    fileUrl: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-3",
    title: "แนวทางการบังคับบัญชา",
    description: "กรอบแนวคิดการเป็นผู้นำและการสั่งการในหน่วย",
    category: "ผู้นำ",
    fileUrl: "",
    createdAt: new Date().toISOString(),
  },
];

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

export default function Library() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("/api/library");
        const payload = res.data?.data ?? res.data ?? [];
        if (Array.isArray(payload) && payload.length) {
          setItems(payload);
        } else {
          setItems(MOCK_ITEMS);
        }
      } catch (err) {
        setError(err?.response?.data?.message || "ไม่สามารถโหลดรายการห้องสมุดได้ (แสดงข้อมูลจำลอง)");
        setItems(MOCK_ITEMS);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      <section className="bg-white rounded-2xl shadow p-6 sm:p-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-500 font-semibold">Library</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-900">ห้องสมุดความรู้</h1>
          <p className="text-sm text-gray-500">เอกสาร คู่มือ และสื่อการเรียนรู้สำหรับกำลังพล</p>
          {loading && <p className="text-xs text-blue-600 mt-1">กำลังโหลด...</p>}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        {items.length === 0 && !loading && !error && (
          <p className="text-sm text-gray-500 text-center py-6">ยังไม่มีรายการห้องสมุด</p>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((doc) => (
            <article key={doc.id} className="border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{doc.title || "ไม่ระบุชื่อ"}</p>
                <span className="text-[11px] text-gray-400">{formatDate(doc.updatedAt || doc.createdAt)}</span>
              </div>
              {doc.description && <p className="text-xs text-gray-600 leading-relaxed">{doc.description}</p>}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>หมวด: {doc.category || "-"}</span>
                {doc.fileUrl ? (
                  <a className="text-blue-600 font-semibold hover:underline" href={doc.fileUrl} target="_blank" rel="noreferrer">
                    เปิดไฟล์
                  </a>
                ) : (
                  <span className="text-gray-400">ไม่มีไฟล์</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
