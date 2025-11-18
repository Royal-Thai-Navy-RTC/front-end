import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import ReactECharts from "echarts-for-react";
import navy from "../assets/navy.png";

const capabilityMetrics = [
    { key: "discipline", label: "วินัย" },
    { key: "leadership", label: "ภาวะผู้นำ" },
    { key: "stamina", label: "ความแข็งแกร่ง" },
    { key: "knowledge", label: "ความรู้" },
    { key: "teamwork", label: "การทำงานเป็นทีม" },
];

const rankMap = {
    ADMIRAL: "พลเรือเอก",
    VICE_ADMIRAL: "พลเรือโท",
    REAR_ADMIRAL: "พลเรือตรี",
    CAPTAIN: "นาวาเอก",
    COMMANDER: "นาวาโท",
    LIEUTENANT_COMMANDER: "นาวาตรี",
    LIEUTENANT: "เรือเอก",
    SUB_LIEUTENANT: "เรือโท",
    ENSIGN: "เรือตรี",
    PETTY_OFFICER_1: "พันจ่าเอก",
    PETTY_OFFICER_2: "พันจ่าโท",
    PETTY_OFFICER_3: "พันจ่าตรี",
    PETTY_OFFICER: "จ่าเอก",
    LEADING_RATING: "จ่าโท",
    ABLE_SEAMAN: "จ่าตรี",
    SEAMAN_RECRUIT: "พลฯ",
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";
const resolveAvatarUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_BASE_URL}${path}`;
};

const capabilityFromUser = (user = {}) => {
    const isActive = user?.isActive ?? false;
    const role = (user?.role || "").toUpperCase();
    const hasRank = Boolean(user?.rank);
    const base = {
        discipline: isActive ? 90 : 60,
        leadership: role === "ADMIN" ? 85 : role === "TEACHER" ? 75 : 60,
        stamina: isActive ? 75 : 55,
        knowledge: hasRank ? 80 : 65,
        teamwork: role === "ADMIN" ? 85 : 70,
    };
    return capabilityMetrics.map(({ key }) => base[key]);
};

export default function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (!id) return;
        const fetchUser = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(`/api/admin/users/${id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const payload = response.data?.data ?? response.data;
                setUser(payload);
            } catch (err) {
                const message = err.response?.data?.message || "ไม่สามารถโหลดข้อมูลผู้ใช้ได้";
                setError(message);
                Swal.fire({
                    icon: "error",
                    title: "เกิดข้อผิดพลาด",
                    text: message,
                }).then(() => navigate("/manage"));
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id, navigate]);

    const radarValues = capabilityFromUser(user || {});

    const radarOptions = useMemo(() => ({
        tooltip: {},
        radar: {
            indicator: capabilityMetrics.map((metric) => ({ name: metric.label, max: 100 })),
            splitArea: { areaStyle: { color: ["#f8fafc"] } },
            axisLine: { lineStyle: { color: "#cbd5f5" } },
        },
        series: [
            {
                type: "radar",
                data: [
                    {
                        value: radarValues,
                        areaStyle: { color: "rgba(59,130,246,0.3)" },
                        lineStyle: { color: "#2563eb" },
                    },
                ],
            },
        ],
    }), [radarValues]);

    if (loading) {
        return <div className="bg-white rounded-2xl shadow p-6 text-center text-blue-600 font-semibold">กำลังโหลดข้อมูล...</div>;
    }

    if (error || !user) {
        return (
            <div className="bg-white rounded-2xl shadow p-6 text-center space-y-4">
                <p className="text-red-500 font-semibold">{error || "ไม่พบข้อมูลผู้ใช้"}</p>
                <button
                    onClick={() => navigate("/manage")}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                    กลับไปหน้าจัดการผู้ใช้
                </button>
            </div>
        );
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username;
    const rankLabel = rankMap[(user.rank || "").toUpperCase()] || user.rank || "-";
    const avatarSrc = resolveAvatarUrl(user.avatar) || navy;
    const birthDate = user.birthDate
        ? new Date(user.birthDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
        : "-";

    return (
        <div className="flex flex-col gap-6 w-full">
            <section className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 w-full lg:w-1/3 shadow-inner border border-blue-100">
                        <img src={avatarSrc} alt={fullName} className="w-48 h-48 object-cover rounded-3xl border-4 border-white shadow-lg" />
                    </div>
                    <div className="flex flex-col gap-6 w-full">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow">
                            <p className="text-sm uppercase tracking-[0.4em] text-white/70">User Profile</p>
                            <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
                                <div>
                                    <p className="text-3xl font-extrabold">{fullName}</p>
                                    <p className="text-sm text-white/70 mt-1">{user.username}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-white/70">ยศ</p>
                                    <p className="text-2xl font-semibold">{rankLabel}</p>
                                    <p className="text-xs text-white/60 mt-1">Role: {(user.role || "").toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
                            <h3 className="text-lg font-semibold text-gray-900">ข้อมูลติดต่อ</h3>
                            <div className="grid sm:grid-cols-2 gap-3 mt-3 text-gray-600">
                                <InfoItem label="อีเมล" value={user.email || "-"} />
                                <InfoItem label="เบอร์โทรศัพท์" value={user.phone || "-"} />
                                <InfoItem label="สถานะ" value={user.isActive ? "เปิดใช้งาน" : "ปิดการใช้งาน"} highlight={user.isActive ? "text-emerald-600" : "text-red-500"} />
                                <InfoItem label="วันเกิด" value={birthDate} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-5 text-gray-700">
                    <div className="col-span-2 grid sm:grid-cols-2 gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <SectionItem label="การศึกษา" value={user.education || "-"} />
                        <SectionItem label="ตำแหน่ง" value={user.position || "-"} />
                        <SectionItem label="ที่อยู่" value={user.fullAddress || "-"} />
                        <SectionItem label="ผู้ติดต่อฉุกเฉิน" value={`${user.emergencyContactName || "-"} (${user.emergencyContactPhone || "-"})`} />
                        <SectionItem label="ประวัติทางการแพทย์" value={user.medicalHistory || "-"} />
                    </div>
                    <div className="bg-gradient-to-b from-blue-50 to-white rounded-2xl p-5 border border-blue-100 shadow-sm flex flex-col gap-3">
                        <InfoItem label="วันที่สร้างบัญชี" value={user.createdAt ? new Date(user.createdAt).toLocaleString("th-TH") : "-"} />
                        <InfoItem label="อัปเดตล่าสุด" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString("th-TH") : "-"} />
                    </div>
                </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xl font-semibold text-gray-800">ขีดความสามารถโดยรวม</p>
                            <p className="text-sm text-gray-500">ข้อมูลจำลองเพื่อการนำเสนอ</p>
                        </div>
                    </div>
                    <div className="h-80">
                        <ReactECharts option={radarOptions} style={{ width: "100%", height: "100%" }} />
                    </div>
                </div>
                <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-4">
                    <p className="text-xl font-semibold text-gray-800">บันทึกสำคัญ</p>
                    <TimelineItem title="สร้างบัญชีผู้ใช้" date={user.createdAt} description="ถูกเพิ่มเข้าสู่ระบบจัดการผู้ใช้" />
                    <TimelineItem title="อัปเดตล่าสุด" date={user.updatedAt} description="ข้อมูลผู้ใช้ได้รับการแก้ไขล่าสุด" />
                </div>
            </section>
        </div>
    );
}

function InfoItem({ label, value, highlight = "" }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-widest text-gray-400">{label}</p>
            <p className={`text-base font-semibold text-gray-900 ${highlight}`}>{value}</p>
        </div>
    );
}

function SectionItem({ label, value }) {
    return (
        <div className="flex flex-col bg-gray-50/70 rounded-xl p-3 border border-gray-100">
            <span className="text-xs tracking-wider text-gray-500">{label}</span>
            <span className="text-lg font-semibold text-gray-900">{value}</span>
        </div>
    );
}

function TimelineItem({ title, date, description }) {
    return (
        <div className="border border-gray-100 rounded-2xl p-4 hover:border-blue-200 transition">
            <p className="text-sm text-blue-500 font-semibold">{title}</p>
            <p className="text-xs text-gray-400">{date ? new Date(date).toLocaleString("th-TH") : "-"}</p>
            <p className="text-sm text-gray-600 mt-2">{description}</p>
        </div>
    );
}
