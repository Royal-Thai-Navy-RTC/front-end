import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import navy from "../assets/navy.png";
import ReactECharts from "echarts-for-react";

const performanceTrendOptions = {
  textStyle: { fontFamily: "kanit, sans-serif" },
  tooltip: { trigger: "axis" },
  grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: ["สัปดาห์ที่ 1", "สัปดาห์ที่ 2", "สัปดาห์ที่ 3", "สัปดาห์ที่ 4"],
  },
  yAxis: { type: "value", min: 0, max: 100 },
  series: [
    {
      name: "คะแนนเฉลี่ย",
      type: "line",
      data: [78, 82, 85, 88],
      smooth: true,
      areaStyle: { color: "rgba(37, 99, 235, 0.2)" },
      lineStyle: { color: "#2563eb", width: 3 },
      symbolSize: 10,
    },
  ],
};

const criteriaOptions = {
  tooltip: { trigger: "axis" },
  radar: {
    indicator: [
      { name: "การสื่อสาร", max: 100 },
      { name: "การวางแผน", max: 100 },
      { name: "วินัย", max: 100 },
      { name: "ทักษะเฉพาะ", max: 100 },
      { name: "ความรับผิดชอบ", max: 100 },
    ],
    splitArea: { areaStyle: { color: ["#f8fafc"] } },
    axisLine: { lineStyle: { color: "#cbd5f5" } },
  },
  series: [
    {
      type: "radar",
      data: [
        {
          value: [90, 80, 85, 88, 92],
          name: "ผลการประเมิน",
          areaStyle: { color: "rgba(74, 222, 128, 0.3)" },
          lineStyle: { color: "#4ade80" },
        },
      ],
    },
  ],
};

const evaluations = [
  { label: "การสื่อสาร", score: 9, comment: "ชัดเจน เข้าใจง่าย" },
  { label: "การบริหารเวลา", score: 8, comment: "ตรงเวลา มีแผนสำรอง" },
  { label: "ทักษะการสอน", score: 9, comment: "มีเทคนิคการสอนที่น่าสนใจ" },
  { label: "ความรับผิดชอบ", score: 10, comment: "เอาใจใส่ผู้เรียนอย่างดี" },
];

const files = [
  { name: "แบบประเมินครูผู้สอน.xlsx", date: "12 ม.ค. 2568" },
  { name: "บันทึกข้อเสนอแนะ.pdf", date: "10 ม.ค. 2568" },
];

