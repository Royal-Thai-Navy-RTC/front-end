import { Link } from "react-router-dom";
import { useMemo } from "react";
import history from "../assets/history.png";
import student from "../assets/student.png";
import teacher from "../assets/teacher.png";
import exam from "../assets/exam.png";
import book from "../assets/book.png";
import calendar from "../assets/calendar.png";
import teacher2 from "../assets/teacher2.png";
import profile from "../assets/profile.png";
import windowpic from "../assets/window.png";
import hand from "../assets/hand.png";
import navy_team from "../assets/navy_team.png";

const NAV_GROUPS = [
  {
    title: "ทั่วไป",
    items: [
      { path: "/library", label: "ห้องสมุด", roles: ["admin", "sub_admin", "teacher", "student", "owner", "guest"] },
      { path: "/history", label: "ประวัติ", roles: ["admin", "sub_admin", "teacher", "student", "owner", "guest"] },
      // { path: "/teaching-schedules", label: "จัดการตารางสอน", roles: ["admin", "owner", "guest"] },
      { path: "/public-teaching-schedules", label: "ตารางสอน", roles: ["admin", "sub_admin", "teacher", "student", "owner", "guest"] },
    ],
  },
  {
    title: "แอดมิน",
    items: [
      { path: "/manage", label: "จัดการผู้ใช้", roles: ["admin", "owner"] },
      { path: "/form-evaluate", label: "สร้างฟอร์มการประเมิน", roles: ["admin", "owner"] },
      { path: "/soldiers", label: "แดชบอร์ด ทหารใหม่", roles: ["admin", "owner"] },
      { path: "/soilderprofile", label: "ลงทะเบียนทหารใหม่", roles: ["admin", "owner"] },
      { path: "/soldier-intake-settings", label: "ตั้งค่ารับสมัครทหารใหม่", roles: ["admin", "owner"] },
    ],
  },
  {
    title: "นักเรียน",
    items: [
      { path: "/listteacher", label: "ประเมินผู้สอน", roles: ["admin", "owner"] },
      { path: "/listevaluation", label: "ประเมินนักเรียน", roles: ["admin", "owner", "teacher", "sub_admin"] },
    ],
  },
  {
    title: "ข้าราชการ",
    items: [
      { path: "/teacher-report", label: "แจ้งยอดนักเรียน", roles: ["admin", "owner", "teacher", "sub_admin"] },
      { path: "/teacher-leave", label: "แจ้งการลา", roles: ["teacher", "admin", "sub_admin", "owner"] },
      { path: "/evaluation-dashboard", label: "สรุปผลการประเมิน", roles: ["admin", "owner", "sub_admin", "teacher"] },
      { path: "/service-evaluation-summary", label: "สรุปผลประเมินราชการ", roles: ["admin", "owner", "sub_admin", "teacher"] },
    ],
  },
];

const pictureMap = {
  "/library": book,
  "/history": history,
  "/teaching-schedules": calendar,
  "/public-teaching-schedules": calendar,
  "/listevaluation": student,
  "/listteacher": teacher2,
  "/evaluation-dashboard": windowpic,
  "/service-evaluation-summary": windowpic,
  "/manage": profile,
  "/form-evaluate": exam,
  "/teacher-report": navy_team,
  "/teacher-leave": hand,
  "/soilderprofile": teacher,
  "/soldiers": windowpic,
  "/soldier-intake-settings": windowpic,
};

const descriptionMap = {
  "/home": "กลับสู่หน้าหลัก",
  "/library": "อ่านเอกสารและคู่มือการฝึก",
  "/history": "เรื่องราวและบทบาทของศูนย์ฝึก",
  "/teaching-schedules": "ดูและจัดการตารางสอน",
  "/public-teaching-schedules": "ตารางสอนสำหรับบุคคลทั่วไป",
  "/listevaluation": "ประเมินนักเรียน",
  "/listteacher": "ประเมินครูผู้สอน",
  "/evaluation-dashboard": "สรุปผลการประเมินทั้งหมด",
  "/service-evaluation-summary": "สรุปผลการประเมินราชการ",
  "/manage": "บริหารจัดการผู้ใช้",
  "/form-evaluate": "สร้าง/แก้ไขฟอร์มประเมินนักเรียน",
  "/teacher-report": "แจ้งยอดนักเรียนประจำวัน",
  "/teacher-leave": "แจ้งการลา",
  "/soldier-intake-settings": "เปิด/ปิดฟอร์มลงทะเบียนทหารใหม่",
};

