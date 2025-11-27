const milestones = [
    {
        year: "พ.ศ. 2449",
        title: "ก่อตั้งศูนย์ฝึกทหารเรือใหม่",
        description: `
ในรัชกาลที่ 5 กองทัพเรือเริ่มพัฒนาระบบการศึกษาทหารเรืออย่างเป็นรูปธรรม 
พร้อมจัดตั้ง “กองโรงเรียนพลทหารเรือ” ตามจังหวัดชายทะเลรวม 7 แห่ง 
เพื่อใช้เป็นหน่วยฝึกทหารใหม่ (พลทหารเรือ) เบื้องต้น 
ก่อนส่งเข้าประจำเรือหรือกรมกองต่าง ๆ ถือเป็นรากฐานแรกของการฝึกทหารใหม่ของกองทัพเรือไทย`
    },
    {
        year: "พ.ศ. 2501",
        title: "รวมศูนย์เป็นโรงเรียนพลทหารเรือ",
        description: `
กองโรงเรียนพลทหารเรือทั้ง 7 แห่งถูกรวมศูนย์ให้เป็น “โรงเรียนพลทหารเรือ” หน่วยเดียว 
อยู่ภายใต้การกำกับของกรมยุทธศึกษาทหารเรือ 
เพื่อมาตรฐานและความเป็นหนึ่งเดียวของการฝึกพลทหารเรือทั่วประเทศ`
    },
    {
        year: "พ.ศ. 2531",
        title: "สถาปนาเป็นศูนย์ฝึกทหารใหม่ (ศฝท.ยศ.ทร.)",
        description: `
โรงเรียนพลทหารเรือได้รับการปรับโครงสร้างและเปลี่ยนชื่อเป็น 
“ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ” เมื่อวันที่ 7 มิถุนายน 2531 
กลายเป็นหน่วยฝึกหลักของทหารกองประจำการของกองทัพเรือไทยจนถึงปัจจุบัน`
    }
];

const values = [
  {
    title: "Seamanship (ความเป็นชาวเรือ)",
    body: "ยึดถือความสามัคคี การทำงานเป็นทีม รู้หน้าที่ กล้าหาญ อดทน มีน้ำใจ และรักษาขนบธรรมเนียมประเพณีทหารเรืออันดีงาม"
  },
  {
    title: "Allegiance (ความซื่อสัตย์และความจงรักภักดี)",
    body: "จงรักภักดีต่อสถาบันพระมหากษัตริย์ พิทักษ์ผลประโยชน์ของชาติ และมีความซื่อสัตย์ทั้งต่อหน้าที่และต่อตนเอง"
  },
  {
    title: "Integrity and Gentleman (ความมีคุณธรรม จริยธรรม และความเป็นสุภาพบุรุษทหารเรือ)",
    body: "ประพฤติด้วยคุณธรรม ความซื่อสัตย์สุจริต ความรับผิดชอบ และมีจริยธรรมในการปฏิบัติตนในทุกสถานการณ์"
  },
  {
    title: "Leadership (ความเป็นผู้นำ)",
    body: "เป็นผู้นำที่ดีในทุกระดับชั้น เป็นแบบอย่างที่เหมาะสม และสามารถนำพาผู้ใต้บังคับบัญชาให้บรรลุภารกิจได้สำเร็จ"
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

            <section className="grid lg:grid-cols-2 gap-6">
                {values.map((item) => (
                    <div key={item.title} className="bg-white rounded-2xl shadow p-6 border border-blue-50">
                        <p className="text-sm text-blue-500 font-semibold tracking-widest">ค่านิยม</p>
                        <h4 className="text-xl font-semibold text-blue-900 mt-2">{item.title}</h4>
                        <p className="text-gray-600 mt-3 leading-relaxed">{item.body}</p>
                    </div>
                ))}
            </section>

            {/* <section className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl text-white p-6 sm:p-8 shadow-lg">
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
            </section> */}
        </div>
    );
}

const Highlight = ({ label, value }) => (
    <div className="bg-white/10 rounded-2xl p-4">
        <p className="text-sm text-white/70">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
);
