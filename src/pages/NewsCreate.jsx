import React, { useState, useMemo } from "react";
import {
  ImagePlus,
  Upload,
  Save,
  Newspaper,
  Link as LinkIcon,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";

export default function NewsCreate() {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [externalLink, setExternalLink] = useState("");

  // สำหรับโหมดแก้ไข
  const [editingId, setEditingId] = useState(null);

  // ฟิลเตอร์ค้นหา
  const [searchTitle, setSearchTitle] = useState("");
  const [searchDate, setSearchDate] = useState("");

  // mock ข้อมูลข่าวที่เคยสร้าง
  const [newsItems, setNewsItems] = useState([
    {
      id: 1,
      title: "พิธีสวนสนามกองทหารใหม่ ประจำปี 2568",
      detail:
        "จัดขึ้นเพื่อแสดงความพร้อมและวินัยของทหารใหม่ต่อผู้บังคับบัญชา...",
      imageUrl:
        "https://images.pexels.com/photos/113757/pexels-photo-113757.jpeg",
      externalLink: "https://www.navy.mi.th",
      createdAt: "2025-12-01",
    },
    {
      id: 2,
      title: "ประกาศตารางฝึกภาคสนาม รุ่นที่ 3",
      detail:
        "แจ้งกำหนดการฝึกภาคสนามสำหรับทหารใหม่รุ่นที่ 3 โปรดตรวจสอบรายละเอียด...",
      imageUrl:
        "https://images.pexels.com/photos/60225/pexels-photo-60225.jpeg",
      externalLink: "",
      createdAt: "2025-12-03",
    },
  ]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const resetForm = () => {
    setTitle("");
    setDetail("");
    setExternalLink("");
    setPreview(null);
    setFile(null);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("กรุณากรอกหัวข้อข่าว");
      return;
    }

    if (editingId) {
      // ---------------- แก้ไขข่าวเดิม ----------------
      setNewsItems((prev) =>
        prev.map((item) => {
          if (item.id !== editingId) return item;
          return {
            ...item,
            title,
            detail,
            externalLink,
            imageUrl: preview || item.imageUrl, // ถ้าไม่ได้เปลี่ยนรูป ให้ใช้รูปเดิม
          };
        })
      );
    } else {
      // ---------------- สร้างข่าวใหม่ ----------------
      const newItem = {
        id: Date.now(),
        title,
        detail,
        externalLink,
        imageUrl:
          preview ||
          "https://images.pexels.com/photos/2619490/pexels-photo-2619490.jpeg",
        createdAt: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      };

      setNewsItems((prev) => [newItem, ...prev]);
    }

    resetForm();
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDetail(item.detail);
    setExternalLink(item.externalLink || "");
    setPreview(item.imageUrl || null);
    setFile(null);
    // (ในระบบจริงอาจโหลดรูปจาก server มาแก้ไข หรือบังคับให้อัปโหลดใหม่)
  };

  const handleDeleteClick = (id) => {
    const ok = window.confirm("ต้องการลบข่าวนี้หรือไม่?");
    if (!ok) return;
    setNewsItems((prev) => prev.filter((item) => item.id !== id));

    // ถ้ากำลังแก้ไขข่าวที่โดนลบอยู่ ให้เคลียร์ฟอร์ม
    if (editingId === id) {
      resetForm();
    }
  };

  // ---------------- ฟิลเตอร์ค้นหาข่าว ----------------
  const filteredNews = useMemo(() => {
    return newsItems.filter((item) => {
      const matchTitle = searchTitle
        ? item.title.toLowerCase().includes(searchTitle.toLowerCase())
        : true;
      const matchDate = searchDate ? item.createdAt === searchDate : true;
      return matchTitle && matchDate;
    });
  }, [newsItems, searchTitle, searchDate]);

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 space-y-8">
      {/* กล่องสร้าง/แก้ไขข่าว */}
      <div className="p-6 bg-white rounded-2xl shadow">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-blue-700">
            {editingId ? "แก้ไขข่าวประชาสัมพันธ์" : "สร้างข่าวประชาสัมพันธ์"}
          </h1>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          ข่าวที่สร้างจะแสดงไปยังหน้า Home (ส่วนข่าว/ประชาสัมพันธ์)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ภาพข่าว */}
          <div>
            <label className="block font-semibold mb-2">ภาพข่าว</label>

            <div className="w-full border-2 border-dashed border-blue-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/50">
              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className="w-fit h-72 object-cover rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center text-blue-400">
                  <ImagePlus className="w-12 h-12 mb-2" />
                  <p>คลิกปุ่มด้านล่างเพื่ออัปโหลดรูปภาพข่าว</p>
                </div>
              )}

              <input
                type="file"
                className="hidden"
                id="upload-image"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <label
              htmlFor="upload-image"
              className="inline-flex mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 items-center text-sm font-semibold"
            >
              <Upload className="w-4 h-4 mr-2" />{" "}
              {preview || file ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
            </label>
          </div>

          {/* หัวข้อข่าว */}
          <div>
            <label className="block font-semibold mb-2">หัวข้อข่าว</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น การประกวดสวนสนามครั้งที่ 3"
              className="w-full px-4 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {/* รายละเอียด */}
          <div>
            <label className="block font-semibold mb-2">รายละเอียด</label>
            <textarea
              rows={4}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="เขียนรายละเอียดข่าวที่ต้องการประชาสัมพันธ์..."
              className="w-full px-4 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none"
            ></textarea>
          </div>

          {/* ลิงก์ภายนอก */}
          <div>
            <label className="block font-semibold mb-2">
              ลิงก์ภายนอก (ถ้ามี)
            </label>
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-500" />
              <input
                type="text"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="ใส่ URL เช่น https://example.com"
                className="w-full px-4 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              * ถ้าใส่ไว้ ระบบจะให้ผู้อ่านคลิกเพื่อดูข้อมูลเพิ่มเติม
            </p>
          </div>

          {/* ปุ่มบันทึก */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-5 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 text-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingId ? "บันทึกการแก้ไข" : "บันทึกข่าว"}
            </button>
          </div>
        </form>
      </div>

      {/* ส่วนค้นหา + แสดงข่าวที่เคยสร้าง */}
      <div className="p-6 bg-white rounded-2xl shadow">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-blue-700">
              ข่าวที่เคยสร้างไว้แล้ว
            </h2>
          </div>

          {/* ฟิลเตอร์ค้นหา */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="ค้นหาจากหัวข้อข่าว"
                className="text-sm outline-none"
              />
            </div>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {filteredNews.length === 0 ? (
          <p className="text-gray-500 text-sm">
            ไม่พบข่าวตามเงื่อนไขที่ค้นหา
          </p>
        ) : (
          <div className="space-y-4">
            {filteredNews.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 border border-blue-50 rounded-2xl p-3 hover:bg-blue-50/40 transition"
              >
                <div className="w-32 h-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-800 line-clamp-1">
                      {item.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {item.createdAt}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {item.detail}
                  </p>

                  {item.externalLink && (
                    <a
                      href={item.externalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
                    >
                      <LinkIcon className="w-3 h-3" />
                      ลิงก์เพิ่มเติม
                    </a>
                  )}

                  <div className="mt-2 flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleEditClick(item)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="w-3 h-3" />
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
