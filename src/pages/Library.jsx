import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

export default function Library() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 24, total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ id: null, title: "", description: "", category: "", fileUrl: "", coverUrl: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const role = (localStorage.getItem("role") || "").toUpperCase();
  const isAdminOwner = role === "ADMIN" || role === "OWNER";
  const visibleItems = useMemo(() => {
    // owner/admin เห็นทุกอัน ชี้สถานะ; บทบาทอื่นเห็นเฉพาะที่เปิดเผย
    if (isAdminOwner) return items;
    return items.filter((item) => item.isActive !== false);
  }, [items, isAdminOwner]);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/library", {
        params: {
          page: pageInfo.page,
          pageSize: pageInfo.pageSize,
          includeInactive: isAdminOwner ? true : undefined,
        },
      });
      const payload = res.data?.data ?? res.data?.items ?? res.data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
      setPageInfo((prev) => ({
        page: res.data?.page ?? prev.page,
        pageSize: res.data?.pageSize ?? prev.pageSize,
        total: res.data?.total ?? payload.length,
        totalPages: res.data?.totalPages ?? prev.totalPages,
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "ไม่สามารถโหลดรายการห้องสมุดได้");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAdminOwner, pageInfo.page, pageInfo.pageSize]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const openModal = (item = null) => {
    if (item) {
      setForm({
        id: item.id || null,
        title: item.title || "",
        description: item.description || "",
        category: item.category || "",
        fileUrl: item.fileUrl || "",
        coverUrl: item.coverUrl || "",
        isActive: item.isActive !== false,
      });
    } else {
      setForm({ id: null, title: "", description: "", category: "", fileUrl: "", coverUrl: "", isActive: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setForm({ id: null, title: "", description: "", category: "", fileUrl: "", coverUrl: "", isActive: true });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุชื่อหนังสือ/เอกสาร" });
      return;
    }
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      fileUrl: form.fileUrl,
      coverUrl: form.coverUrl,
      isActive: Boolean(form.isActive),
    };
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    setSaving(true);
    try {
      if (form.id) {
        const res = await axios.put(`/api/library/${form.id}`, payload, { headers });
        const updated = res.data?.item ?? res.data?.data ?? res.data ?? { ...payload, id: form.id };
        setItems((prev) => prev.map((it) => (it.id === form.id ? { ...it, ...updated } : it)));
        Swal.fire({ icon: "success", title: "อัปเดตสำเร็จ", timer: 1400, showConfirmButton: false });
      } else {
        const res = await axios.post("/api/library", payload, { headers });
        const created = res.data?.item ?? res.data?.data ?? res.data ?? { ...payload, id: Date.now().toString() };
        setItems((prev) => [created, ...prev]);
        Swal.fire({ icon: "success", title: "เพิ่มรายการสำเร็จ", timer: 1400, showConfirmButton: false });
      }
      fetchLibrary();
      closeModal();
    } catch (err) {
      Swal.fire({ icon: "error", title: "บันทึกข้อมูลไม่สำเร็จ", text: err?.response?.data?.message || err?.message || "" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ",
      text: "ต้องการลบรายการนี้หรือไม่?",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`/api/library/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setItems((prev) => prev.filter((it) => it.id !== id));
      Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1200, showConfirmButton: false });
      fetchLibrary();
    } catch (err) {
      Swal.fire({ icon: "error", title: "ลบข้อมูลไม่สำเร็จ", text: err?.response?.data?.message || err?.message || "" });
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <section className="bg-white rounded-2xl shadow p-6 sm:p-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-500 font-semibold">Library</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-900">ห้องสมุดความรู้</h1>
          <p className="text-sm text-gray-500">เอกสาร คู่มือ และสื่อการเรียนรู้สำหรับกำลังพล</p>
          {loading && <p className="text-xs text-blue-600 mt-1">กำลังโหลด...</p>}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          {isAdminOwner && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => openModal()}
                className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow"
              >
                เพิ่มหนังสือ/เอกสาร
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-gray-800">รายการห้องสมุด</p>
            <p className="text-xs text-gray-500">
              ทั้งหมด {visibleItems.length} รายการ {isAdminOwner ? "(รวมที่ไม่เผยแพร่)" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
              แสดงล่าสุด {pageInfo.pageSize} รายการ
            </span>
          </div>
        </div>

        {visibleItems.length === 0 && !loading && !error && (
          <p className="text-sm text-gray-500 text-center py-6">ยังไม่มีรายการห้องสมุด</p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
              <tr>
                <th className="p-3 text-left w-16">ปก</th>
                <th className="p-3 text-left">ชื่อเรื่อง</th>
                <th className="p-3 text-left w-32">หมวดหมู่</th>
                <th className="p-3 text-left w-32">อัปเดตล่าสุด</th>
                {isAdminOwner && <th className="p-3 text-left w-28">สถานะ</th>}
                <th className="p-3 text-left w-32">ไฟล์</th>
                {isAdminOwner && <th className="p-3 text-left w-32">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleItems.map((doc, idx) => (
                <tr key={doc.id || `lib-${idx}`} className="hover:bg-gray-50 transition">
                  <td className="p-3">
                    {doc.coverUrl ? (
                      <img src={doc.coverUrl} alt={doc.title} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-[11px] text-gray-400">
                        ไม่มีปก
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900">{doc.title || "ไม่ระบุชื่อ"}</span>
                      {doc.description && <span className="text-xs text-gray-500 line-clamp-2">{doc.description}</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-[12px] text-gray-700">
                      {doc.category || "ไม่ระบุ"}
                    </span>
                  </td>
                  <td className="p-3 text-[12px] text-gray-600">{formatDate(doc.updatedAt || doc.createdAt)}</td>
                  {isAdminOwner && (
                    <td className="p-3">
                      {doc.isActive === false ? (
                        <span className="inline-flex px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[12px]">
                          ไม่เผยแพร่
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px]">
                          เผยแพร่
                        </span>
                      )}
                    </td>
                  )}
                  <td className="p-3">
                    {doc.fileUrl ? (
                      <a
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-gray-800 border border-gray-200 font-semibold hover:-translate-y-px hover:shadow-sm transition text-xs"
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="text-gray-500">📄</span>
                        <span>เปิดไฟล์</span>
                        <span className="text-gray-400 text-[11px]">↗</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">ไม่มีไฟล์</span>
                    )}
                  </td>
                  {isAdminOwner && (
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => openModal(doc)}
                          className="px-3 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="px-3 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={isAdminOwner ? 7 : 6} className="text-center py-6 text-gray-500 text-sm">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isAdminOwner && modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-500 font-semibold">{form.id ? "แก้ไข" : "เพิ่ม"} หนังสือ/เอกสาร</p>
                <p className="text-xs text-gray-500">กรอกข้อมูลให้ครบถ้วน</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 text-xl" disabled={saving}>
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <label className="flex flex-col text-sm text-gray-700">
                ชื่อเรื่อง
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="border rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                />
              </label>
              <label className="flex flex-col text-sm text-gray-700">
                หมวดหมู่
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="border rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                />
              </label>
              <label className="flex flex-col text-sm text-gray-700">
                ลิงก์ไฟล์ (URL)
                <input
                  type="text"
                  name="fileUrl"
                  value={form.fileUrl}
                  onChange={handleChange}
                  className="border rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  placeholder="https://..."
                />
              </label>
              <label className="flex flex-col text-sm text-gray-700">
                ปกหนังสือ (รูปภาพ URL)
                <input
                  type="text"
                  name="coverUrl"
                  value={form.coverUrl}
                  onChange={handleChange}
                  className="border rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  placeholder="https://..."
                />
              </label>
              <label className="flex flex-col text-sm text-gray-700">
                คำอธิบาย
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="border rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="size-4" />
                เปิดแสดงผล
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : form.id ? "บันทึกการแก้ไข" : "เพิ่มหนังสือ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