const getRole = () => {
  if (typeof window === "undefined") return "guest";
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role) return user.role.toString().toLowerCase();
  } catch {
    // ignore parse error
  }
  const storedRole = localStorage.getItem("role");
  return storedRole ? storedRole.toString().toLowerCase() : "guest";
};

export default function Home() {
  const role = useMemo(() => getRole(), []);

  const roleFeatureSections = useMemo(() => {
    const groups = NAV_GROUPS.map((group) => {
      const items = group.items
        .filter((p) => p.roles.includes(role))
        .map((p) => ({
          title: p.label,
          path: p.path,
          description: descriptionMap[p.path] || "เข้าสู่เมนูนี้",
          picture: pictureMap[p.path] || book,
        }));
      return items.length ? { title: group.title, items } : null;
    }).filter(Boolean);

    return groups;
  }, [role]);

  const featureSections = roleFeatureSections;

  return (
    <div className="flex flex-col gap-8 w-full">
      <HeroSection />
      <section className="grid md:grid-cols-[2fr,1.2fr] gap-6">
        <div className="flex flex-col gap-6">
          {featureSections.map((section) => (
            <FeatureGroup key={section.title} {...section} />
          ))}
        </div>
        <UpdatesPanel />
      </section>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-white rounded-2xl shadow p-6 sm:p-10 flex flex-col gap-4">
      <div>
        <p className="text-sm text-blue-400 font-semibold">
          RTcas (Recruit Training Center Academic System)
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold text-blue-900 mt-2">
          ศูนย์ฝึกทหารใหม่
        </h1>
      </div>
      <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
        พื้นที่กลางของการพัฒนากำลังพล กองทัพเรือ ด้วยระบบการฝึกที่ทันสมัย
        การประเมินผลครบวงจร และข้อมูลที่ตอบโจทย์ทุกภารกิจ
      </p>
      <div className="grid sm:grid-cols-3 gap-4 text-center">
        <HeroMetric label="วิชาเรียน" value="5+" />
        <HeroMetric label="ครูฝึกประจำการ" value="70+" />
        <HeroMetric label="นักเรียนต่อปี" value="10,000+" />
      </div>
    </section>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
      <p className="text-sm text-blue-600">{label}</p>
      <p className="text-2xl font-semibold text-blue-900">{value}</p>
    </div>
  );
}

function FeatureGroup({ title, items }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-blue-400 font-semibold">
          FEATURE
        </p>
        <h2 className="text-2xl font-bold text-blue-900 mt-1">{title}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <FeatureCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ title, path, description, picture }) {
  const content = (
    <div className="h-full flex flex-col rounded-2xl border border-gray-100 shadow hover:shadow-lg transition bg-white overflow-hidden">
      <div className="flex-1 p-5 flex flex-col gap-3">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed flex-1">{description}</p>
      </div>
      <div className="flex items-center justify-center bg-gray-50 py-5 px-4 border-t border-gray-100">
        <img src={picture} alt={title} className="h-24 object-contain" />
      </div>
    </div>
  );

  if (!path) {
    return (
      <div className="opacity-70 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link to={path} className="group">
      {content}
    </Link>
  );
}

function UpdatesPanel() {
  const updates = [
    {
      title: "เปิดหลักสูตรฝึกยุทธวิธีรุ่น 15",
      detail: "เริ่มรับสมัคร 12 - 30 ม.ค. 2568",
    },
    {
      title: "ระบบประเมินครูฝึกเวอร์ชันใหม่",
      detail: "รองรับการอัปโหลดไฟล์และบันทึกผลแบบเรียลไทม์",
    },
    {
      title: "ประกาศผลสอบหลักสูตรภาคทฤษฎี",
      detail: "ตรวจสอบผลผ่านระบบสอบออนไลน์ได้แล้ววันนี้",
    },
  ];

  return (
    <aside className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4 h-min">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-blue-400 font-semibold">
          Updates
        </p>
        <h2 className="text-2xl font-bold text-blue-900 mt-1">ข่าวสารล่าสุด</h2>
      </div>
      <div className="flex flex-col gap-4">
        {updates.map((item) => (
          <div key={item.title} className="p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition">
            <p className="text-sm text-blue-500 font-semibold">{item.title}</p>
            <p className="text-sm text-gray-500 mt-1">{item.detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
