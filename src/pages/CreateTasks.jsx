import React, { useMemo, useState } from "react";
import { Clock3, ListChecks, Send, UserRound, FileText, TimerReset } from "lucide-react";

const ASSIGNEE_OPTIONS = [
  { id: "u1", name: "จ.ส.อ. ธนกฤต รัตนกุล", role: "ครูฝึกอาวุโส", workload: "งาน 3 ชิ้น" },
  { id: "u2", name: "พ.จ.อ. พร้องพง พงศ์พิชิต", role: "ผู้ช่วยครูฝึก", workload: "งาน 1 ชิ้น" },
  { id: "u3", name: "จ.อ. กานต์ธีร์ อินทร์อ่อน", role: "ดูแลงานเอกสาร", workload: "งาน 2 ชิ้น" },
  { id: "u4", name: "พ.จ.ต. นัฐวุฒิ สุนทรา", role: "ผู้ประสานงาน", workload: "งาน 0 ชิ้น" },
];

const QUICK_DURATIONS = [
  { label: "1 วัน (ด่วน)", value: 1 },
  { label: "3 วัน", value: 3 },
  { label: "7 วัน", value: 7 },
  { label: "14 วัน", value: 14 },
];

const INITIAL_TASKS = [
  { id: "t1", title: "สรุปแผนฝึกไตรมาส", owner: "จ.ส.อ. ธนกฤต", dueInDays: 2, priority: "สูง" },
  { id: "t2", title: "จัดเตรียมแบบฟอร์มรายงานผล", owner: "พ.จ.อ. ปรัชญา", dueInDays: 5, priority: "กลาง" },
  { id: "t3", title: "ตรวจสอบอุปกรณ์ก่อนฝึก", owner: "จ.อ. กานต์ธีร์", dueInDays: 1, priority: "สูง" },
];

