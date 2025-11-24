const milestones = [
    {
        year: "พ.ศ. 2449",
        title: "ก่อตั้งศูนย์ฝึก",
        description:
        `แนวคิดริเริ่มการจัดตั้งหน่วยฝึกทหารโดยพระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว (รัชกาลที่ 5) เพื่อเตรียมกำลังพลป้องกันประเทศ
         เสด็จทรงเปิด โรงเรียนนายเรือ ณ พระราชวังเดิม(ธนบุรี) ซึ่งถือเป็นจุดเริ่มต้นสำคัญของสถาบันทหารเรือไทย 
         ในปีเดียวกัน มีการตั้ง “กองโรงเรียนพลทหารเรือ” ตามชายทะเลหลายจังหวัด เพื่อฝึกทหารใหม่ให้เรียน`
    },
    {
        year: "พ.ศ. 2518",
        title: "ขยายหลักสูตร",
        description:
            "ปรับปรุงหลักสูตรและเพิ่มการเรียนการสอนด้านเทคโนโลยีการรบทางเรือ พร้อมยกระดับเครื่องมือและสนามฝึกให้ทันสมัย"
    },
    {
        year: "พ.ศ. 2545",
        title: "ศูนย์ฝึกต้นแบบ",
        description:
            "ได้รับการยกย่องเป็นศูนย์ฝึกต้นแบบของกองทัพเรือในด้านการบ่มเพาะผู้นำรุ่นใหม่และความพร้อมรบในสถานการณ์จริง"
    },
    {
        year: "พ.ศ. 2565",
        title: "ก้าวสู่ยุคดิจิทัล",
        description:
            "บูรณาการเทคโนโลยีสมัยใหม่ อาทิ ระบบเรียนรู้ผ่านสื่อดิจิทัลและการประเมินผลแบบเรียลไทม์ เพื่อยกระดับคุณภาพการฝึก"
    }
];

const values = [
    {
        title: "ระเบียบวินัยและจิตวิญญาณทหารเรือ",
        body: "ปลูกฝังความมีวินัย ความเสียสละ และความพร้อมปฏิบัติหน้าที่เพื่อชาติ"
    },
    {
        title: "พัฒนาศักยภาพรอบด้าน",
        body: "ออกแบบหลักสูตรที่ผสานทักษะรบ วิทยาการสมัยใหม่ และการเป็นผู้นำ"
    },
    {
        title: "ยึดมั่นคุณธรรมและความเป็นมืออาชีพ",
        body: "ยกระดับมาตรฐานการฝึก และปลูกฝังจริยธรรมในวิชาชีพทหาร"
    }
];

export default function History() {
    return (
        <div className="w-full flex flex-col gap-8">
            <section className="bg-white/80 backdrop-blur rounded-2xl shadow p-6 sm:p-10 text-center -z-10">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-500 font-semibold">Heritage</p>
                <h1 className="text-3xl sm:text-5xl font-bold text-blue-900 mt-3">ประวัติความเป็นมา</h1>
                <p className="text-lg sm:text-2xl text-gray-600 mt-2">
                    ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ
                </p>
                <p className="text-base sm:text-lg text-gray-500 mt-4 leading-relaxed max-w-3xl mx-auto">
                    สถานที่ที่หล่อหลอมกำลังพลรุ่นใหม่ให้มีความพร้อมทั้งด้านร่างกาย จิตใจ และภูมิปัญญา
                    เพื่อตอบสนองภารกิจของกองทัพเรือไทยอย่างมั่นคงและยั่งยืน
                </p>
            </section>

            <section className="bg-white rounded-2xl shadow p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:gap-8">
                    <div>
                        <h2 className="text-2xl font-bold text-blue-900">เส้นทางการพัฒนา</h2>
                        <p className="text-gray-500 mt-2">
                            เหตุการณ์สำคัญที่สะท้อนความทุ่มเทของศูนย์ฝึกทหารใหม่ ตั้งแต่วันแรกจนถึงปัจจุบัน
                        </p>
                    </div>
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute left-3 sm:left-4 top-0 bottom-0 border-l-2 border-blue-200"></div>
                        <div className="flex flex-col gap-6">
                            {milestones.map((item) => (
                                <div key={item.year} className="relative bg-blue-50 rounded-2xl p-4 sm:p-6 shadow-sm">
                                    <div className="absolute -left-[19px] top-5 w-4 h-4 rounded-full border-4 border-white bg-blue-500 shadow"></div>
                                    <p className="text-sm uppercase tracking-wide text-blue-500 font-semibold">{item.year}</p>
                                    <h3 className="text-xl font-semibold text-blue-900 mt-1">{item.title}</h3>
                                    <p className="text-sm sm:text-base text-gray-600 mt-2 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid lg:grid-cols-3 gap-6">
                {values.map((item) => (
                    <div key={item.title} className="bg-white rounded-2xl shadow p-6 border border-blue-50">
                        <p className="text-sm text-blue-500 font-semibold tracking-widest">ค่านิยมหลัก</p>
                        <h4 className="text-xl font-semibold text-blue-900 mt-2">{item.title}</h4>
                        <p className="text-gray-600 mt-3 leading-relaxed">{item.body}</p>
                    </div>
                ))}
            </section>

            <section className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl text-white p-6 sm:p-8 shadow-lg">
                <h2 className="text-2xl sm:text-3xl font-bold">ภารกิจในปัจจุบัน</h2>
                <p className="mt-3 text-base sm:text-lg text-white/80 leading-relaxed">
                    ศูนย์ฝึกทหารใหม่มุ่งมั่นผสมผสานองค์ความรู้ดั้งเดิมเข้ากับเทคโนโลยีสมัยใหม่
                    เพื่อสร้างนักรบทางเรือรุ่นใหม่ที่มีศักยภาพสมบูรณ์ พร้อมเผชิญทุกภารกิจของชาติ
                </p>
                <div className="mt-5 grid sm:grid-cols-3 gap-4 text-center">
                    <Highlight label="ผู้ผ่านการฝึก" value="30,000+" />
                    <Highlight label="หัวข้อการฝึก" value="120+" />
                    <Highlight label="ครูฝึกมืออาชีพ" value="450+" />
                </div>
            </section>
        </div>
    );
}

const Highlight = ({ label, value }) => (
    <div className="bg-white/10 rounded-2xl p-4">
        <p className="text-sm text-white/70">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
);
