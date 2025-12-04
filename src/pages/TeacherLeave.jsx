import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import ReactECharts from "echarts-for-react";

const LEAVE_TYPES = [
  { value: "PERSONAL", label: "ลากิจ" },
  { value: "SICK", label: "ลาป่วย" },
  { value: "ANNUAL", label: "ลาพักผ่อน" },
  { value: "OTHER", label: "อื่นๆ" },
  { value: "OFFICIAL_DUTY", label: "ลาไปราชการ" },
];

const GENERAL_LEAVE_TYPES = LEAVE_TYPES.filter((type) => type.value !== "OFFICIAL_DUTY");

const LEAVE_PRESETS = [
  {
    value: "PERSONAL",
    title: "คำขอลาทั่วไป",
    description: "ลากิจ/ลาป่วย/ลาพักผ่อน ส่งถึงหัวหน้าหมวดของคุณ",
  },
  {
    value: "OFFICIAL_DUTY",
    title: "ลาไปราชการ",
    description: "ใช้เมื่อได้รับคำสั่งราชการ ต้องรอหัวหน้าแผนกศึกษาพิจารณา",
    highlight: true,
  },
];

const INITIAL_FORM = {
  leaveType: "PERSONAL",
  startDate: "",
  endDate: "",
  destination: "",
  reason: "",
};

const parseLeaves = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.items)) return raw.data.items;
  return [];
};