export default function CreateTasks() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: ASSIGNEE_OPTIONS[0].id,
    duration: 3,
    startDate: new Date().toISOString().slice(0, 10),
    priority: "medium",
  });
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const selectedAssignee = useMemo(
    () => ASSIGNEE_OPTIONS.find((option) => option.id === form.assignee),
    [form.assignee],
  );

  const dueDate = useMemo(() => {
    if (!form.startDate || !form.duration) return null;
    const parsed = new Date(form.startDate);
    if (Number.isNaN(parsed.getTime())) return null;
    const result = new Date(parsed);
    result.setDate(result.getDate() + Number(form.duration));
    return result;
  }, [form.startDate, form.duration]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDurationChange = (value) => {
    setForm((prev) => ({ ...prev, duration: value }));
  };

  const handlePriorityChange = (value) => {
    setForm((prev) => ({ ...prev, priority: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const newTask = {
      id: crypto.randomUUID(),
      title: form.title || "งานใหม่",
      owner: selectedAssignee?.name || "ไม่ระบุ",
      dueInDays: Number(form.duration),
      priority: form.priority === "high" ? "สูง" : form.priority === "low" ? "ต่ำ" : "กลาง",
    };
    setTasks((prev) => [newTask, ...prev].slice(0, 6));
    setForm((prev) => ({ ...prev, title: "", description: "" }));
  };

  const priorityBadge = (priority) => {
    if (priority === "high") return "bg-red-50 text-red-700 border-red-200";
    if (priority === "low") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Task Dispatch</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold">ออกแบบงานและส่งมอบให้ทีม</h1>
              <p className="text-blue-100">
                ระบุชื่องาน รายละเอียด และระยะเวลาที่ต้องทำ เพื่อให้ผู้รับมอบงานเห็นความคาดหวังชัดเจน
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <ListChecks size={18} />
                <span className="text-sm font-semibold">สร้างงานใหม่</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <Clock3 size={18} />
                <span className="text-sm font-semibold">กำหนดส่งเร็ว</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.7fr,1fr] gap-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur border border-gray-100 shadow rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-gray-500 tracking-[0.2em]">Admin Task Builder</p>
              <h2 className="text-xl font-semibold text-gray-900">สร้างงานใหม่</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TimerReset size={18} />
              <span>เริ่มตั้งแต่ {form.startDate}</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ชื่องาน</span>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="เช่น จัดทำแผนฝึกประจำสัปดาห์"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ส่งมอบให้</span>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5">
                <UserRound size={18} className="text-gray-500" />
                <select
                  name="assignee"
                  value={form.assignee}
                  onChange={handleChange}
                  className="w-full text-sm bg-transparent focus:outline-none"
                >
                  {ASSIGNEE_OPTIONS.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} • {user.role}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                ภาระงานปัจจุบัน: {selectedAssignee?.workload || "-"}
              </p>
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700">รายละเอียดงาน</span>
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-400">
                <FileText size={18} />
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="ระบุขั้นตอน เป้าหมาย และเอกสารที่ต้องแนบ"
                rows={4}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">วันที่เริ่ม</span>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ระยะเวลาที่ให้ทำงาน</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  name="duration"
                  value={form.duration}
                  onChange={(e) => handleDurationChange(Number(e.target.value) || 1)}
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <span className="text-sm text-gray-600">วัน</span>
                {dueDate && (
                  <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                    กำหนดส่ง ~ {dueDate.toLocaleDateString("th-TH")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_DURATIONS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => handleDurationChange(item.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      form.duration === item.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">ความสำคัญ</span>
              <div className="flex gap-2">
                {[
                  { value: "high", label: "สูง" },
                  { value: "medium", label: "กลาง" },
                  { value: "low", label: "ต่ำ" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handlePriorityChange(option.value)}
                    className={`px-4 py-2 rounded-xl text-sm border transition ${
                      form.priority === option.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">แนบข้อความถึงผู้รับงาน</span>
              <input
                type="text"
                name="note"
                onChange={handleChange}
                placeholder="เช่น ขออัปเดตความคืบหน้าทุก 2 วัน"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ListChecks size={18} />
              <span>สรุปส่งงานพร้อมกำหนดเวลา</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, title: "", description: "" }))}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                ล้างแบบฟอร์ม
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Send size={18} />
                ส่งงานให้ผู้รับ
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur border border-gray-100 shadow rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Preview</p>
                <h3 className="text-lg font-semibold text-gray-900">ตัวอย่างงานที่จะส่ง</h3>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${priorityBadge(form.priority)}`}>
                {form.priority === "high" ? "ความสำคัญสูง" : form.priority === "low" ? "ความสำคัญต่ำ" : "ความสำคัญกลาง"}
              </span>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 p-4 bg-gray-50/60">
              <p className="text-sm text-gray-500">ชื่องาน</p>
              <p className="text-base font-semibold text-gray-900 mt-1">{form.title || "— ยังไม่ระบุ —"}</p>
              <div className="mt-3 text-sm text-gray-600 space-y-1">
                <p>ผู้รับ: {selectedAssignee?.name || "ไม่ระบุ"}</p>
                <p>ระยะเวลา: {form.duration} วัน</p>
                <p>
                  กำหนดส่ง: {dueDate ? dueDate.toLocaleDateString("th-TH") : "ยังไม่คำนวณ"}{" "}
                  ({form.startDate || "ไม่ระบุวันเริ่ม"})
                </p>
              </div>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                {form.description || "พิมพ์รายละเอียดงาน เพื่อให้ผู้รับเข้าใจขั้นตอนและผลลัพธ์ที่คาดหวัง"}
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-gray-100 shadow rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Pipeline</p>
                <h3 className="text-lg font-semibold text-gray-900">งานที่กำลังมอบหมาย</h3>
              </div>
              <span className="text-xs text-gray-500">ล่าสุด {tasks.length} รายการ</span>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gradient-to-r from-white to-gray-50"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                    {task.owner.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {task.owner} • เหลือ {task.dueInDays} วัน
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${priorityBadge(task.priority === "สูง" ? "high" : task.priority === "ต่ำ" ? "low" : "medium")}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
