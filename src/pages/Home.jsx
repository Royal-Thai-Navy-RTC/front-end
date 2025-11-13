import { Link } from "react-router-dom";
import history from "../assets/history.png";
import student from "../assets/student.png";
import teacher from "../assets/teacher.png";
import exam from "../assets/exam.png";
import book from "../assets/book.png";

const featureSections = [
  {
    title: "ข้อมูลสำคัญ",
    items: [
      {
        title: "ประวัติความเป็นมา",
        path: "/history",
        description: "เรื่องราว จุดเริ่มต้น และบทบาทของศูนย์ฝึกทหารใหม่",
        picture: history,
      },
      {
        title: "โครงสร้างหลักสูตร",
        path: "",
        description: "ภาพรวมหลักสูตร การจัดการฝึก และหน่วยงานที่เกี่ยวข้อง",
        picture: book,
      },
    ],
  },
  {
    title: "ระบบสนับสนุนการฝึก",
    items: [
      {
        title: "ประเมินนักเรียน",
        path: "",
        description: "ติดตามความก้าวหน้าและประสิทธิภาพของนักเรียนในแต่ละหลักสูตร",
        picture: student,
      },
      {
        title: "ประเมินครูฝึก",
        path: "/evaluateteachers",
        description: "แบบประเมินครูฝึกเพื่อยกระดับคุณภาพบุคลากร",
        picture: teacher,
      },
      {
        title: "สอบออนไลน์",
        path: "",
        description: "พื้นที่สอบและทดสอบศักยภาพผ่านระบบออนไลน์",
        picture: exam,
      },
    ],
  },
];

export default function Home() {
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
        <p className="text-sm uppercase tracking-[0.45em] text-blue-500 font-semibold">
          NAVAL TRAINING CENTER
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
        <HeroMetric label="หลักสูตรที่เปิดสอน" value="15+" />
        <HeroMetric label="ครูฝึกประจำการ" value="450+" />
        <HeroMetric label="นักเรียนต่อปี" value="3,000+" />
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
