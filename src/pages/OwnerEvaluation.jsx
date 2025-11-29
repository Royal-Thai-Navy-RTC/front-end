import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
  ClipboardCheck,
  Filter,
  RefreshCw,
  Search,
  Star,
  UserCheck,
} from "lucide-react";
import navy from "../assets/navy.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const ROLE_OPTIONS = [
  { label: "ทั้งหมด", value: "ALL" },
  { label: "ผู้บังคับบัญชา", value: "OWNER" },
  { label: "หัวหน้าหมวดวิชา", value: "SUB_ADMIN" },
  { label: "ครูผู้สอน", value: "TEACHER" },
  { label: "ผู้ดูแลระบบ", value: "ADMIN" },
];

const CRITERIA = [
  { key: "discipline", label: "วินัยและความรับผิดชอบ" },
  { key: "teamwork", label: "การทำงานเป็นทีม" },
  { key: "performance", label: "ประสิทธิภาพในการปฏิบัติราชการ" },
];

const resolveAvatarUrl = (value = "") => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path}`;
};

const getFullName = (user = {}) => `${user.firstName || ""} ${user.lastName || ""}`.trim();

const normalizeUsers = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const normalizeTemplates = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const extractQuestions = (template = {}) => {
  const direct = Array.isArray(template.questions) ? template.questions : Array.isArray(template.items) ? template.items : [];

  const fromSections = Array.isArray(template.sections)
    ? template.sections.flatMap((section) =>
        Array.isArray(section.questions)
          ? section.questions.map((q) => ({
              ...q,
              sectionLabel: section.title || section.name || section.label,
              sectionOrder: section.sectionOrder ?? section.order ?? null,
            }))
          : []
      )
    : [];

  const merged = direct.length ? direct : fromSections.length ? fromSections : [];

  return merged
    .map((q, index) => {
      const key = q.key || q.id || q._id || `question-${index}`;
      const questionId = q.id ?? q._id ?? null;
      const label =
        q.label ||
        q.text ||
        q.name ||
        q.title ||
        q.question ||
        q.prompt ||
        q.itemText ||
        `ข้อที่ ${index + 1}`;
      const maxScore = Number.isFinite(Number(q.maxScore))
        ? Number(q.maxScore)
        : Number.isFinite(Number(q.scoreMax))
          ? Number(q.scoreMax)
          : 5;
      const sectionLabel = q.sectionLabel || q.section || q.category || q.topic || "หัวข้อหลัก";
      const order = q.questionOrder ?? q.order ?? null;
      return { key, questionId, label, prompt: q.prompt, maxScore: maxScore > 0 ? maxScore : 5, sectionLabel, order, sectionOrder: q.sectionOrder };
    })
    .sort((a, b) => {
      const secA = a.sectionOrder ?? 1;
      const secB = b.sectionOrder ?? 1;
      if (secA !== secB) return secA - secB;
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label, "th");
    });
};

const buildScoreOptions = (maxScore = 5) => {
  const step = maxScore > 10 ? 1 : 0.5;
  const options = [];
  for (let v = 0; v <= maxScore + 1e-9; v += step) {
    const rounded = Math.round(v * 10) / 10;
    options.push(rounded);
  }
  return options;
};

export default function OwnerEvaluation() {
  const outletContext = useOutletContext() || {};
  const currentUser = outletContext.user || {};
  const currentUserId = currentUser?.id ?? currentUser?._id;
  const currentUsername = (currentUser?.username || "").toString().toLowerCase();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState("");

  const [subject, setSubject] = useState("ประเมินข้าราชการ");
  const [evaluationCycle, setEvaluationCycle] = useState("");
  const [evaluatedAt, setEvaluatedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [companyCode, setCompanyCode] = useState("");
  const [battalionCode, setBattalionCode] = useState("");
  const [evaluatorName, setEvaluatorName] = useState(() => {
    const name = getFullName(currentUser);
    return name || currentUser.username || "";
  });
  const [evaluatorUnit, setEvaluatorUnit] = useState(currentUser?.division || "");
  const [notes, setNotes] = useState("");
  const [ratings, setRatings] = useState({});
  const navigate = useNavigate();

  const pageSize = 8;

  useEffect(() => {
    const name = getFullName(currentUser) || currentUser.username || "";
    if (name && !evaluatorName) {
      setEvaluatorName(name);
    }
    if ((currentUser?.division || currentUser?.unit) && !evaluatorUnit) {
      setEvaluatorUnit((prev) => prev || currentUser.division || currentUser.unit || "");
    }
  }, [currentUser, evaluatorName, evaluatorUnit]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/admin/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setUsers(normalizeUsers(response.data));
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้";
        setError(message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/admin/student-evaluation-templates", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          params: {
            templateType: "SERVICE",
          },
        });
        const normalized = normalizeTemplates(response.data);
        setTemplates(normalized);
        if (normalized.length && !selectedTemplateId) {
          const firstId = normalized[0].id ?? normalized[0]._id ?? "";
          setSelectedTemplateId(firstId);
          if (normalized[0].name) {
            setSubject(normalized[0].name);
          }
        }
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || "ไม่สามารถโหลดแบบประเมินได้";
        setTemplatesError(message);
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users
      .filter((user) => {
        const role = (user.role || "").toString().toUpperCase();
        const candidateId = user?.id ?? user?._id;
        const candidateUsername = (user?.username || "").toString().toLowerCase();
        const isSelf =
          (currentUserId != null && candidateId === currentUserId) ||
          (!!currentUsername && candidateUsername === currentUsername);
        if (isSelf) return false;
        if (role === "STUDENT") return false; // จำกัดเฉพาะข้าราชการ/บุคลากร
        if (roleFilter !== "ALL" && role !== roleFilter) return false;
        const fullName = getFullName(user).toLowerCase();
        return (
          fullName.includes(keyword) ||
          (user.username || "").toLowerCase().includes(keyword) ||
          (user.division || "").toLowerCase().includes(keyword) ||
          (user.rank || "").toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => getFullName(a).localeCompare(getFullName(b), "th"));
  }, [users, search, roleFilter, currentUserId, currentUsername]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => (t.id ?? t._id) === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  const templateQuestions = useMemo(() => {
    if (selectedTemplate) {
      const qs = extractQuestions(selectedTemplate);
      if (qs.length) return qs;
    }
    return CRITERIA;
  }, [selectedTemplate]);

  const templateOptions = useMemo(
    () =>
      templates.map((t, idx) => ({
        value: t.id ?? t._id ?? `${idx}`,
        label: t.name || t.title || `Template ${idx + 1}`,
      })),
    [templates]
  );

  useEffect(() => {
    if (selectedTemplate?.name) {
      setSubject(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    const fullName = getFullName(user);
    setSubject(fullName ? `ประเมิน ${fullName}` : "ประเมินข้าราชการ");
    setEvaluationCycle("");
    setEvaluatedAt(new Date().toISOString().slice(0, 10));
    const defaultCode = user?.username || user?.id || user?._id || "SERVICE";
    setCompanyCode((prev) => prev || `SRV-${defaultCode}`);
    setBattalionCode((prev) => prev || `SRV-${defaultCode}`);
    setEvaluatorUnit(user?.division || currentUser?.division || "");
    setNotes("");
    setRatings({});
  };

  const handleRatingChange = (key, value) => {
    const question = templateQuestions.find((q) => q.key === key);
    const max = question?.maxScore || 5;
    const num = value === "" ? "" : Math.max(0, Math.min(max, Number(value)));
    if (Number.isNaN(num) && value !== "") return;
    setRatings((prev) => ({ ...prev, [key]: value === "" ? "" : num }));
  };

  const handleSubmit = async () => {
    const role = (currentUser?.role || "").toUpperCase();
    if (role !== "OWNER") {
      Swal.fire({ icon: "warning", title: "เฉพาะ OWNER เท่านั้น", text: "สิทธิ์ไม่เพียงพอในการบันทึกการประเมิน" });
      return;
    }
    if (!selectedUser) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกรายชื่อ", text: "เลือกบุคคลที่ต้องการประเมินก่อน" });
      return;
    }

    const evaluationTargetId = selectedUser.id ?? selectedUser._id;
    if (!evaluationTargetId) {
      Swal.fire({ icon: "warning", title: "ไม่พบรหัสผู้ใช้", text: "ไม่สามารถส่งผลการประเมินได้" });
      return;
    }

    if (!selectedTemplateId) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกแบบประเมิน" });
      return;
    }

    const templateType = (selectedTemplate?.templateType || "SERVICE").toUpperCase();
    const evaluationPeriod = evaluatedAt || "";
    const evaluationRound = evaluationCycle?.trim() || "";
    const evaluatorNameValue = evaluatorName?.trim() || "";

    if (templateType === "SERVICE") {
      if (!evaluationPeriod) {
        Swal.fire({ icon: "warning", title: "กรุณาเลือกวันที่ตรวจ" });
        return;
      }
      if (!evaluationRound) {
        Swal.fire({ icon: "warning", title: "กรุณาระบุรอบการประเมิน" });
        return;
      }
      if (!evaluatorNameValue) {
        Swal.fire({ icon: "warning", title: "กรุณาระบุชื่อผู้ประเมิน" });
        return;
      }
    }

    const answers = templateQuestions
      .map((item) => {
        const rating = ratings[item.key];
        const maxScore = item.maxScore || 5;
        const cappedRating =
          rating === "" || rating === undefined || rating === null
            ? null
            : Math.max(0, Math.min(Number(maxScore) || 5, Number(rating)));
        return cappedRating === null
          ? null
          : {
              questionId: item.questionId || item.key,
              score: cappedRating,
            };
      })
      .filter(Boolean);

    if (!answers.length) {
      Swal.fire({ icon: "warning", title: "ยังไม่ได้ให้คะแนน", text: "กรุณากรอกคะแนนอย่างน้อย 1 หมวด" });
      return;
    }

    const payload = {
      templateId: selectedTemplate?.id ?? selectedTemplate?._id,
      subject: subject?.trim() || "ประเมินข้าราชการ",
      companyCode: (companyCode?.trim() || "") || (templateType === "SERVICE" ? "SERVICE" : undefined),
      battalionCode: (battalionCode?.trim() || "") || (templateType === "SERVICE" ? "SERVICE" : undefined),
      evaluationPeriod: evaluationPeriod || undefined,
      evaluationRound: evaluationRound || undefined,
      summary: notes?.trim() || undefined,
      evaluatorName: evaluatorNameValue || undefined,
      overallScore: answers.reduce((sum, a) => sum + Number(a.score || 0), 0) || undefined,
      answers,
    };

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/student-evaluations", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      Swal.fire({ icon: "success", title: "บันทึกการประเมินสำเร็จ" });
      setRatings({});
      setNotes("");
      setEvaluationCycle("");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "บันทึกการประเมินไม่สำเร็จ";
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: message });
    } finally {
      setSaving(false);
    }
  };

  const getPaginationNumbers = () => {
    if (totalPages <= 1) return [1];
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }
    const rangeWithDots = [];
    if (page - delta > 2) rangeWithDots.push("...");
    rangeWithDots.push(...range);
    if (page + delta < totalPages - 1) rangeWithDots.push("...");
    return [1, ...rangeWithDots, totalPages];
  };

  const selectedId = selectedUser?.id ?? selectedUser?._id;
  const selectedAvatar = resolveAvatarUrl(selectedUser?.avatar) || navy;
  const templateTitle = selectedTemplate?.name || selectedTemplate?.title || "แบบประเมิน";
  const templatePrompt = selectedTemplate?.prompt || selectedTemplate?.description || selectedTemplate?.detail || "";
  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">ประเมินข้าราชการรายบุคคล</h1>
            <p className="text-sm text-gray-500">เลือกบุคลากรที่ต้องการประเมินจากรายชื่อ แล้วกรอกคะแนนในแบบฟอร์มด้านขวา</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-blue-300 transition">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, หน่วย, ยศ หรือ username"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 flex-1 text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            >
              <option value="">{templatesLoading ? "กำลังโหลดแบบประเมิน..." : "เลือกแบบประเมิน"}</option>
              {templateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("ALL");
              setPage(1);
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            รีเซตตัวกรอง
          </button>
        </div>
        {templatesError && (
          <p className="text-sm text-red-600 px-1">ไม่สามารถโหลดแบบประเมิน: {templatesError}</p>
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-gray-500">รายชื่อข้าราชการ</p>
              <h2 className="text-lg font-semibold text-gray-900">เลือกบุคคลที่ต้องการประเมิน</h2>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredUsers.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-50 text-gray-600 font-semibold">
                <tr>
                  <th className="p-3 border-b w-14 text-center">#</th>
                  <th className="p-3 border-b">ชื่อ-นามสกุล</th>
                  <th className="p-3 border-b">หน่วย/หมวด</th>
                  <th className="p-3 border-b text-center w-32">บทบาท</th>
                  <th className="p-3 border-b text-center w-32">การประเมิน</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="5" className="text-center p-4 text-blue-600">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan="5" className="text-center p-4 text-red-500">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center p-4 text-gray-500">
                      ไม่พบข้อมูลที่ตรงกับการค้นหา
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  paginatedUsers.map((user, idx) => {
                    const fullName = getFullName(user) || user.username || "-";
                    const avatarSrc = resolveAvatarUrl(user.avatar) || navy;
                    const role = (user.role || "").toString().toUpperCase();
                    return (
                      <tr key={user.id ?? user._id ?? user.username ?? idx} className="hover:bg-blue-50/40 transition">
                        <td className="p-3 border-b text-center text-xs font-semibold text-gray-500">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="p-3 border-b">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex items-center justify-center">
                              <img
                                src={avatarSrc}
                                alt={fullName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = navy;
                                }}
                              />
                            </div>
                            <div className="flex flex-col">
                              <p className="font-semibold text-gray-900 leading-tight">{fullName}</p>
                              <p className="text-xs text-gray-500">ยศ/ตำแหน่ง: {user.rank || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 border-b">
                          <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700 border border-blue-100">
                            {user.division || "-"}
                          </span>
                        </td>
                        <td className="p-3 border-b text-center">
                          <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 border border-gray-200">
                            {role || "-"}
                          </span>
                        </td>
                        <td className="p-3 border-b text-center">
                          <button
                            onClick={() => handleSelectUser(user)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                          >
                            <UserCheck size={16} />
                            ประเมิน
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
            <div>หน้า {page} / {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              {getPaginationNumbers().map((n, i) =>
                n === "..." ? (
                  <span key={`gap-${i}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(Number(n))}
                    className={`px-3 py-1 rounded-lg border ${
                      page === n ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-gray-500">แบบฟอร์มประเมิน</p>
              <h2 className="text-lg font-semibold text-gray-900">{templateTitle}</h2>
              {templatePrompt && <p className="text-sm text-gray-600 mt-1">{templatePrompt}</p>}
            </div>
            {selectedUser && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold">
                <Star size={14} />
                {getFullName(selectedUser) || selectedUser.username}
              </span>
            )}
          </div>

          {!selectedUser && (
            <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-gray-500 bg-gray-50">
              เลือกบุคคลจากตารางด้านซ้ายเพื่อเริ่มต้นประเมิน
            </div>
          )}

          {selectedUser && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50">
                <img src={selectedAvatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-white shadow" />
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-900">{getFullName(selectedUser) || selectedUser.username}</p>
                  <p className="text-xs text-gray-600">
                    ยศ: {selectedUser.rank || "-"} • หน่วย: {selectedUser.division || "-"}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs text-gray-500">
                  รอบการประเมิน
                  <input
                    type="text"
                    value={evaluationCycle}
                    onChange={(e) => setEvaluationCycle(e.target.value)}
                    placeholder="เช่น ไตรมาส 1/2568"
                    className="px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500">
                  วันที่ประเมิน
                  <input
                    type="date"
                    value={evaluatedAt}
                    onChange={(e) => setEvaluatedAt(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500">
                  ชื่อผู้ประเมิน
                  <input
                    type="text"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  ให้คะแนนตามแบบประเมิน ({templateQuestions.length} ข้อ)
                </p>
                <div className="flex flex-col gap-3">
                  {Object.entries(
                    templateQuestions.reduce((acc, q) => {
                      const section = q.sectionLabel || "หัวข้อหลัก";
                      acc[section] = acc[section] || [];
                      acc[section].push(q);
                      return acc;
                    }, {})
                  ).map(([section, qs]) => (
                    <div key={section} className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
                      <p className="text-sm font-semibold text-gray-800">{section}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {qs.map((item) => {
                          const prompt = item.prompt || item.hint || item.description;
                          return (
                            <div key={item.key} className="p-3 rounded-lg border border-gray-200 bg-white flex flex-col gap-2">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                                {prompt && <p className="text-xs text-gray-500">{prompt}</p>}
                              </div>
                              <select
                                value={ratings[item.key] ?? ""}
                                onChange={(e) => handleRatingChange(item.key, e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-sm bg-gray-50"
                              >
                                <option value="">เลือกคะแนน</option>
                                {buildScoreOptions(item.maxScore || 5).map((v) => (
                                  <option key={`${item.key}-${v}`} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-gray-500">ให้คะแนน 0 - {item.maxScore || 5}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-1">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setRatings({});
                    setNotes("");
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                  disabled={saving}
                >
                  ล้างแบบฟอร์ม
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl text-white font-semibold transition ${
                    saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกการประเมิน"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

    </div>
  );
}
