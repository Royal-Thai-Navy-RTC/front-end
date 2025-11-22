import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import ReactECharts from "echarts-for-react";
import navy from "../assets/navy.png";

const capabilityMetrics = [
  { key: "completeness", label: "ความครบถ้วนโปรไฟล์" },
  { key: "contact", label: "ความพร้อมการติดต่อ" },
  { key: "health", label: "ข้อมูลสุขภาพ" },
  { key: "tenure", label: "อายุบัญชี" },
  { key: "status", label: "สถานะใช้งาน" },
];

const LEAVE_TYPES = [
  { value: "PERSONAL", label: "ลากิจ" },
  { value: "SICK", label: "ลาป่วย" },
  { value: "ANNUAL", label: "ลาพักผ่อน" },
  { value: "OTHER", label: "อื่นๆ" },
  { value: "OFFICIAL_DUTY", label: "ลาไปราชการ" },
];

const APPROVAL_STATUS_META = {
  PENDING: { label: "รอดำเนินการ", color: "text-amber-600", dot: "bg-amber-400" },
  APPROVED: { label: "อนุมัติแล้ว", color: "text-emerald-600", dot: "bg-emerald-500" },
  REJECTED: { label: "ไม่อนุมัติ", color: "text-rose-600", dot: "bg-rose-500" },
};

const APPROVAL_UNKNOWN = { label: "ยังไม่มีข้อมูล", color: "text-slate-500", dot: "bg-slate-300" };

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

