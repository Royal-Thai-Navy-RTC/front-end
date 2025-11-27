import React, { useState, useEffect, useMemo } from "react";
import { Eye } from "lucide-react";

export default function Message() {
  // ---------------- MOCK DATA ----------------
  const mockMessages = [
    {
      id: 1,
      title: "ประกาศฝึกยิงปืน",
      sender: "ครูฝึก กอไก่",
      date: "2025-11-20", // ใช้รูปแบบ YYYY-MM-DD
      isRead: false,
    },
    {
      id: 2,
      title: "แจ้งตารางเรียนเพิ่มเติม",
      sender: "งานธุรการ",
      date: "2025-11-18",
      isRead: true,
    },
    {
      id: 3,
      title: "เตรียมตัวเข้าทดสอบร่างกาย",
      sender: "ฝ่ายกำลังพล",
      date: "2025-11-15",
      isRead: false,
    },
    {
      id: 4,
      title: "สรุปผลการประเมินรายวิชา",
      sender: "ครูผู้สอน",
      date: "2025-11-10",
      isRead: true,
    },
    // เพิ่ม mock เพิ่มได้ตามต้องการ
  ];

  // ---------------- STATES ----------------
  const [messages, setMessages] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | READ | UNREAD
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // โหลด mock data
  useEffect(() => {
    setMessages(mockMessages);
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
        // +1 วันเพื่อให้ครอบคลุมทั้งวันนั้น
        to.setHours(23, 59, 59, 999);
        if (msgDate > to) return false;
      }

      return true;
    });
  }, [messages, searchText, statusFilter, dateFrom, dateTo]);

  // ---------------- PAGINATION ----------------
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));
  const paginated = filteredMessages.slice((page - 1) * pageSize, page * pageSize);

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

  // (option) toggle อ่านแล้ว/ยังไม่อ่าน ใน mock
  const toggleRead = (id) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              isRead: !m.isRead,
            }
          : m
      )
    );
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* HEADER + FILTER */}
      <section className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col md:w-1/3">
            <h1 className="text-3xl font-bold text-blue-900">กล่องข้อความ</h1>
            <p className="text-sm text-gray-500">
              ค้นหาข้อความตามคำค้น วันที่ และสถานะการอ่าน
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-2/3">
            {/* แถวบน: search + status */}
            <div className="flex flex-col md:flex-row gap-3 w-full">
              <input
                type="text"
                placeholder="ค้นหาตามหัวข้อหรือผู้ส่ง..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full md:w-1/2"
              />

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full md:w-1/2"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="UNREAD">ยังไม่อ่าน</option>
                <option value="READ">อ่านแล้ว</option>
              </select>
            </div>

            {/* แถวล่าง: date from / to + clear */}
            <div className="flex flex-col md:flex-row gap-3 w-full items-end md:items-center">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex flex-col w-full sm:w-1/2">
                  <label className="text-xs text-gray-500 mb-1">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full"
                  />
                </div>

                <div className="flex flex-col w-full sm:w-1/2">
                  <label className="text-xs text-gray-500 mb-1">ถึงวันที่</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:outline-none w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleClearFilter}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
              >
                ล้างการค้นหา
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="bg-white rounded-2xl shadow p-5 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-gray-700">
          <thead className="bg-blue-50 text-blue-700 font-semibold">
            <tr>
              <th className="p-3 border-b">หัวข้อ</th>
              <th className="p-3 border-b">ผู้ส่ง</th>
              <th className="p-3 border-b text-center">วันที่</th>
              {/*<th className="p-3 border-b text-center">สถานะ</th>
               <th className="p-3 border-b text-center">จัดการ</th> */}
            </tr>
          </thead>

          <tbody>
            {paginated.map((m, index) => (
              <tr
                key={m.id}
                className={`hover:bg-blue-50 ${
                  !m.isRead ? "bg-blue-50/40" : ""
                }`}
              >
                {/* <td className="p-3 border-b text-center">
                  {(page - 1) * pageSize + index + 1}
                </td> */}
                <td className="p-3 border-b">
                  <div className="font-medium">
                    {m.title}
                  </div>
                </td>
                <td className="p-3 border-b">
                  <span className="text-sm text-gray-600">{m.sender}</span>
                </td>
                <td className="p-3 border-b text-center">
                  {m.date}
                </td>
                {/*<td className="p-3 border-b text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      m.isRead
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {m.isRead ? "อ่านแล้ว" : "ยังไม่อ่าน"}
                  </span>
                </td>
                 <td className="p-3 border-b text-center">
                  <button
                    onClick={() => toggleRead(m.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm"
                  >
                    <Eye size={16} />
                    {m.isRead ? "ทำเป็นยังไม่อ่าน" : "อ่านแล้ว"}
                  </button>
                </td> */}
              </tr>
            ))}

            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-400">
                  ไม่พบข้อความ
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-4 text-sm">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-40"
          >
            ก่อนหน้า
          </button>

          <span>
            หน้า {page} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </section>
    </div>
  );
}