export default function EvaluateTeachers() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, fallback } = location.state || {};
  const [teacher, setTeacher] = useState(fallback || null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError("ไม่พบข้อมูลผู้สอน กรุณากลับไปเลือกรายชื่ออีกครั้ง");
      return;
    }

    const fetchTeacher = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`/api/admin/users/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = response.data?.data ?? response.data;
        setTeacher(payload);
      } catch (err) {
        const message = err.response?.data?.message || "ไม่สามารถดึงข้อมูลผู้สอนได้";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();
  }, [userId]);

  const teacherProfile = useMemo(() => {
    const fullName = `${teacher?.firstName || ""} ${teacher?.lastName || ""}`.trim();
    return {
      name: fullName || teacher?.username || "-",
      rank: teacher?.rank || "ไม่ระบุ",
      qualification: teacher?.qualification || "ไม่ระบุ",
      subject: teacher?.subject || teacher?.department || "ไม่ระบุ",
      experience: teacher?.experience || "-",
      cycle: teacher?.evaluationCycle || "-",
      email: teacher?.email || "-",
      phone: teacher?.phone || "-",
      photo: teacher?.profileImage || navy,
    };
  }, [teacher]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-center text-blue-600 font-semibold">
        กำลังโหลดข้อมูลครูผู้สอน...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-center space-y-4">
        <p className="text-red-500 font-semibold">{error}</p>
        <button
          onClick={() => navigate("/listteacher")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          กลับไปยังรายชื่อครูผู้สอน
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full gap-6">
      <section className="bg-white rounded-2xl shadow-xl p-6 flex flex-col lg:flex-row gap-6">
        <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 w-full lg:w-1/3">
          <img src={teacherProfile.photo} alt="Teacher" className="max-w-[220px] w-full object-contain rounded-2xl" />
        </div>
        <div className="flex flex-col gap-4 w-full">
          <header className="flex flex-wrap gap-4 justify-between">
            <div>
              <p className="text-sm text-gray-500">ชื่อ-สกุล</p>
              <p className="text-2xl font-bold text-gray-900">{teacherProfile.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">ตำแหน่ง</p>
              <p className="text-xl font-semibold text-blue-700">{teacherProfile.rank}</p>
            </div>
          </header>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-600">
            <InfoPair label="วิทยฐานะ" value={teacherProfile.qualification} />
            <InfoPair label="วิชาที่รับผิดชอบ" value={teacherProfile.subject} />
            <InfoPair label="ประสบการณ์" value={teacherProfile.experience} />
            <InfoPair label="รอบประเมิน" value={teacherProfile.cycle} />
            <InfoPair label="อีเมล" value={teacherProfile.email} />
            <InfoPair label="เบอร์ติดต่อ" value={teacherProfile.phone} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="px-5 py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition">
              ส่งไฟล์ประเมิน
            </button>
            <button className="px-5 py-3 rounded-xl border border-blue-900 text-blue-900 font-semibold hover:bg-blue-50 transition">
              ดาวน์โหลดแบบฟอร์มล่าสุด
            </button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        <MetricCard label="คะแนนรวม" value="89" trend="+4.3%" color="from-blue-500 to-blue-700" />
        <MetricCard label="ความพึงพอใจผู้เรียน" value="92%" trend="+2.1%" color="from-emerald-500 to-emerald-600" />
        <MetricCard label="ความพร้อมด้านเอกสาร" value="95%" trend="100% ส่งตรงเวลา" color="from-violet-500 to-violet-600" />
        <MetricCard label="ชั่วโมงสอน" value="128 ชม." trend="เพิ่มขึ้น 16%" color="from-amber-500 to-orange-500" />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="แนวโน้มคะแนนรายสัปดาห์" subtitle="ข้อมูลล่าสุด: 12 ม.ค. 2568">
          <ReactECharts option={performanceTrendOptions} style={{ width: "100%", height: "100%" }} />
        </ChartCard>
        <ChartCard title="เกณฑ์การประเมิน" subtitle="คะแนนเต็ม 100">
          <ReactECharts option={criteriaOptions} style={{ width: "100%", height: "100%" }} />
        </ChartCard>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xl font-semibold">สรุปการประเมินจุดเด่น</p>
            <span className="text-sm text-gray-500">โดยคณะกรรมการ</span>
          </div>
          <div className="space-y-4">
            {evaluations.map((item) => (
              <EvaluationItem key={item.label} {...item} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold">ไฟล์ประกอบการประเมิน</p>
            <button className="text-sm text-blue-600 hover:underline">ดูทั้งหมด</button>
          </div>
          {files.map((file) => (
            <FileRow key={file.name} {...file} />
          ))}
          <UploadArea />
        </div>
      </section>
    </div>
  );
}

function InfoPair({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, trend, color }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${color}`}>
      <p className="text-sm text-white/80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 text-white/90">{trend}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xl font-semibold">{title}</p>
        <span className="text-sm text-gray-500">{subtitle}</span>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

function EvaluationItem({ label, score, comment }) {
  return (
    <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition">
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{comment}</p>
      </div>
      <span className="text-2xl font-bold text-blue-700">{score}/10</span>
    </div>
  );
}

function FileRow({ name, date }) {
  return (
    <div className="flex items-center justify-between border rounded-xl p-4 hover:shadow-sm transition">
      <div>
        <p className="font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">อัปเดต {date}</p>
      </div>
      <button className="text-blue-600 font-semibold hover:underline">ดาวน์โหลด</button>
    </div>
  );
}

function UploadArea() {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
      <p className="font-semibold text-gray-800 mb-2">อัปโหลดไฟล์เพิ่มเติม</p>
      <p className="text-sm text-gray-500 mb-3">รองรับ PDF, Excel, รูปภาพ</p>
      <label className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition">
        เลือกไฟล์
        <input type="file" className="hidden" />
      </label>
    </div>
  );
}