const formatValue = (val) => {
  if (Array.isArray(val)) return val.length ? val.join(", ") : "-";
  return val && val !== "-" ? val : val === 0 ? "0" : "-";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
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

  const currentUser = user || {};
  const fullName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username || "-";
  const rankLabel = rankMap[(currentUser.rank || "").toUpperCase()] || currentUser.rank || "-";
  const avatarSrc = resolveAvatarUrl(currentUser.avatar) || navy;
  const birthDate = currentUser.birthDate
    ? new Date(currentUser.birthDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
    : "-";

  const profileFields = [
    { label: "การศึกษา", value: formatValue(currentUser.education) },
    { label: "ตำแหน่ง", value: formatValue(currentUser.position) },
    { label: "สังกัด / หมวดวิชา", value: formatValue(currentUser.division) },
    { label: "ศาสนา", value: formatValue(currentUser.religion) },
    { label: "ทักษะพิเศษ", value: formatValue(currentUser.specialSkills) },
    { label: "อาชีพเสริม", value: formatValue(currentUser.secondaryOccupation) },
    { label: "ที่อยู่", value: formatValue(currentUser.fullAddress) },
  ];

  const healthFields = [
    { label: "ประวัติทางการแพทย์", value: formatValue(currentUser.medicalHistory) },
    { label: "โรคประจำตัว", value: formatValue(currentUser.chronicDiseases) },
    { label: "แพ้ยา", value: formatValue(currentUser.drugAllergies) },
    { label: "แพ้อาหาร", value: formatValue(currentUser.foodAllergies) },
    { label: "ผู้ติดต่อฉุกเฉิน", value: `${formatValue(currentUser.emergencyContactName)} (${formatValue(currentUser.emergencyContactPhone)})` },
  ];

  const radarValues = useMemo(() => {
    const allFields = [...profileFields, ...healthFields];
    const filledCount = allFields.filter((f) => f.value && f.value !== "-" && f.value.toString().trim() !== "").length;
    const total = allFields.length || 1;
    const completeness = Math.round((filledCount / total) * 100);

    const contactScore = (currentUser.email ? 50 : 0) + (currentUser.phone ? 50 : 0);
    const hasHealthInfo = healthFields.some((f) => f.value && f.value !== "-" && f.value.toString().trim() !== "");
    const healthScore = hasHealthInfo ? 85 : 40;

    let tenureScore = 0;
    if (currentUser.createdAt) {
      const days = (Date.now() - new Date(currentUser.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      tenureScore = Math.max(0, Math.min(100, Math.round((days / 365) * 100)));
    }

    const statusScore = currentUser.isActive ? 100 : 30;

    return [completeness, contactScore, healthScore, tenureScore, statusScore];
  }, [currentUser.createdAt, currentUser.isActive, currentUser.email, currentUser.phone, healthFields, profileFields]);

  const radarOptions = useMemo(
    () => ({
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
    }),
    [radarValues]
  );

  const teacherReceivedStats = currentUser.studentEvaluationStats || {};
  const studentGivenStats = currentUser.teacherEvaluationStats || {};
  const lastTeacherSheet = (currentUser.studentEvaluationStats || {}).lastSheet || {};
  const leaveStats = currentUser.leaveStats || {};
  const lastLeave = leaveStats.lastLeave || {};
  const leaveTypeLabel = LEAVE_TYPES.find((t) => t.value === lastLeave?.leaveType)?.label || formatValue(lastLeave?.leaveType);
  const leaveStatusMeta = APPROVAL_STATUS_META[lastLeave?.status] || null;
  const adminApprovalMeta = APPROVAL_STATUS_META[lastLeave?.adminApprovalStatus] || APPROVAL_UNKNOWN;
  const ownerApprovalMeta = APPROVAL_STATUS_META[lastLeave?.ownerApprovalStatus] || APPROVAL_UNKNOWN;
  const showAdminApproval = lastLeave?.leaveType !== "OFFICIAL_DUTY" && !lastLeave?.isOfficialDuty;

  const summaryChartOptions = useMemo(
    () => ({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: "3%", right: "4%", bottom: "8%", top: "10%", containLabel: true },
      xAxis: { type: "value", min: 0, max: 5, axisLabel: { color: "#475569" } },
      yAxis: {
        type: "category",
        data: ["นักเรียนให้คะแนนครู", "ครูประเมินนักเรียน"],
        axisLabel: { color: "#475569" },
      },
      series: [
        {
          type: "bar",
          data: [
            Math.max(0, Math.min(5, teacherReceivedStats.averageRating || 0)),
            Math.max(0, Math.min(5, studentGivenStats.averageOverallScore || 0)),
          ],
          barWidth: 22,
          itemStyle: {
            borderRadius: [6, 6, 6, 6],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#2563eb" },
                { offset: 1, color: "#22d3ee" },
              ],
            },
          },
          label: { show: true, position: "right", color: "#0f172a" },
        },
      ],
    }),
    [studentGivenStats.averageOverallScore, teacherReceivedStats.averageRating]
  );

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-6 text-center text-blue-600 font-semibold">กำลังโหลดข้อมูล...</div>;
  }

  if (error || !user) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-center space-y-4">
        <p className="text-red-500 font-semibold">{error || "ไม่พบข้อมูลผู้ใช้"}</p>
        <button onClick={() => navigate("/manage")} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">
          กลับไปหน้าจัดการผู้ใช้
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <section className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl border border-blue-50 p-6 md:p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <div className="bg-white/95 text-slate-900 rounded-3xl p-6 shadow-xl border border-blue-50 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src={avatarSrc} alt={fullName} className="w-20 h-20 object-cover rounded-2xl border-2 border-white shadow-lg" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Profile</p>
                  <p className="text-2xl font-extrabold text-slate-900">{fullName}</p>
                  <p className="text-sm text-slate-600 mt-1">{user.username}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge text="บัญชีสร้าง" value={formatDateTime(user.createdAt)} />
                <Badge text="อัปเดตล่าสุด" value={formatDateTime(user.updatedAt)} />
                <span className={`text-xs px-2.5 py-1 rounded-full border ${user.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {user.isActive ? "เปิดใช้งาน" : "ปิดการใช้งาน"}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-3">
              <InfoItem label="ยศ" value={rankLabel} />
              <InfoItem label="Role" value={(user.role || "-").toString().toUpperCase()} />
              <InfoItem label="อีเมล" value={user.email || "-"} />
              <InfoItem label="เบอร์โทรศัพท์" value={user.phone || "-"} />
              <InfoItem label="วันเกิด" value={birthDate} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-slate-900">ข้อมูลกำลังพล</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {profileFields.map((field) => (
                    <SectionItem key={field.label} label={field.label} value={field.value} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="text-lg font-semibold text-slate-900">ข้อมูลสุขภาพ / การแพ้</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {healthFields.map((field) => (
                    <SectionItem key={field.label} label={field.label} value={field.value} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white/95 border border-blue-50 rounded-3xl shadow-xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-slate-900">ขีดความสามารถเชิงปฏิบัติ</p>
              <p className="text-sm text-slate-500">คำนวณจากความครบถ้วนข้อมูล การติดต่อ สุขภาพ อายุบัญชี และสถานะ</p>
            </div>
            <Badge text="ช่วง 0-100" value="ยิ่งสูงยิ่งดี" />
          </div>
          <div className="h-80">
            <ReactECharts option={radarOptions} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/95 border border-blue-50 rounded-3xl shadow-xl p-6 flex flex-col gap-3">
            <p className="text-xl font-semibold text-slate-900">นักเรียนประเมินครู</p>
            <p className="text-sm text-slate-600">คะแนนที่ครูคนนี้ได้รับจากนักเรียน</p>
            <InfoRow label="จำนวนใบประเมิน" value={formatValue(teacherReceivedStats.totalSheets)} />
            <InfoRow label="คะแนนเฉลี่ย" value={formatValue(teacherReceivedStats.averageRating)} />
            <InfoRow label="จำนวนการให้คะแนน" value={formatValue(teacherReceivedStats.totalRatings)} />
            <InfoRow label="ประเมินล่าสุด" value={formatDateTime(teacherReceivedStats.lastEvaluatedAt)} />
            <InfoRow label="สรุป" value={teacherReceivedStats.averageRating >= 4 ? "คะแนนดี" : "ยังไม่มีข้อมูล / ต้องปรับปรุง"} />
            {lastTeacherSheet?.subject && (
              <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <p className="text-sm font-semibold text-slate-900">ใบประเมินล่าสุดจากนักเรียน</p>
                <p className="text-xs text-slate-600">วิชา: {lastTeacherSheet.subject}</p>
                <p className="text-xs text-slate-600">วันที่: {formatDateTime(lastTeacherSheet.evaluatedAt)}</p>
                <p className="text-xs text-slate-600">ครู: {formatValue(lastTeacherSheet.teacherName)}</p>
              </div>
            )}
          </div>

          <div className="bg-white/95 border border-blue-50 rounded-3xl shadow-xl p-6 flex flex-col gap-3">
            <p className="text-xl font-semibold text-slate-900">ครูประเมินนักเรียน</p>
            <p className="text-sm text-slate-600">สถิติแบบประเมินที่ครูรายนี้ส่งให้ผู้เรียน</p>
            <InfoRow label="จำนวนแบบประเมิน" value={formatValue(studentGivenStats.total)} />
            <InfoRow label="คะแนนเฉลี่ย" value={formatValue(studentGivenStats.averageOverallScore)} />
            <InfoRow label="ประเมินล่าสุด" value={formatDateTime(studentGivenStats.lastSubmittedAt)} />
            <InfoRow label="สรุป" value={studentGivenStats.averageOverallScore >= 4 ? "คะแนนดี" : "ยังไม่มีข้อมูล / ต้องปรับปรุง"} />
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white/95 border border-blue-50 rounded-3xl shadow-xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-slate-900">กราฟสรุปคะแนน</p>
              <p className="text-sm text-slate-600">เทียบคะแนนเฉลี่ยจากนักเรียนและคะแนนที่ครูให้ผู้เรียน (0-5)</p>
            </div>
          </div>
          <div className="h-60">
            <ReactECharts option={summaryChartOptions} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>

        <div className="bg-white/95 border border-blue-50 rounded-3xl shadow-xl p-6 flex flex-col gap-3">
          <p className="text-xl font-semibold text-slate-900">สรุปการลา</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow label="จำนวนคำขอลา" value={formatValue(leaveStats.total)} />
            <InfoRow label="รอดำเนินการ" value={formatValue(leaveStats.byStatus?.PENDING)} />
            <InfoRow label="ล่าสุด" value={formatDateTime(lastLeave.startDate)} />
            <InfoRow
              label="สรุป"
              value={leaveStats.total ? `มีการลาทั้งหมด ${leaveStats.total} ครั้ง` : "ยังไม่พบการลา"}
              highlight={leaveStats.total ? "" : "text-slate-500"}
            />
          </div>
          {lastLeave?.leaveType && (
            <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-sm font-semibold text-slate-900">ใบลาล่าสุด</p>
              <p className="text-xs text-slate-600">ประเภท: {leaveTypeLabel}</p>
              <p className="text-xs text-slate-600">สาเหตุ: {formatValue(lastLeave.destination || lastLeave.reason)}</p>
              <p className="text-xs text-slate-600">
                ช่วงเวลา: {formatDateTime(lastLeave.startDate)} - {formatDateTime(lastLeave.endDate)}
              </p>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                สถานะ:
                {leaveStatusMeta ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${leaveStatusMeta.color}`}>
                    <span className={`w-2 h-2 rounded-full ${leaveStatusMeta.dot}`} />
                    {leaveStatusMeta.label}
                  </span>
                ) : (
                  formatValue(lastLeave.status)
                )}
              </p>
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {showAdminApproval && <ApprovalStep label="ผู้ดูแล (Admin)" meta={adminApprovalMeta} />}
                <ApprovalStep label="ผู้บังคับบัญชา (Owner)" meta={ownerApprovalMeta} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value, highlight = "", white = false }) {
  return (
    <div>
      <p className={`text-[11px] uppercase tracking-widest text-gray-400`}>{label}</p>
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

function InfoRow({ label, value, highlight = "" }) {
  return (
    <div className="flex items-start justify-between gap-3 text-slate-700">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold text-right ${highlight}`}>{value}</span>
    </div>
  );
}

function Badge({ text, value }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 border border-blue-100">
      <span className="text-[11px] uppercase tracking-wide text-blue-600">{text}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ApprovalStep({ label, meta }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white/70 px-3 py-2">
      <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
      <div className="flex flex-col">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
      </div>
    </div>
  );
}
