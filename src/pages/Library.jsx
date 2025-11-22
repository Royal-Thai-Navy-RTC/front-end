import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

export default function Library() {
  const CACHE_KEY = "libraryCache";
  const CACHE_TTL_MS = 15 * 60 * 1000;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 24, total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ id: null, title: "", description: "", category: "", fileUrl: "", coverUrl: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const role = (localStorage.getItem("role") || "").toUpperCase();
  const isAdminOwner = role === "ADMIN" || role === "OWNER";
  const visibleItems = useMemo(() => {
    // owner/admin เห็นทุกอัน ชี้สถานะ; บทบาทอื่นเห็นเฉพาะที่เปิดเผย
    if (isAdminOwner) return items;
    return items.filter((item) => item.isActive !== false);
  }, [items, isAdminOwner]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(visibleItems.map((i) => i.category).filter(Boolean)));
    return list;
  }, [visibleItems]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return visibleItems.filter((item) => {
      const matchCategory = categoryFilter === "all" || (item.category || "").toLowerCase() === categoryFilter;
      const matchSearch =
        !keyword ||
        (item.title || "").toLowerCase().includes(keyword) ||
        (item.description || "").toLowerCase().includes(keyword) ||
        (item.category || "").toLowerCase().includes(keyword);
      return matchCategory && matchSearch;
    });
  }, [visibleItems, search, categoryFilter]);

  const latestItem = useMemo(() => {
    if (!visibleItems.length) return null;
    return [...visibleItems].sort(
      (a, b) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime()
    )[0];
  }, [visibleItems]);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setError("");
    const includeInactive = isAdminOwner ? true : undefined;

    // อ่าน cache เพื่อหลีกเลี่ยงการยิง request ถี่ ๆ (เก็บ 15 นาที)
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const isValid =
          cached &&
          cached.timestamp &&
          Date.now() - cached.timestamp < CACHE_TTL_MS &&
          cached.includeInactive === Boolean(includeInactive);
        if (isValid) {
          setItems(Array.isArray(cached.items) ? cached.items : []);
          setPageInfo((prev) => ({
            page: cached.pageInfo?.page ?? prev.page,
            pageSize: cached.pageInfo?.pageSize ?? prev.pageSize,
            total: cached.pageInfo?.total ?? cached.items?.length ?? prev.total,
            totalPages: cached.pageInfo?.totalPages ?? prev.totalPages,
          }));
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore cache errors
    }

    try {
      const res = await axios.get("/api/library", {
        params: {
          page: pageInfo.page,
          pageSize: pageInfo.pageSize,
          includeInactive,
        },
      });
      const payload = res.data?.data ?? res.data?.items ?? res.data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
      const nextPageInfo = {
        page: res.data?.page ?? pageInfo.page,
        pageSize: res.data?.pageSize ?? pageInfo.pageSize,
        total: res.data?.total ?? payload.length,
        totalPages: res.data?.totalPages ?? pageInfo.totalPages,
      };
      setPageInfo(nextPageInfo);

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            includeInactive: Boolean(includeInactive),
            items: Array.isArray(payload) ? payload : [],
            pageInfo: nextPageInfo,
          })
        );
      } catch {
        // ignore cache write errors
      }
    } catch (err) {
      setError(err?.response?.data?.message || "ไม่สามารถโหลดรายการห้องสมุดได้");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [CACHE_TTL_MS, isAdminOwner, pageInfo.page, pageInfo.pageSize, pageInfo.totalPages]);

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
        localStorage.removeItem(CACHE_KEY);
        Swal.fire({ icon: "success", title: "อัปเดตสำเร็จ", timer: 1400, showConfirmButton: false });
      } else {
        const res = await axios.post("/api/library", payload, { headers });
        const created = res.data?.item ?? res.data?.data ?? res.data ?? { ...payload, id: Date.now().toString() };
        setItems((prev) => [created, ...prev]);
        localStorage.removeItem(CACHE_KEY);
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
      localStorage.removeItem(CACHE_KEY);
      Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1200, showConfirmButton: false });
      fetchLibrary();
    } catch (err) {
      Swal.fire({ icon: "error", title: "ลบข้อมูลไม่สำเร็จ", text: err?.response?.data?.message || err?.message || "" });
    }
  };

  return (
    <div className="w-full flex flex-col gap-8">
      <section className="relative overflow-visible rounded-3xl bg-white/85 backdrop-blur border border-blue-50 shadow-xl z-0">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(14,116,144,0.08),transparent_40%)]" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 w-72 h-72 bg-blue-100/50 blur-3xl rounded-full -z-10" />
        <div className="relative z-0 grid gap-5 lg:grid-cols-[1.4fr_1fr] px-6 sm:px-10 py-6 text-slate-800">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ring-1 ring-blue-100">
              คลังหนังสือ
            </div>
            <h1 className="text-3xl sm:text-[34px] lg:text-[36px] font-bold leading-tight text-slate-900">
              คลังหนังสือ กำลังพล
              <span className="block text-blue-700 text-base sm:text-lg font-semibold mt-2">หนังสือดิจิทัล คู่มือ และสื่อการเรียนรู้</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
              เข้าถึงคลังหนังสือดิจิทัลมาตรฐานศูนย์ฝึกทหารใหม่ จัดหมวดหมู่ชัดเจน ดาวน์โหลดง่าย พร้อมข้อมูลครบถ้วนสำหรับการฝึกและพัฒนากำลังพล
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-sm text-blue-800 ring-1 ring-blue-100">
                <span className="text-lg">📚</span>
                <span>รายการทั้งหมด {visibleItems.length} เล่ม</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-sm text-blue-800 ring-1 ring-blue-100">
                <span className="text-lg">⚡</span>
                <span>อัปเดตล่าสุด {formatDate(visibleItems[0]?.updatedAt || visibleItems[0]?.createdAt)}</span>
              </div>
              {isAdminOwner && (
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-lg hover:-translate-y-0.5 transition"
                >
                  ➕ เพิ่มหนังสือ
                </button>
              )}
            </div>
            {loading && <p className="text-xs text-blue-700">กำลังโหลดข้อมูล...</p>}
            {error && <p className="text-xs text-amber-600">เกิดข้อผิดพลาด: {error}</p>}
          </div>
          <div className="relative">
            <div className="absolute inset-4 rounded-3xl bg-gradient-to-br from-blue-50 via-white to-white blur-xl" />
            <div className="relative h-full bg-white/90 backdrop-blur-sm rounded-3xl border border-blue-100 p-4 grid gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-xs text-blue-800 uppercase tracking-wide">หนังสือล่าสุด</div>
                <div className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">ใหม่</div>
              </div>
              <div className="grid grid-cols-[72px_1fr] gap-3 items-center">
                <div className="w-full h-24 rounded-2xl bg-blue-50 border border-blue-100 overflow-hidden">
                  {latestItem?.coverUrl ? (
                    <img src={latestItem.coverUrl} alt={latestItem.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-blue-400">No cover</div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-blue-700">{latestItem?.category || "ทั่วไป"}</p>
                  <p className="text-base font-semibold text-slate-900 line-clamp-2">{latestItem?.title || "เลือกอ่านหนังสือที่คุณสนใจ"}</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{latestItem?.description || "เข้าถึงเนื้อหาคุณภาพได้ทุกที่ ทุกเวลา"}</p>
                  {latestItem?.fileUrl && (
                    <a
                      className="inline-flex items-center gap-2 text-xs text-blue-700 underline decoration-blue-300 decoration-1 underline-offset-4"
                      href={latestItem.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      อ่านเลย ↗
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-blue-800">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="uppercase tracking-wide text-blue-500">รายการ</p>
                  <p className="text-base font-bold">{visibleItems.length}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="uppercase tracking-wide text-blue-500">หมวด</p>
                  <p className="text-base font-bold">{categories.length || 1}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="uppercase tracking-wide text-blue-500">ต่อหน้า</p>
                  <p className="text-base font-bold">{pageInfo.pageSize}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">เลือกหนังสือที่ใช่</p>
            <p className="text-sm text-gray-500">
              ทั้งหมด {filteredItems.length} รายการ {isAdminOwner ? "(รวมรายการที่ยังไม่เผยแพร่)" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อหนังสือ คำอธิบาย หรือหมวดหมู่"
                className="w-64 sm:w-72 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
              <span className="absolute right-3 top-2.5 text-gray-400 text-sm">⌕</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-2 rounded-2xl border text-sm transition ${
                  categoryFilter === "all" ? "bg-indigo-600 text-white border-indigo-600 shadow" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                ทั้งหมด
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat.toLowerCase())}
                  className={`px-3 py-2 rounded-2xl border text-sm transition ${
                    categoryFilter === cat.toLowerCase() ? "bg-indigo-600 text-white border-indigo-600 shadow" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredItems.length === 0 && !loading && !error && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200 bg-gray-50">
            <p className="text-base font-semibold text-gray-700">ยังไม่มีรายการที่ตรงเงื่อนไข</p>
            <p className="text-sm text-gray-500 mt-1">ลองค้นหาคำอื่น หรือเลือกหมวดหมู่ “ทั้งหมด”</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(loading ? Array.from({ length: 6 }) : filteredItems).map((doc, idx) => {
            const showSkeleton = loading;
            const key = doc?.id || `lib-card-${idx}`;
            return (
              <div
                key={key}
                className="relative group h-full rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-xl transition"
              >
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-indigo-50 via-white to-purple-50 opacity-80" />
                <div className="relative grid grid-cols-[110px_1fr] gap-4 p-5">
                  <div className="w-full h-36 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200">
                    {showSkeleton ? (
                      <div className="h-full w-full animate-pulse bg-gray-200" />
                    ) : doc?.coverUrl ? (
                      <img src={doc.coverUrl} alt={doc.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">ไม่มีปก</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-[12px] uppercase tracking-wide text-gray-500">
                          {showSkeleton ? <span className="inline-block h-3 w-20 bg-gray-200 animate-pulse rounded" /> : doc?.category || "ทั่วไป"}
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
                          {showSkeleton ? <span className="inline-block h-4 w-32 bg-gray-200 animate-pulse rounded" /> : doc?.title || "ไม่ระบุชื่อ"}
                        </h3>
                      </div>
                      {isAdminOwner && !showSkeleton && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                            doc?.isActive === false
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {doc?.isActive === false ? "ไม่เผยแพร่" : "เผยแพร่"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {showSkeleton ? <span className="inline-block h-3 w-full bg-gray-200 animate-pulse rounded" /> : doc?.description || "ยังไม่มีคำอธิบาย"}
                    </p>
                    <div className="flex items-center gap-2 text-[12px] text-gray-500">
                      <span>อัปเดต {showSkeleton ? "-" : formatDate(doc?.updatedAt || doc?.createdAt)}</span>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {showSkeleton ? (
                        <span className="inline-block h-9 w-24 bg-gray-200 animate-pulse rounded-xl" />
                      ) : doc?.fileUrl ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition"
                        >
                          อ่านเลย ↗
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-500 border border-dashed border-gray-200">
                          ไม่มีไฟล์
                        </span>
                      )}
                      {isAdminOwner && !showSkeleton && (
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => openModal(doc)}
                            className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