const getStoredRole = () => {
  try {
    return (localStorage.getItem("role") || "GUEST").toUpperCase();
  } catch {
    return "GUEST";
  }
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ADMIN_LEVEL_ROLES = ["ADMIN", "OWNER", "SUB_ADMIN"];

const matchesAdminLevelRole = (leave) => {
  if (!leave) return false;
  const roleCandidate =
    leave.role ??
    leave.teacherRole ??
    leave.teacher?.role ??
    leave.teacher?.userRole ??
    leave.teacher?.position ??
    leave.teacher?.title;
  if (!roleCandidate) return true; // ถ้าไม่ทราบ role ให้รวมไว้เพื่อไม่ให้ตัวเลขหายไป
  const normalized = roleCandidate.toString().trim().toUpperCase();
  return ADMIN_LEVEL_ROLES.includes(normalized);
};

const normalizeSummary = (payload) => {
  const source = payload?.data ?? payload ?? {};
  const overview = source.overview || {};
  const commander = source.commanderOverview || overview.commanderOverview || {};
  const totalTeachers = toFiniteNumber(overview.totalTeachers ?? source.totalTeachers ?? source.total) ?? 0;
  const totalLeaveRequests = toFiniteNumber(overview.totalLeaveRequests ?? source.totalLeaveRequests) ?? 0;
  const onLeave = toFiniteNumber(overview.currentOnLeave ?? source.currentOnLeave ?? source.onLeave) ?? 0;
  const availableTeachersRaw = overview.availableTeachers ?? source.availableTeachers;
  const availableTeachers =
    toFiniteNumber(availableTeachersRaw) ?? (totalTeachers - onLeave >= 0 ? totalTeachers - onLeave : 0);
  const currentLeaves = parseLeaves(source.currentLeaves);
  const recentLeaves = parseLeaves(source.recentLeaves);
  const officialDutySource = {
    ...(source.officialDuty || {}),
    ...(overview.officialDuty || {}),
  };
  if (overview.officialDutyOnLeave !== undefined) {
    officialDutySource.current = overview.officialDutyOnLeave;
  } else if (source.officialDutyOnLeave !== undefined) {
    officialDutySource.current = source.officialDutyOnLeave;
  }
  if (overview.officialDutyPending !== undefined) {
    officialDutySource.pending = overview.officialDutyPending;
  } else if (source.officialDutyPending !== undefined) {
    officialDutySource.pending = source.officialDutyPending;
  }
  if (commander.officialDutyPending !== undefined) {
    officialDutySource.pending = commander.officialDutyPending;
  }
  if (overview.officialDutyTotal !== undefined) {
    officialDutySource.total = overview.officialDutyTotal;
  } else if (source.officialDutyTotal !== undefined) {
    officialDutySource.total = source.officialDutyTotal;
  }
  if (commander.totalCommanders !== undefined) {
    officialDutySource.total = commander.totalCommanders;
  }
  if (overview.officialDutyAvailable !== undefined) {
    officialDutySource.available = overview.officialDutyAvailable;
  } else if (source.officialDutyAvailable !== undefined) {
    officialDutySource.available = source.officialDutyAvailable;
  }
  if (commander.availableCommanders !== undefined) {
    officialDutySource.available = commander.availableCommanders;
  }
  if (commander.officialDutyOnLeave !== undefined) {
    officialDutySource.current = commander.officialDutyOnLeave;
  }
  const officialDuty = {
    current:
      toFiniteNumber(
        officialDutySource.current ?? officialDutySource.currentOnLeave ?? officialDutySource.active ?? officialDutySource.onLeave
      ) ?? null,
    pending:
      toFiniteNumber(officialDutySource.pending ?? officialDutySource.pendingApproval ?? officialDutySource.waiting) ?? null,
    approved: toFiniteNumber(officialDutySource.approved) ?? null,
    rejected: toFiniteNumber(officialDutySource.rejected ?? officialDutySource.denied) ?? null,
    total:
      toFiniteNumber(
        officialDutySource.total ??
        officialDutySource.all ??
        officialDutySource.count ??
        officialDutySource.overall ??
        officialDutySource.totalTeachers
      ) ?? null,
    available:
      toFiniteNumber(
        officialDutySource.available ?? officialDutySource.ready ?? officialDutySource.readyToSupport ?? officialDutySource.supporting
      ) ?? null,
  };
  return {
    totalTeachers,
    totalLeaveRequests,
    onLeave,
    availableTeachers,
    currentLeaves,
    recentLeaves,
    officialDuty,
  };
};

const formatDateRange = (start, end) => {
  if (!start) return "-";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "-";
  const startText = startDate.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  if (!end) return startText;
  const endDate = new Date(end);
  const endText = endDate.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  return `${startText} - ${endText}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
};

const toInputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad2 = (num) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getLeaveTypeLabel = (value) => LEAVE_TYPES.find((type) => type.value === value)?.label || value || "-";

const getStatusLabel = (status) => {
  if (!status) return "รออนุมัติ";
  switch ((status || "").toUpperCase()) {
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ไม่อนุมัติ";
    case "ACTIVE":
      return "กำลังลา";
    case "CANCEL":
      return "ยกเลิกแล้ว";
    default:
      return status;
  }
};

const getTeacherDisplayName = (leave) => {
  if (!leave) return "ไม่ระบุชื่อ";
  if (leave.teacherName) return leave.teacherName;
  if (leave.teacher?.fullName) return leave.teacher.fullName;
  const composed = `${leave.teacher?.firstName || ""} ${leave.teacher?.lastName || ""}`.trim();
  if (composed) return composed;
  return leave.teacher?.username || leave.teacherUsername || "ไม่ระบุชื่อ";
};

const getTeacherKey = (leave) => {
  if (!leave) return null;
  return (
    leave.teacherId ??
    leave.teacher?.id ??
    leave.teacher?.userId ??
    leave.teacherUsername ??
    leave.teacher?.username ??
    leave.teacher?.fullName ??
    leave.ownerId ??
    leave.id ??
    null
  );
};

const isOfficialDutyLeave = (leaveType) => {
  if (!leaveType) return false;
  return leaveType.toString().trim().toUpperCase() === "OFFICIAL_DUTY";
};

const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isLeaveOngoing = (leave, referenceDate = new Date()) => {
  if (!leave) return false;
  const now = referenceDate.getTime();
  const start = parseDateValue(leave.startDate);
  const end = parseDateValue(leave.endDate);
  if (!start) return false;
  if (start.getTime() > now) return false;
  if (end && end.getTime() < now) return false;
  return true;
};

const APPROVAL_STATUS_META = {
  PENDING: { label: "รอดำเนินการ", color: "text-amber-600", dot: "bg-amber-400" },
  APPROVED: { label: "อนุมัติแล้ว", color: "text-emerald-600", dot: "bg-emerald-500" },
  REJECTED: { label: "ไม่อนุมัติ", color: "text-rose-600", dot: "bg-rose-500" },
  CANCEL: { label: "ยกเลิกแล้ว", color: "text-rose-700", dot: "bg-rose-500" },
};

const mapApprovalStatus = (value, fallback = "PENDING") => {
  if (!value) return fallback;
  const normalized = value.toString().trim().toUpperCase();
  if (normalized === "ACTIVE") return "APPROVED";
  if (normalized === "CANCEL") return "CANCEL";
  if (normalized === "IN_PROGRESS") return "PENDING";
  if (["PENDING", "APPROVED", "REJECTED"].includes(normalized)) return normalized;
  return fallback;
};

const countUniqueTeachers = (leaves = []) => {
  const unique = new Set();
  leaves.forEach((leave) => {
    const key = getTeacherKey(leave);
    if (key !== null && key !== undefined) {
      unique.add(key);
    }
  });
  return unique.size;
};

const getApproverDisplayName = (approver) => {
  if (!approver) return "";
  if (approver.fullName) return approver.fullName;
  const rank = approver.rank ? `${approver.rank} ` : "";
  const composed = `${rank}${(approver.firstName || "")} ${(approver.lastName || "")}`.trim();
  if (composed) return composed;
  return approver.username || approver.name || "";
};

// Serialize datetime-local value to UTC ISO string to avoid server-side timezone shifting.
const toUtcIsoString = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function TeacherLeave() {
  const [role, setRole] = useState(() => getStoredRole());
  const isSubAdmin = role === "SUB_ADMIN";
  const isOwner = role === "OWNER";
  const isAdmin = role === "ADMIN" || isOwner || isSubAdmin;
  const [adminView, setAdminView] = useState(() => isAdmin);
  const isAdminDashboard = isAdmin && adminView;

  // teacher state
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const isOfficialDutyForm = isOfficialDutyLeave(form.leaveType);

  // admin state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [adminLeaves, setAdminLeaves] = useState([]);
  const [adminLeavesLoading, setAdminLeavesLoading] = useState(false);
  const [adminLeavesError, setAdminLeavesError] = useState("");
  const [adminFilter, setAdminFilter] = useState("PENDING");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [currentActiveLeaves, setCurrentActiveLeaves] = useState([]);
  const [currentLeavesLoading, setCurrentLeavesLoading] = useState(false);
  const [currentLeavesError, setCurrentLeavesError] = useState("");
  const [availabilityChartInstance, setAvailabilityChartInstance] = useState(null);
  const availabilityChartContainerRef = useRef(null);
  // const [typeBreakdown, setTypeBreakdown] = useState([]);

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const availabilityChartOptions = useMemo(() => {
    if (!isAdminDashboard) return null;
    const teacherAvailableRaw = toFiniteNumber(summary?.availableTeachers);
    const teacherTotal = toFiniteNumber(summary?.totalTeachers);
    const teacherOnLeave = toFiniteNumber(summary?.onLeave);
    const teacherAvailable =
      teacherAvailableRaw ?? (teacherTotal !== null && teacherOnLeave !== null ? Math.max(teacherTotal - teacherOnLeave, 0) : null);

    const officialDuty = summary?.officialDuty || {};
    const commanderAvailableRaw = toFiniteNumber(
      officialDuty.available ?? officialDuty.ready ?? officialDuty.readyToSupport ?? officialDuty.supporting
    );
    const commanderCurrent = toFiniteNumber(officialDuty.current);
    const commanderTotal = toFiniteNumber(
      officialDuty.total ?? officialDuty.all ?? officialDuty.count ?? officialDuty.totalTeachers
    );
    const commanderAvailable =
      commanderAvailableRaw ??
      (commanderTotal !== null && commanderCurrent !== null ? Math.max(commanderTotal - commanderCurrent, 0) : null);

    const totalReady = (teacherAvailable ?? 0) + (commanderAvailable ?? 0);

    const labels = ["ครูพร้อมปฏิบัติงาน", "ข้าราชการพร้อมปฏิบัติงาน", "กำลังพลพร้อมปฏิบัติงานทั้งหมด"];
    const data = [
      { value: teacherAvailable ?? 0, itemStyle: { color: "#2563eb" } },
      { value: commanderAvailable ?? 0, itemStyle: { color: "#f59e0b" } },
      { value: totalReady, itemStyle: { color: "#22c55e" } },
    ];

    if (data.every((item) => item.value === 0)) return null;

    return {
      grid: { left: 28, right: 12, top: 32, bottom: 32 },
      tooltip: { trigger: "item" },
      xAxis: {
        type: "category",
        data: labels,
        axisTick: { show: false },
        axisLabel: { color: "#475569", fontWeight: 600 },
        axisLine: { lineStyle: { color: "#cbd5e1" } },
      },
      yAxis: {
        type: "value",
        name: "จำนวน (คน)",
        nameTextStyle: { color: "#475569", padding: [0, 0, 0, 12] },
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        axisLabel: { color: "#475569" },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [
        {
          name: "พร้อมปฏิบัติงาน",
          type: "bar",
          data,
          barWidth: "55%",
          label: { show: true, position: "top", color: "#0f172a", fontWeight: 700 },
          itemStyle: { borderRadius: [10, 10, 6, 6] },
        },
      ],
      animationDuration: 600,
    };
  }, [isAdminDashboard, summary]);

  useEffect(() => {
    if (!availabilityChartInstance) return undefined;
    const handleResize = () => availabilityChartInstance.resize();

    const observer = new ResizeObserver(handleResize);
    if (availabilityChartContainerRef.current) {
      observer.observe(availabilityChartContainerRef.current);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [availabilityChartInstance]);

  const fetchLeaves = useCallback(async () => {
    if (isAdminDashboard) return;
    setLoadingLeaves(true);
    try {
      const [generalResponse, officialResponse] = await Promise.all([
        axios.get("/api/teacher/leaves", { headers }),
        axios.get("/api/teacher/official-duty-leaves", { headers }),
      ]);
      const generalLeaves = parseLeaves(generalResponse.data).map((leave) => ({
        ...leave,
        isOfficialDuty: Boolean(leave.isOfficialDuty),
      }));
      const officialLeaves = parseLeaves(officialResponse.data).map((leave) => ({
        ...leave,
        isOfficialDuty: true,
      }));
      const combined = [...generalLeaves, ...officialLeaves].sort((a, b) => {
        const aDate = new Date(a.createdAt || a.startDate || 0).getTime();
        const bDate = new Date(b.createdAt || b.startDate || 0).getTime();
        return bDate - aDate;
      });
      setLeaves(combined);
    } catch (error) {
      setLeaves([]);
      Swal.fire({
        icon: "error",
        title: "โหลดข้อมูลการลาไม่สำเร็จ",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setLoadingLeaves(false);
    }
  }, [headers, isAdminDashboard]);

  const fetchSummary = useCallback(async () => {
    if (!isAdminDashboard) return;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const response = await axios.get("/api/admin/teacher-leaves/summary", { headers });
      setSummary(normalizeSummary(response.data));
    } catch (error) {
      setSummary(null);
      setSummaryError(error?.response?.data?.message || "ไม่สามารถโหลดสรุปกำลังพลได้");
    } finally {
      setSummaryLoading(false);
    }
  }, [headers, isAdminDashboard]);

  const fetchAdminLeaves = useCallback(async () => {
    if (!isAdminDashboard) return;
    setAdminLeavesLoading(true);
    setAdminLeavesError("");
    try {
      const response = await axios.get("/api/admin/teacher-leaves", {
        headers,
        params: { status: adminFilter, limit: 100 },
      });
      const records = parseLeaves(response.data).map((leave) => ({
        ...leave,
        isOfficialDuty: Boolean(leave.isOfficialDuty || isOfficialDutyLeave(leave.leaveType)),
      }));
      records.sort((a, b) => {
        const dutyDiff = Number(b.isOfficialDuty) - Number(a.isOfficialDuty);
        if (dutyDiff !== 0) return dutyDiff;
        const aDate = new Date(a.createdAt || a.startDate || 0).getTime();
        const bDate = new Date(b.createdAt || b.startDate || 0).getTime();
        return bDate - aDate;
      });
      setAdminLeaves(records);
    } catch (error) {
      setAdminLeaves([]);
      setAdminLeavesError(error?.response?.data?.message || "ไม่สามารถโหลดรายการการลาได้");
    } finally {
      setAdminLeavesLoading(false);
    }
  }, [adminFilter, headers, isAdminDashboard]);

  const fetchCurrentLeaves = useCallback(async () => {
    if (!isAdminDashboard) return;
    setCurrentLeavesLoading(true);
    setCurrentLeavesError("");
    try {
      const response = await axios.get("/api/admin/teacher-leaves/current", { headers });
      setCurrentActiveLeaves(parseLeaves(response.data));
    } catch (error) {
      setCurrentActiveLeaves([]);
      setCurrentLeavesError(error?.response?.data?.message || "ไม่สามารถโหลดรายชื่อผู้ที่กำลังลาได้");
    } finally {
      setCurrentLeavesLoading(false);
    }
  }, [headers, isAdminDashboard]);

  useEffect(() => {
    if (isAdminDashboard) {
      fetchSummary();
      fetchAdminLeaves();
      fetchCurrentLeaves();
      return;
    }
    fetchLeaves();
  }, [fetchAdminLeaves, fetchCurrentLeaves, fetchLeaves, fetchSummary, isAdminDashboard]);

  useEffect(() => {
    const syncRole = () => setRole(getStoredRole());
    window.addEventListener("storage", syncRole);
    window.addEventListener("auth-change", syncRole);
    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("auth-change", syncRole);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setAdminView(false);
    }
  }, [isAdmin]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePresetSelect = (value) => {
    setForm((prev) => ({ ...prev, leaveType: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || isAdminDashboard) return;

    if (!form.leaveType || !form.startDate || !form.destination) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณาเลือกประเภทการลา ระบุวันเริ่มลา และจุดหมายปลายทาง",
      });
      return;
    }

    if (form.endDate && form.endDate < form.startDate) {
      Swal.fire({
        icon: "warning",
        title: "ช่วงวันไม่ถูกต้อง",
        text: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มลา",
      });
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      startDate: toUtcIsoString(form.startDate),
      endDate: toUtcIsoString(form.endDate),
      isOfficialDuty: Boolean(isOfficialDutyForm),
    };
    const endpoint = isOfficialDutyForm ? "/api/teacher/official-duty-leaves" : "/api/teacher/leaves";
    try {
      await axios.post(endpoint, payload, { headers });
      Swal.fire({
        icon: "success",
        title: "บันทึกคำขอลาสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
      setForm(INITIAL_FORM);
      fetchLeaves();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ส่งคำขอลาไม่สำเร็จ",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!leaveId || isAdminDashboard) return;
    const leave = leaves.find((l) => l.id === leaveId || l._id === leaveId);
    if (leave && leave.status && mapApprovalStatus(leave.status, "PENDING") !== "PENDING") {
      Swal.fire({ icon: "info", title: "ยกเลิกไม่ได้", text: "ยกเลิกได้เฉพาะคำขอที่ยังรอดำเนินการ" });
      return;
    }
    const ok = await Swal.fire({
      icon: "warning",
      title: "ยืนยันยกเลิกคำขอลา",
      text: "ต้องการยกเลิกคำขอนี้หรือไม่?",
      showCancelButton: true,
      confirmButtonText: "ยืนยันยกเลิก",
      cancelButtonText: "กลับ",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;

    setCancelingId(leaveId);
    try {
      await axios.patch(`/api/teacher/leaves/${leaveId}/cancel`, {}, { headers });
      Swal.fire({ icon: "success", title: "ยกเลิกคำขอแล้ว", timer: 1200, showConfirmButton: false });
      fetchLeaves();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ยกเลิกไม่สำเร็จ",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setCancelingId(null);
    }
  };

  const handleUpdateStatus = async (leaveId, nextStatus) => {
    if (!isAdminDashboard || !leaveId || !nextStatus) return;
    const normalizedNextStatus = mapApprovalStatus(nextStatus, "PENDING");
    const targetLeave = adminLeaves.find((leave) => leave.id === leaveId);
    if (targetLeave) {
      const currentStatus = mapApprovalStatus(targetLeave.status, "PENDING");
      if (currentStatus === normalizedNextStatus) {
        Swal.fire({
          icon: "info",
          title: "สถานะถูกอัปเดตแล้ว",
          text: `คำขอลานี้อยู่ในสถานะ "${currentStatus === "APPROVED" ? "อนุมัติแล้ว" : "ไม่อนุมัติ"}" อยู่แล้ว`,
        });
        return;
      }
      if (isOfficialDutyLeave(targetLeave.leaveType) && !isOwner) {
        Swal.fire({
          icon: "info",
          title: "รอการอนุมัติจาก OWNER",
          text: "คำขอลาไปราชการสามารถอนุมัติได้เฉพาะผู้บังคับบัญชาระดับ OWNER เท่านั้น",
        });
        return;
      }
    }
    setUpdatingStatusId(leaveId);
    try {
      await axios.patch(
        `/api/admin/teacher-leaves/${leaveId}/status`,
        { status: nextStatus },
        { headers }
      );
      fetchSummary();
      fetchAdminLeaves();
      fetchCurrentLeaves();
      Swal.fire({
        icon: "success",
        title: nextStatus === "APPROVED" ? "อนุมัติคำขอลาสำเร็จ" : "ปฏิเสธคำขอลาสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถอัปเดตสถานะได้",
        text: error?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const adminTabs = isAdmin ? (
    <div className="sticky top-4 z-20 flex lg:justify-end items-end">
      <AdminViewTabs active={adminView ? "ADMIN" : "TEACHER"} onChange={(mode) => setAdminView(mode === "ADMIN")} />
    </div>
  ) : null;

  if (isAdminDashboard) {
    const totalTeachers = summary?.totalTeachers ?? 0;
    const onLeave = summary?.onLeave ?? 0;
    const reportedAvailable = summary?.availableTeachers;
    const hasSummaryCurrentLeaves = Array.isArray(summary?.currentLeaves);
    const currentLeaves = hasSummaryCurrentLeaves ? summary.currentLeaves : currentActiveLeaves;
    const activeLeaves = (currentLeaves || []).filter((leave) => isLeaveOngoing(leave));
    const officialDutyActiveLeaves = activeLeaves.filter(
      (leave) => isOfficialDutyLeave(leave.leaveType) && matchesAdminLevelRole(leave)
    );
    const activeTeacherCount = countUniqueTeachers(activeLeaves);
    const available =
      typeof reportedAvailable === "number" ? reportedAvailable : Math.max(totalTeachers - activeTeacherCount, 0);
    const totalRequests = summary?.totalLeaveRequests ?? 0;
    const currentLeavesBusy = hasSummaryCurrentLeaves ? summaryLoading : currentLeavesLoading;
    const currentLeavesErrorMessage = hasSummaryCurrentLeaves ? "" : currentLeavesError;
    const recentLeaves = summary?.recentLeaves ?? [];
    const recentApprovedLeaves = recentLeaves.filter(
      (leave) => mapApprovalStatus(leave.status, "PENDING") === "APPROVED"
    );
    const officialDutySummary = summary?.officialDuty || {};
    const officialDutyCurrent =
      typeof officialDutySummary.current === "number"
        ? officialDutySummary.current
        : officialDutyActiveLeaves.length;
    const officialDutyTotalFromStatuses = [officialDutySummary.approved, officialDutySummary.pending, officialDutySummary.rejected]
      .map((item) => toFiniteNumber(item))
      .filter((item) => typeof item === "number")
      .reduce((acc, val) => acc + val, 0);
    const officialDutyTotal =
      toFiniteNumber(officialDutySummary.total ?? officialDutySummary.count ?? officialDutySummary.all) ??
      (officialDutyTotalFromStatuses > 0 ? officialDutyTotalFromStatuses : null) ??
      (officialDutyActiveLeaves.length > 0 ? officialDutyActiveLeaves.length : null);
    const officialDutyAvailable =
      toFiniteNumber(officialDutySummary.available ?? officialDutySummary.ready ?? officialDutySummary.readyToSupport) ?? null;
    const officialDutyByFilter =
      adminFilter === "APPROVED"
        ? officialDutySummary.approved
        : adminFilter === "REJECTED"
          ? officialDutySummary.rejected
          : officialDutySummary.pending;
    const officialDutyInView =
      typeof officialDutyByFilter === "number"
        ? officialDutyByFilter
        : adminLeaves.filter((leave) => isOfficialDutyLeave(leave.leaveType) && matchesAdminLevelRole(leave)).length;
    const officialDutyReady =
      typeof officialDutyAvailable === "number"
        ? officialDutyAvailable
        : typeof officialDutyTotal === "number"
          ? Math.max(officialDutyTotal - officialDutyCurrent, 0)
          : 0;
    const officialDutyOverall =
      typeof officialDutyTotal === "number"
        ? officialDutyTotal
        : typeof officialDutyReady === "number"
          ? officialDutyReady + officialDutyCurrent
          : officialDutyCurrent;
    const activeLeaveCount = activeTeacherCount || onLeave;
    const refreshDisabled = summaryLoading || adminLeavesLoading || currentLeavesBusy;
    const adminFilterLabel =
      adminFilter === "APPROVED" ? "อนุมัติแล้ว" : adminFilter === "REJECTED" ? "ไม่อนุมัติ" : "รออนุมัติ";
    return (
      <div className="w-full flex flex-col gap-6">

        <header className="bg-white rounded-2xl shadow p-6 flex flex-col lg:flex-row lg:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">ADMIN</p>
            <h1 className="text-3xl font-bold text-blue-900">แดชบอร์ดการลาของครูผู้สอน</h1>
            <p className="text-sm text-gray-600">สรุปจำนวนครูทั้งหมด ผู้ที่กำลังลาปัจจุบัน และรายละเอียดคำขอลาแบบล่าสุด</p>
          </div>
          {adminTabs}
        </header>

        <section className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 shadow-lg p-6 lg:p-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> แดชบอร์ดกำลังพล
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">ข้อมูลอัปเดตจากระบบแจ้งลา</p>
              <p className="text-sm text-slate-500">ดูภาพรวมครูที่ลา ผู้บังคับบัญชาไปราชการ และความพร้อมของกำลังพล ณ ขณะนี้</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center bg-white/80 border border-slate-100 shadow-sm rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">ตัวกรองสถานะ</span>
                <select
                  value={adminFilter}
                  onChange={(event) => setAdminFilter(event.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  <option value="PENDING">รออนุมัติ</option>
                  <option value="APPROVED">อนุมัติแล้ว</option>
                  <option value="REJECTED">ไม่อนุมัติ</option>
                </select>
              </div>
              <button
                onClick={() => {
                  fetchSummary();
                  fetchAdminLeaves();
                  fetchCurrentLeaves();
                }}
                disabled={refreshDisabled}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold shadow hover:bg-blue-800 disabled:opacity-60"
              >
                <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" aria-hidden />
                {refreshDisabled ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
              </button>
              <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1 font-semibold">
                แสดง: {adminFilterLabel}
              </span>
            </div>
          </div>

          {summaryError && <div className="text-center py-4 text-red-500">{summaryError}</div>}

          {!summaryError && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl bg-white/80 border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase">ครู</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <AdminLeaveStatCard label="ครูทั้งหมด" value={totalTeachers.toLocaleString("th-TH")} accent="from-slate-700 to-slate-500" />
                    <AdminLeaveStatCard label="กำลังลา" value={activeLeaveCount.toLocaleString("th-TH")} accent="from-rose-500 to-amber-500" />
                    <AdminLeaveStatCard label="พร้อมสอน" value={available.toLocaleString("th-TH")} accent="from-emerald-600 to-emerald-400" />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/80 border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase">ราชการ</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <AdminLeaveStatCard label="ทั้งหมด" value={officialDutyOverall.toLocaleString("th-TH")} accent="from-orange-600 to-amber-500" />
                    <AdminLeaveStatCard label="กำลังลา" value={officialDutyCurrent.toLocaleString("th-TH")} accent="from-amber-500 to-orange-400" />
                    <AdminLeaveStatCard label="พร้อมสนับสนุน" value={officialDutyReady.toLocaleString("th-TH")} accent="from-emerald-500 to-teal-400" />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/80 border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase">คำขอ</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AdminLeaveStatCard label="คำขอลาทั้งหมด" value={totalRequests.toLocaleString("th-TH")} accent="from-indigo-600 to-indigo-400" />
                    <AdminLeaveStatCard label={`ไปราชการ (${adminFilterLabel})`} value={officialDutyInView.toLocaleString("th-TH")} accent="from-sky-600 to-blue-500" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl bg-white/80 border border-slate-100 shadow-sm p-4 flex flex-col gap-3 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">ภาพรวมกำลังพลพร้อมปฏิบัติงาน</p>
                      <p className="text-xs text-gray-500">ครู/ผู้บังคับบัญชา และยอดรวมที่พร้อมปฏิบัติงาน</p>
                    </div>
                  </div>
                  {summaryLoading ? (
                    <p className="text-sm text-gray-400 text-center py-6">กำลังโหลดข้อมูล...</p>
                  ) : availabilityChartOptions ? (
                    <div ref={availabilityChartContainerRef} className="w-full h-[280px] md:h-[320px]">
                      <ReactECharts
                        option={availabilityChartOptions}
                        notMerge
                        lazyUpdate
                        style={{ width: "100%", height: "100%" }}
                        onChartReady={(chart) => setAvailabilityChartInstance(chart)}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีข้อมูลสำหรับแสดงผล</p>
                  )}
                </div>

                <div className="rounded-2xl bg-white/80 border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gray-800">คำขอลาที่อนุมัติแล้ว (ล่าสุด)</p>
                  {summaryLoading ? (
                    <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
                  ) : recentApprovedLeaves.length === 0 ? (
                    <p className="text-sm text-gray-400">ยังไม่มีคำขอที่อนุมัติแล้วในช่วงล่าสุด</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {recentApprovedLeaves.map((leave) => (
                        <div
                          key={leave.id || `${leave.teacherId}-${leave.startDate}-approved`}
                          className="flex flex-wrap items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {getTeacherDisplayName(leave)} · {getLeaveTypeLabel(leave.leaveType)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateRange(leave.startDate, leave.endDate)} · จุดหมาย {leave.destination || "-"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                              อนุมัติแล้ว
                            </span>
                            {leave.ownerApprovalAt ? (
                              <span>{formatDateTime(leave.ownerApprovalAt)}</span>
                            ) : leave.adminApprovalAt ? (
                              <span>{formatDateTime(leave.adminApprovalAt)}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-gray-800">กำลังลาปัจจุบัน (ยังไม่หมดลา)</p>
                {currentLeavesBusy ? (
                  <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
                ) : currentLeavesErrorMessage ? (
                  <p className="text-sm text-red-500">{currentLeavesErrorMessage}</p>
                ) : activeLeaves.length === 0 ? (
                  <p className="text-sm text-gray-400">ไม่มีครูที่กำลังลา</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeLeaves.map((leave) => (
                      <div
                        key={leave.id || `${leave.teacherId}-${leave.startDate}`}
                        className="flex flex-wrap items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {getTeacherDisplayName(leave)} · {getLeaveTypeLabel(leave.leaveType)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateRange(leave.startDate, leave.endDate)} · จุดหมาย {leave.destination || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOfficialDutyLeave(leave.leaveType) && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                              ลาไปราชการ
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                            {getStatusLabel(leave.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">คำขอลา ({adminFilter === "PENDING" ? "รออนุมัติ" : adminFilter === "APPROVED" ? "อนุมัติแล้ว" : "ไม่อนุมัติ"})</p>
              <p className="text-sm text-gray-500">แสดงสูงสุด 100 รายการล่าสุดตามสถานะที่เลือก</p>
            </div>
          </div>
          {adminLeavesLoading ? (
            <div className="text-center py-8 text-blue-600 font-semibold">กำลังโหลดข้อมูล...</div>
          ) : adminLeavesError ? (
            <div className="text-center py-8 text-red-500">{adminLeavesError}</div>
          ) : adminLeaves.length === 0 ? (
            <div className="text-center py-8 text-gray-400">ไม่พบคำขอลาตามสถานะนี้</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-3 text-left">ครูผู้สอน</th>
                    <th className="p-3 text-left">ประเภท</th>
                    <th className="p-3 text-left">ช่วงวันลา</th>
                    <th className="p-3 text-left">จุดหมาย</th>
                    <th className="p-3 text-left">ขั้นการอนุมัติ</th>
                    <th className="p-3 text-left">สถานะ</th>
                    <th className="p-3 text-left">บันทึกเมื่อ</th>
                    {adminFilter === "PENDING" && <th className="p-3 text-left">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody>
                  {adminLeaves.map((leave) => (
                    <tr key={leave.id || `${leave.teacherId}-${leave.createdAt}`} className="border-t border-gray-100">
                      <td className="p-3 font-semibold text-gray-900">{getTeacherDisplayName(leave)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span>{getLeaveTypeLabel(leave.leaveType)}</span>
                          {isOfficialDutyLeave(leave.leaveType) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">ลาไปราชการ</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{formatDateRange(leave.startDate, leave.endDate)}</td>
                      <td className="p-3">{leave.destination || "-"}</td>
                      <td className="p-3 align-top">
                        <LeaveApprovalSteps leave={leave} compact />
                      </td>
                      <td className="p-3">{getStatusLabel(leave.status)}</td>
                      <td className="p-3">{formatDateTime(leave.createdAt)}</td>
                      {adminFilter === "PENDING" && (
                        <td className="p-3">
                          {isOfficialDutyLeave(leave.leaveType) && !isOwner ? (
                            <p className="text-xs text-gray-500 font-semibold">รอ OWNER พิจารณา</p>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateStatus(leave.id, "APPROVED")}
                                disabled={updatingStatusId === leave.id}
                                className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60"
                              >
                                {updatingStatusId === leave.id ? "กำลังบันทึก..." : "อนุมัติ"}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(leave.id, "REJECTED")}
                                disabled={updatingStatusId === leave.id}
                                className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-60"
                              >
                                {updatingStatusId === leave.id ? "กำลังบันทึก..." : "ไม่อนุมัติ"}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">

      <header className="bg-white rounded-2xl shadow p-6 flex flex-col lg:flex-row justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">TEACHER</p>
          <h1 className="text-3xl font-bold text-blue-900">แจ้งการลา</h1>
          <p className="text-sm text-gray-600">บันทึกคำขอลา พร้อมตรวจสอบประวัติการลาของคุณภายในหน้าเดียว</p>
        </div>
        {adminTabs}
      </header>

      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-6">
        <div>
          <p className="text-lg font-semibold text-gray-800">ฟอร์มแจ้งการลา</p>
          <p className="text-sm text-gray-500">กรอกข้อมูลให้ครบถ้วนเพื่อให้ผู้บังคับบัญชาดำเนินการอนุมัติ</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {LEAVE_PRESETS.map((preset) => (
            <LeavePresetCard
              key={preset.value}
              title={preset.title}
              description={preset.description}
              active={form.leaveType === preset.value}
              highlight={preset.highlight}
              onClick={() => handlePresetSelect(preset.value)}
            />
          ))}
        </div>
        {isOfficialDutyForm && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">คำแนะนำสำหรับลาไปราชการ</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>คำขอนี้จะถูกส่งให้ผู้บังคับบัญชาระดับ OWNER เพื่ออนุมัติเท่านั้น</li>
              <li>กรุณาระบุจุดหมายและเหตุผลให้ชัดเจน พร้อมแนบหลักฐานในช่องเหตุผลหากจำเป็น</li>
              <li>หากเลือกผิดประเภท สามารถย้อนกลับไปเลือก “คำขอลาทั่วไป” ได้จากการ์ดด้านบน</li>
            </ul>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span>ประเภทการลา</span>
              <select
                name="leaveType"
                value={form.leaveType}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isOfficialDutyForm}
              >
                {GENERAL_LEAVE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="OFFICIAL_DUTY" disabled>
                  ลาไปราชการ (เลือกผ่านการ์ดด้านบน)
                </option>
              </select>
              {isOfficialDutyForm && (
                <span className="text-xs text-amber-700 mt-1">กำลังส่งคำขอ “ลาไปราชการ”</span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>จุดหมายปลายทาง</span>
              <input
                type="text"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น บ้านพัก จ.ชลบุรี"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>วันเริ่มลา (ระบุวันที่และเวลา)</span>
              <input
                type="datetime-local"
                name="startDate"
                value={toInputDateTime(form.startDate)}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>วันสิ้นสุด (ระบุวันที่และเวลา)</span>
              <input
                type="datetime-local"
                name="endDate"
                value={toInputDateTime(form.endDate)}
                min={form.startDate ? toInputDateTime(form.startDate) : undefined}
                onChange={handleChange}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span>เหตุผลเพิ่มเติม</span>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={4}
              placeholder="อธิบายเหตุผลและรายละเอียดเพิ่มเติม"
              className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => setForm(INITIAL_FORM)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50"
              disabled={submitting}
            >
              ล้างฟอร์ม
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-800 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "กำลังบันทึก..." : "ส่งคำขอลา"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-800">ประวัติการลา</p>
            <p className="text-sm text-gray-500">ตรวจสอบสถานะคำขอลา และรายละเอียดรอบล่าสุด</p>
          </div>
          <button
            onClick={fetchLeaves}
            disabled={loadingLeaves}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-60"
          >
            {loadingLeaves ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>
        <div className="grid gap-3">
          {leaves.length === 0 && !loadingLeaves && (
            <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูลการลา</p>
          )}
          {leaves.map((leave) => {
            const official = isOfficialDutyLeave(leave.leaveType);
            const typeLabel = getLeaveTypeLabel(leave.leaveType);
            const statusMapped = mapApprovalStatus(leave.status, "PENDING");
            const isPending = statusMapped === "PENDING";
            const statusMeta =
              statusMapped === "APPROVED"
                ? { bg: "bg-emerald-50", text: "text-emerald-700", label: "อนุมัติแล้ว" }
                : statusMapped === "REJECTED"
                  ? { bg: "bg-rose-50", text: "text-rose-700", label: "ไม่อนุมัติ" }
                  : statusMapped === "ACTIVE"
                    ? { bg: "bg-blue-50", text: "text-blue-700", label: "กำลังลา" }
                    : statusMapped === "CANCEL"
                      ? { bg: "bg-slate-100", text: "text-rose-700", label: "ยกเลิกแล้ว" }
                      : { bg: "bg-amber-50", text: "text-amber-700", label: "รออนุมัติ" };
            return (
              <div
                key={leave.id || leave._id || `${leave.leaveType}-${leave.startDate}-${leave.createdAt}`}
                className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-gray-900">
                    {typeLabel} · {formatDateRange(leave.startDate, leave.endDate)}
                  </p>
                  <div className="flex items-center gap-2">
                    {official && (
                      <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                        ลาไปราชการ
                      </span>
                    )}
                    <span className={`text-sm px-3 py-1 rounded-full font-semibold ${statusMeta.bg} ${statusMeta.text}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">จุดหมาย: {leave.destination || "-"}</p>
                {leave.reason && <p className="text-sm text-gray-500 italic">เหตุผล: {leave.reason}</p>}
                <div className="border-t border-gray-100 pt-3 mt-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">ขั้นการอนุมัติ</p>
                  <LeaveApprovalSteps leave={leave} />
                </div>
                {isPending && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCancelLeave(leave.id || leave._id)}
                      disabled={cancelingId === (leave.id || leave._id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {cancelingId === (leave.id || leave._id) ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function LeavePresetCard({ title, description, active, highlight, onClick }) {
  const accent = highlight ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${active ? "ring-2 ring-blue-200" : "ring-0"
        } ${accent}`}
    >
      <p className="text-base font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      {active && <p className="text-xs text-blue-600 mt-2">กำลังเลือกประเภทนี้</p>}
    </button>
  );
}

function AdminViewTabs({ active, onChange }) {
  const tabs = [
    { key: "ADMIN", label: "แดชบอร์ด ADMIN" },
    { key: "TEACHER", label: "ระบบแจ้งการลา" },
  ];
  return (
    <div className="rounded-2xl w-full h-fit border border-blue-100 bg-blue-50/60 p-2 flex gap-2">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${selected
              ? "bg-white text-blue-700 shadow border border-blue-200"
              : "text-blue-700/70 hover:bg-white/60 border border-transparent"
              }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function AdminLeaveStatCard({ label, value, accent }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow bg-gradient-to-br ${accent}`}>
      <p className="text-sm text-white/80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function LeaveApprovalSteps({ leave, compact = false }) {
  if (!leave) return null;
  const overallStatus = mapApprovalStatus(leave.status, "PENDING");
  const stepBaseline = overallStatus === "CANCEL" ? "PENDING" : overallStatus;
  const adminStatus = mapApprovalStatus(leave.adminApprovalStatus, stepBaseline);
  const ownerStatusFallback = adminStatus === "APPROVED" ? stepBaseline : "PENDING";
  const ownerStatus = mapApprovalStatus(leave.ownerApprovalStatus, ownerStatusFallback);
  const isOfficialDuty = isOfficialDutyLeave(leave.leaveType);

  const steps = [];
  if (!isOfficialDuty) {
    steps.push({
      key: "ADMIN",
      // label: "หัวหน้าหมวด / ADMIN",
      label: "หัวหน้าหมวด",
      status: adminStatus,
      approver: leave.adminApprover,
      approvedAt: leave.adminApprovalAt,
    });
  }
  steps.push({
    key: "OWNER",
    // label: "ผู้บังคับบัญชา / OWNER",
    label: "ผู้บังคับบัญชา",
    status: ownerStatus,
    approver: leave.ownerApprover,
    approvedAt: leave.ownerApprovalAt,
  });

  return (
    <div className={`flex flex-col gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      {steps.map((step, index) => {
        const meta = APPROVAL_STATUS_META[step.status] || APPROVAL_STATUS_META.PENDING;
        const name = getApproverDisplayName(step.approver);
        const showConnector = index < steps.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              {showConnector && <span className="w-px flex-1 bg-gray-200 mt-1" />}
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-gray-900 ${compact ? "text-[11px]" : "text-sm"}`}>{step.label}</p>
              <p className={`text-xs font-medium ${meta.color}`}>{meta.label}</p>
              {name && <p className="text-[11px] text-gray-500">โดย {name}</p>}
              {step.approvedAt && <p className="text-[11px] text-gray-400">{formatDateTime(step.approvedAt)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

