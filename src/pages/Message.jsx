import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import { Search } from "lucide-react";

const MOCK_MESSAGES = [
  {
    id: 1,
    title: "แจ้งเตือน: ยังไม่ส่งยอดนักเรียนประจำวัน",
    sender: "ระบบแจ้งเตือน",
    date: "2025-11-20", // ใช้รูปแบบ YYYY-MM-DD
    isRead: false,
  },
  {
    id: 2,
    title: "เตือน: กรุณาประเมินนักเรียนชุด A ก่อนเที่ยงวันนี้",
    sender: "ฝ่ายกำกับดูแล",
    date: "2025-11-18",
    isRead: true,
  },
  {
    id: 3,
    title: "แจ้งเตือน: รายชื่อผลัด B ยังไม่ครบถ้วน",
    sender: "ระบบแจ้งเตือน",
    date: "2025-11-15",
    isRead: false,
  },
  {
    id: 4,
    title: "ย้ำเตือน: ประเมินผลปลายสัปดาห์ของผลัด C",
    sender: "ฝ่ายกำกับดูแล",
    date: "2025-11-10",
    isRead: true,
  },
];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

export default function Message() {

  // ---------------- STATES ----------------
  const [messages, setMessages] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | READ | UNREAD
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);
  const inFlightRef = useRef(false);
  const lastToastCountRef = useRef(null);
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const token = localStorage.getItem("token");
  const pageSize = 10;
  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages]);
  const typeLabel = (type) =>
    ({
      TRAINING_REPORT_MISSING: "ยังไม่ส่งยอดนักเรียน",
      STUDENT_EVALUATION_MISSING: "ยังไม่ประเมินนักเรียน",
    }[type] || "แจ้งเตือน");

  const fetchNotifications = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const isOwner = role === "OWNER";
      const url = isOwner ? "/api/owner/notifications" : "/api/teacher/notifications";
      const response = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { page, pageSize: 10 },
      });
      const payload = response.data?.data ?? response.data?.items ?? response.data ?? [];
      const list = Array.isArray(payload) ? payload : payload?.data || [];
      const normalized = list.map((item) => ({
        id: item.id || item._id || `${item.type || "notice"}-${item.dueAt || item.schedule?.start}`,
        title: item.title || item.schedule?.title || "ไม่ระบุหัวข้อ",
        sender: item.teacher?.name || item.teacherName || "ระบบแจ้งเตือน",
        date: item.dueAt || item.schedule?.start || item.createdAt,
        message: item.message || "",
        type: item.type || "",
        status: item.status || "unread",
        isRead: item.status ? item.status !== "unread" : Boolean(item.isRead),
        teacherName: item.teacher?.name || item.teacherName || "",
        teacherRank: item.teacher?.rank,
        source: item.source || "ระบบแจ้งเตือน",
        scheduleTitle: item.schedule?.title || "",
        scheduleStart: item.schedule?.start || "",
        scheduleEnd: item.schedule?.end || "",
        scheduleLocation: item.schedule?.location,
        companyCode: item.schedule?.companyCode,
        battalionCode: item.schedule?.battalionCode,
      }));
      setMessages(normalized);
      const totalCount = response.data?.total || normalized.length;
      setPageInfo({
        page: response.data?.page || page,
        pageSize: response.data?.pageSize || 10,
        total: totalCount,
        totalPages: response.data?.totalPages || 1,
      });
      setLastUpdated(new Date());
      setFetched(true);
      if (totalCount > 0 && lastToastCountRef.current !== totalCount) {
        lastToastCountRef.current = totalCount;
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(`มีการแจ้งเตือน ${totalCount} รายการ`);
        toastTimerRef.current = setTimeout(() => setToast(""), 3200);
      }
      if (totalCount === 0) {
        setError("วันนี้ยังไม่มีแจ้งเตือน");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "ไม่สามารถโหลดแจ้งเตือนได้");
      setMessages(MOCK_MESSAGES);
      setFetched(true);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [page, role, token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // ---------------- FILTER LOGIC ----------------
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const text = `${m.title} ${m.sender}`.toLowerCase();
      const keyword = searchText.toLowerCase();

      // filter keyword
      if (keyword && !text.includes(keyword)) return false;

      // filter status
      if (statusFilter === "READ" && !m.isRead) return false;
      if (statusFilter === "UNREAD" && m.isRead) return false;

      // filter date
      const msgDate = new Date(m.date);
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (msgDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (msgDate > to) return false;
      }

      return true;
    });
  }, [messages, searchText, statusFilter, dateFrom, dateTo]);

  // ---------------- PAGINATION ----------------
  const sortedMessages = useMemo(
    () => [...filteredMessages].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filteredMessages]
  );
  const totalPages = pageInfo.totalPages || Math.max(1, Math.ceil(sortedMessages.length / pageSize));
  const paginated = sortedMessages.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const handleClearFilter = () => {
    setSearchText("");
    setStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // mark as read เมื่อคลิกข้อความ + ยิง endpoint
  const markAsRead = async (id) => {
    if (!id) return;
    const target = messages.find((m) => m.id === id);
    if (target?.isRead) return;

    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true, status: "read" } : m)));

    try {
      const isOwner = role === "OWNER";
      const url = isOwner ? "/api/owner/notifications/read" : "/api/teacher/notifications/read";
      await axios.patch(
        url,
        { ids: [id] },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
    } catch (err) {
      // หากยิงไม่ผ่านย้อนสถานะกลับ
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: false, status: target?.status || "unread" } : m)));
      console.error("mark read failed", err);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* HERO + FILTER */}
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-r from-[#f2f6ff] via-white to-white shadow-md">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] p-6 sm:p-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 ring-1 ring-blue-100">
              แจ้งเตือน
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">ศูนย์แจ้งเตือนงานประจำ</h1>
            <p className="text-sm text-gray-600 max-w-xl">
              ใช้แจ้งเตือนสำหรับผู้ที่ยังไม่ส่งยอดนักเรียน หรือยังไม่ประเมินนักเรียน มองเห็นสถานะอ่านแล้ว/ยังไม่อ่านชัดเจน พร้อมค้นหาได้ทันที
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-blue-800 shadow-sm ring-1 ring-blue-100">
                ยังไม่อ่าน {unreadCount} รายการ
              </span>
              <span className="rounded-full bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
                ทั้งหมด {pageInfo.total || messages.length} รายการ
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาหัวข้อหรือผู้ส่งแจ้งเตือน..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "ALL", label: "ทั้งหมด" },
                { key: "UNREAD", label: "ยังไม่อ่าน" },
                { key: "READ", label: "อ่านแล้ว" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setStatusFilter(opt.key);
                    setPage(1);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === opt.key
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:text-blue-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-xs text-gray-600 gap-1">
                ตั้งแต่วันที่
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex flex-col text-xs text-gray-600 gap-1">
                ถึงวันที่
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            <button
              onClick={handleClearFilter}
              className="self-start rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ล้างการค้นหา
            </button>
          </div>
        </div>
      </section>

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 shadow-xl ring-1 ring-blue-100 px-4 py-3 text-sm text-blue-800 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-semibold">{toast}</span>
          </div>
        </div>
      )}

      {/* INBOX LIST */}
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg">
        <div className="flex sm:flex-row flex-col items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            กล่องแจ้งเตือน {paginated.length} รายการในหน้า {page}/{totalPages}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {loading && <span className="text-blue-600">กำลังโหลด...</span>}
            {!loading && error && <span className="text-red-500">{error}</span>}
            {!loading && !error && (
              <>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">ยังไม่อ่านจะเข้ม</span>
                <span className="rounded-full bg-gray-50 px-3 py-1 text-gray-600">อ่านแล้วจะจาง</span>
              </>
            )}
            <button
              type="button"
              onClick={fetchNotifications}
              className="ml-3 rounded-xl border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:border-blue-400 hover:bg-blue-50"
              disabled={loading}
            >
              รีเฟรช
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {paginated.map((m) => (
            <div
              key={m.id}
              onClick={() => markAsRead(m.id)}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-5 py-3 transition cursor-pointer ${
                m.isRead ? "bg-white hover:bg-blue-50/40" : "bg-blue-50/60 hover:bg-blue-100/60"
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  markAsRead(m.id);
                }
              }}
            >
              <div className="flex items-center gap-3">
                {!m.isRead && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-semibold text-white shadow-sm">
                  {m.sender?.slice(0, 1) || "?"}
                </div>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {typeLabel(m.type)}
                  </span>
                  <p
                    className={`truncate ${
                      m.isRead ? "font-medium text-gray-600" : "font-semibold text-slate-900"
                    }`}
                  >
                    {m.title}
                  </p>
                  {/* แถบ "ใหม่" แสดงเฉพาะที่ยังไม่อ่าน */}
                  {!m.isRead && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      ใหม่
                    </span>
                  )}
                </div>
                <p className={`truncate text-sm ${m.isRead ? "text-gray-500" : "text-gray-600"}`}>
                  {m.message || m.sender} • {formatDate(m.date)}
                </p>
                {m.scheduleTitle && (
                  <p className="truncate text-xs text-gray-500">
                    คาบ: {m.scheduleTitle} {m.companyCode || m.battalionCode ? `· ${m.companyCode || "-"} / ${m.battalionCode || "-"}` : ""}
                  </p>
                )}
                {(m.teacherName || m.scheduleLocation || m.scheduleStart) && (
                  <p className="truncate text-xs text-gray-500">
                    {m.teacherName ? `ครู: ${m.teacherName}` : ""}
                    {m.scheduleLocation ? ` · สถานที่ ${m.scheduleLocation}` : ""}
                    {m.scheduleStart ? ` · เริ่ม ${formatDate(m.scheduleStart)}` : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end text-xs text-gray-500">
                <span className="hidden sm:inline">{formatDate(m.date)}</span>
                <span className="sm:hidden">กดเพื่ออ่าน</span>
              </div>
            </div>
          ))}

          {paginated.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-500">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-2xl">📭</div>
              <p className="font-semibold text-gray-700">ไม่พบข้อความ</p>
              <p className="text-sm text-gray-500">ลองเปลี่ยนคำค้นหรือช่วงวันที่</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 text-sm">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50"
          >
            ก่อนหน้า
          </button>
          <span className="text-gray-600">
            หน้า {page} จาก {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50"
          >
            ถัดไป
          </button>
        </div>
      </section>
    </div>
  );
}
