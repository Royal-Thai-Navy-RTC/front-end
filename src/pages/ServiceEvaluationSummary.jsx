import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, Eye, Loader2 } from "lucide-react";
import ReactECharts from "echarts-for-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const resolveAvatarUrl = (value = "") => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path}`;
};

const asArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatScore = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

const getAnswerListFull = (ev = {}) => {
  const answers = Array.isArray(ev.answers) ? ev.answers : [];
  return answers.map((ans, idx) => {
    const title = ans?.question?.prompt || `หัวข้อ ${idx + 1}`;
    const score = formatScore(ans?.score || 0);
    const max = ans?.question?.maxScore || 5;
    return { title, score, max };
  });
};

const getEvaluationUserId = (ev = {}) =>
  ev.evaluatedPersonId ||
  ev.userId ||
  ev.evaluatedUserId ||
  ev.studentId ||
  ev.targetUserId ||
  ev?.user?._id ||
  ev?.user?.id ||
  ev?.userId?._id ||
  null;

export default function ServiceEvaluationSummary() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [evaluations, setEvaluations] = useState([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [activeEvaluation, setActiveEvaluation] = useState(null);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [editingAnswers, setEditingAnswers] = useState({});
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [deletingEvaluationId, setDeletingEvaluationId] = useState(null);
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [loadingAllEvaluations, setLoadingAllEvaluations] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setUserError("");
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/admin/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = asArray(response.data);
        const filtered = payload.filter((u) => (u.role || "").toUpperCase() !== "STUDENT");
        setUsers(filtered);
      } catch (err) {
        setUsers([]);
        setUserError(err?.response?.data?.message || "ไม่สามารถโหลดรายชื่อผู้ใช้ได้");
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAllEvaluations = async () => {
      setLoadingAllEvaluations(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/student-evaluations", {
          params: { templateType: "SERVICE", includeAnswers: true, page: 1, pageSize: 500 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setAllEvaluations(asArray(response.data));
      } catch {
        setAllEvaluations([]);
      } finally {
        setLoadingAllEvaluations(false);
      }
    };
    fetchAllEvaluations();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
      const username = (u.username || "").toLowerCase();
      const division = (u.division || "").toLowerCase();
      return name.includes(term) || username.includes(term) || division.includes(term);
    });
  }, [search, users]);

  const handleSelectUser = async (userId) => {
    if (!userId) return;
    setSelectedUserId(userId);
    setLoadingEvaluations(true);
    setEvalError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/student-evaluations", {
        params: {
          templateType: "SERVICE",
          includeAnswers: true,
          page: 1,
          pageSize: 500,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const items = asArray(response.data);
      const targetId = (userId || "").toString();
      const filtered = items.filter((ev) => {
        const evalUserId = getEvaluationUserId(ev);
        return evalUserId && evalUserId.toString() === targetId;
      });
      setEvaluations(filtered);
      if (filtered.length === 0) {
        setEvalError("ยังไม่พบผลการประเมินสำหรับผู้ใช้นี้");
      }
    } catch (err) {
      setEvaluations([]);
      setEvalError(err?.response?.data?.message || "ไม่สามารถโหลดผลการประเมินได้");
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const selectedUser = useMemo(() => {
    const fromUsers = users.find((u) => (u.id ?? u._id) === selectedUserId);
    if (fromUsers) return fromUsers;
    // fallback: derive from evaluations when user is not in list
    if (evaluations.length) {
      const sample = evaluations[0];
      return {
        id: getEvaluationUserId(sample),
        firstName: sample.evaluatedPerson || "",
        role: (sample?.user?.role || "").toUpperCase(),
        division: sample.division || "",
      };
    }
    return null;
  }, [evaluations, selectedUserId, users]);

  const userStats = useMemo(() => {
    if (!evaluations.length) return { count: 0, average: 0, lastDate: null, person: "" };
    const count = evaluations.length;
    const total = evaluations.reduce((sum, ev) => sum + Number(ev.overallScore || 0), 0);
    const lastDate = evaluations.reduce((latest, ev) => {
      const d = ev.submittedAt || ev.updatedAt || ev.createdAt;
      const dd = d ? new Date(d) : null;
      if (!dd || Number.isNaN(dd.getTime())) return latest;
      if (!latest) return dd;
      return dd > latest ? dd : latest;
    }, null);
    const person = evaluations.find((ev) => ev.evaluatedPerson)?.evaluatedPerson || "";
    return { count, average: count ? total / count : 0, lastDate, person };
  }, [evaluations]);

  const rows = filteredUsers.map((u) => {
    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "-";
    return {
      id: u.id ?? u._id,
      name: fullName,
      role: (u.role || "").toUpperCase(),
      division: u.division || "-",
      avatar: resolveAvatarUrl(u.avatar || u.profileImage),
    };
  });

  const evaluationChartOption = useMemo(() => {
    if (!evaluations.length) return null;
    const sorted = [...evaluations].sort((a, b) => {
      const ta = new Date(a.submittedAt || a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.submittedAt || b.updatedAt || b.createdAt || 0).getTime();
      return ta - tb;
    });
    const labels = sorted.map(
      (ev, idx) =>
        ev.evaluationRound ||
        `ครั้งที่ ${idx + 1} (${formatDateTime(ev.submittedAt || ev.updatedAt || ev.createdAt)})`
    );
    const scores = sorted.map((ev) => Number(ev.overallScore || 0));
    return {
      tooltip: { trigger: "axis" },
      grid: { left: 32, right: 16, top: 32, bottom: 32 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: "#475569", rotate: 30 },
        axisLine: { lineStyle: { color: "#cbd5f5" } },
      },
      yAxis: {
        type: "value",
        name: "คะแนน",
        nameTextStyle: { color: "#475569" },
        axisLabel: { color: "#475569" },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [
        {
          name: "คะแนนรวม",
          type: "bar",
          barWidth: 22,
          itemStyle: { color: "#2563eb" },
          emphasis: { focus: "series" },
          data: scores,
        },
      ],
      color: ["#2563eb"],
    };
  }, [evaluations]);

  const topCandidateOption = useMemo(() => {
    if (!allEvaluations.length) return null;
    const map = new Map();
    allEvaluations.forEach((ev) => {
      const uid = getEvaluationUserId(ev);
      if (!uid) return;
      const key = uid.toString();
      if (!map.has(key)) {
        map.set(key, { sum: 0, count: 0, name: ev.evaluatedPerson || "-", role: ev.user?.role || "" });
      }
      const ref = map.get(key);
      ref.sum += Number(ev.overallScore || 0);
      ref.count += 1;
      if (ev.evaluatedPerson) ref.name = ev.evaluatedPerson;
    });
    const rowsTop = Array.from(map.entries())
      .map(([id, info]) => ({
        id,
        average: info.count ? info.sum / info.count : 0,
        count: info.count,
        name:
          users.find((u) => (u.id ?? u._id)?.toString() === id)?.firstName
            ? `${users.find((u) => (u.id ?? u._id)?.toString() === id)?.firstName || ""} ${
                users.find((u) => (u.id ?? u._id)?.toString() === id)?.lastName || ""
              }`.trim()
            : info.name || "ไม่ระบุ",
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    if (!rowsTop.length) return null;

    return {
      tooltip: { trigger: "axis" },
      grid: { left: 32, right: 16, top: 24, bottom: 32 },
      xAxis: {
        type: "category",
        data: rowsTop.map((r) => r.name || "ไม่ระบุ"),
        axisLabel: { color: "#475569", rotate: 20 },
        axisLine: { lineStyle: { color: "#cbd5f5" } },
      },
      yAxis: {
        type: "value",
        name: "คะแนนเฉลี่ย",
        nameTextStyle: { color: "#475569" },
        axisLabel: { color: "#475569" },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [
        {
          name: "คะแนนเฉลี่ย",
          type: "bar",
          barWidth: 28,
          itemStyle: { color: "#2563eb" },
          data: rowsTop.map((r) => Number(r.average.toFixed(2))),
        },
      ],
      color: ["#2563eb"],
    };
  }, [allEvaluations, users]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">Service Evaluation</p>
            <h1 className="text-3xl font-bold text-blue-900">สรุปผลการประเมินราชการ</h1>
            <p className="text-sm text-gray-600">เลือกผู้ใช้ก่อน แล้วเปิดดูรายละเอียดผลการประเมินของแต่ละคน</p>
          </div>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-200 w-full sm:w-80">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ บทบาท หรือหมวดวิชา"
              className="flex-1 text-sm focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">
              🔰 Top Candidates
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">แนวโน้มราชการดีเด่น</h2>
            <p className="text-xs sm:text-sm text-blue-50">จัดอันดับคะแนนเฉลี่ยสูงสุดจากการประเมินทุกคน</p>
          </div>
          {loadingAllEvaluations && (
            <span className="text-sm text-white inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10">
              <Loader2 className="animate-spin" size={16} /> กำลังโหลด...
            </span>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 text-gray-800 shadow-md border border-white/40">
          {topCandidateOption ? (
            <ReactECharts option={topCandidateOption} notMerge lazyUpdate style={{ height: 320, width: "100%" }} />
          ) : (
            <p className="text-sm text-gray-500">ยังไม่มีข้อมูลพอสำหรับจัดอันดับ</p>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">รายชื่อผู้รับการประเมิน</h2>
          {loadingUsers && <span className="text-sm text-blue-600 inline-flex items-center gap-1"><Loader2 className="animate-spin" size={16} /> กำลังโหลด...</span>}
        </div>
        {userError && <p className="text-sm text-red-600">{userError}</p>}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">ชื่อ</th>
                <th className="px-4 py-2 text-center">บทบาท</th>
                <th className="px-4 py-2 text-center">หมวดวิชา</th>
                <th className="px-4 py-2 text-right">ดูรายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={u.avatar || "https://via.placeholder.com/40"}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                      />
                      <span className="font-semibold text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{u.role}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-600">{u.division}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSelectUser(u.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50"
                    >
                      <Eye size={14} />
                      ดูผลประเมิน
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-sm">
                    {loadingUsers ? "กำลังโหลด..." : "ยังไม่มีรายชื่อผู้ใช้"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ผลการประเมินรายบุคคล</h2>
            <p className="text-xs text-gray-500">แสดงผลเฉพาะผู้ใช้ที่เลือกจากตาราง</p>
          </div>
          {loadingEvaluations && <span className="text-sm text-blue-600 inline-flex items-center gap-1"><Loader2 className="animate-spin" size={16} /> กำลังโหลด...</span>}
        </div>
        {!selectedUser && <p className="text-sm text-gray-500">เลือกผู้ใช้จากตารางด้านบนเพื่อดูผลการประเมิน</p>}
        {selectedUser && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={resolveAvatarUrl(selectedUser.avatar || selectedUser.profileImage) || "https://via.placeholder.com/48"}
                alt={selectedUser.firstName || selectedUser.username || "user"}
                className="w-12 h-12 rounded-full object-cover border border-gray-200"
              />
              <div className="flex flex-col">
                <p className="text-base font-semibold text-gray-900">
                  {(selectedUser.firstName || "") + " " + (selectedUser.lastName || "") || selectedUser.username || userStats.person || "-"}
                </p>
                <p className="text-xs text-gray-500">
                  บทบาท {selectedUser.role || "-"} · หมวดวิชา {selectedUser.division || "-"}
                </p>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-blue-900">
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">
                  <p className="text-[11px] text-blue-600">จำนวนการประเมิน</p>
                  <p className="text-lg font-bold">{userStats.count}</p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">
                  <p className="text-[11px] text-blue-600">คะแนนเฉลี่ย</p>
                  <p className="text-lg font-bold">{formatScore(userStats.average)}</p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">
                  <p className="text-[11px] text-blue-600">อัปเดตล่าสุด</p>
                  <p className="text-sm font-semibold">
                    {userStats.lastDate ? formatDateTime(userStats.lastDate) : "-"}
                  </p>
                </div>
              </div>
            </div>
            {evalError && <p className="text-sm text-red-600">{evalError}</p>}
            {evaluationChartOption && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-2">กราฟผลการประเมินรายครั้ง</p>
                <ReactECharts option={evaluationChartOption} notMerge lazyUpdate style={{ height: 300, width: "100%" }} />
              </div>
            )}
            {!loadingEvaluations && evaluations.length === 0 && !evalError && (
              <p className="text-sm text-gray-500">ยังไม่มีผลการประเมินสำหรับผู้ใช้นี้</p>
            )}
            {!loadingEvaluations && evaluations.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 grid grid-cols-12 gap-2">
                  <span className="col-span-3">หัวข้อ</span>
                  <span className="col-span-3">รายละเอียดหัวข้อที่ประเมิน</span>
                  <span className="col-span-1 text-center">รอบ</span>
                  <span className="col-span-1 text-center">คะแนน</span>
                  <span className="col-span-2 text-center">วันที่</span>
                  <span className="col-span-2 text-center">จัดการ</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {evaluations.map((ev) => (
                    <div key={ev.id || ev._id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{ev.subject || "ประเมินราชการ"}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{ev.summary || ev.evaluatedPerson || "ไม่มีรายละเอียด"}</p>
                      </div>
                      <div className="col-span-3 text-xs text-gray-700 leading-relaxed">
                        <p className="line-clamp-2">{ev.summary || ev.evaluatedPerson || "รายละเอียดผลประเมิน"}</p>
                        <button
                          type="button"
                          onClick={() => setActiveEvaluation(ev)}
                          className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-[11px] font-semibold hover:bg-blue-50"
                        >
                          ดูรายละเอียดการประเมิน
                        </button>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                          {ev.evaluationRound || "-"}
                        </span>
                      </div>
                      <div className="col-span-1 text-center text-sm font-bold text-blue-800">
                        {formatScore(ev.overallScore)}
                      </div>
                      <div className="col-span-2 text-center text-xs text-gray-600">
                        {formatDateTime(ev.submittedAt || ev.updatedAt || ev.createdAt)}
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvaluation(ev);
                            const answerState = {};
                            getAnswerListFull(ev).forEach((a, idx) => {
                              const qid = ev.answers?.[idx]?.questionId || ev.answers?.[idx]?.question?.id || idx;
                              answerState[qid] = a.score;
                            });
                            setEditingAnswers(answerState);
                          }}
                        className="px-3 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold disabled:opacity-60"
                        >
                          แก้ไขคะแนน
                        </button>
                        <button
                          type="button"
                          disabled={deletingEvaluationId === (ev.id || ev._id)}
                          className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-semibold disabled:opacity-60"
                          onClick={() => {
                            Swal.fire({
                              icon: "warning",
                              title: "ลบผลการประเมินนี้?",
                              text: "การลบจะไม่สามารถกู้คืนได้",
                              showCancelButton: true,
                              confirmButtonText: "ลบ",
                              cancelButtonText: "ยกเลิก",
                              confirmButtonColor: "#dc2626",
                            }).then(async (result) => {
                              if (!result.isConfirmed) return;
                              setDeletingEvaluationId(ev.id || ev._id);
                              try {
                                const token = localStorage.getItem("token");
                                await axios.delete(`/api/student-evaluations/${ev.id || ev._id}`, {
                                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                                });
                                setEvaluations((prev) => prev.filter((item) => (item.id ?? item._id) !== (ev.id ?? ev._id)));
                                Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
                              } catch (error) {
                                Swal.fire({
                                  icon: "error",
                                  title: "ลบไม่สำเร็จ",
                                  text: error?.response?.data?.message || error?.message || "เกิดข้อผิดพลาด",
                                });
                              } finally {
                                setDeletingEvaluationId(null);
                              }
                            });
                          }}
                        >
                          ลบการประเมิน
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {(activeEvaluation || editingEvaluation) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 relative overflow-y-auto max-h-[85vh]">
            <button
              type="button"
              onClick={() => {
                setActiveEvaluation(null);
                setEditingEvaluation(null);
                setEditingAnswers({});
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
            <div className="flex flex-col gap-2 mb-4">
              <p className="text-sm text-blue-600 font-semibold">รายละเอียดการประเมิน</p>
              <h3 className="text-2xl font-semibold text-gray-900">{(editingEvaluation || activeEvaluation)?.subject || "ประเมินราชการ"}</h3>
              <p className="text-sm text-gray-600">
                รอบ: <span className="font-semibold">{(editingEvaluation || activeEvaluation)?.evaluationRound || "-"}</span> · คะแนนรวม{" "}
                <span className="font-semibold text-blue-800">{formatScore((editingEvaluation || activeEvaluation)?.overallScore)}</span> · วันที่{" "}
                {formatDateTime((editingEvaluation || activeEvaluation)?.submittedAt || (editingEvaluation || activeEvaluation)?.updatedAt || (editingEvaluation || activeEvaluation)?.createdAt)}
              </p>
              <p className="text-sm text-gray-500">
                ผู้ประเมิน: {(editingEvaluation || activeEvaluation)?.evaluatorName || (editingEvaluation || activeEvaluation)?.evaluator?.username || "-"}
              </p>
              <p className="text-sm text-gray-500">
                รายละเอียด: {(editingEvaluation || activeEvaluation)?.summary || (editingEvaluation || activeEvaluation)?.evaluatedPerson || "-"}
              </p>
            </div>
            <div className="border border-gray-100 rounded-xl">
              <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 flex justify-between items-center">
                <span>หัวข้อที่ถูกประเมิน</span>
                <span className="text-xs text-gray-500">คะแนน / คะแนนเต็ม</span>
              </div>
              <div className="divide-y divide-gray-100">
                {(editingEvaluation ? getAnswerListFull(editingEvaluation) : getAnswerListFull(activeEvaluation)).map((ans, idx) => {
                  const questionId = (editingEvaluation || activeEvaluation)?.answers?.[idx]?.questionId
                    || (editingEvaluation || activeEvaluation)?.answers?.[idx]?.question?.id
                    || idx;
                  const currentScore = editingEvaluation ? (editingAnswers[questionId] ?? ans.score) : ans.score;
                  return (
                    <div key={`${(editingEvaluation || activeEvaluation)?.id || (editingEvaluation || activeEvaluation)?._id}-detail-${idx}`} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-[11px] text-gray-400">{idx + 1}.</span>
                        <span className="text-gray-900">{ans.title}</span>
                      </div>
                      {editingEvaluation ? (
                        <input
                          type="number"
                          min="0"
                          max={ans.max}
                          value={currentScore}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingAnswers((prev) => ({ ...prev, [questionId]: val }));
                          }}
                          className="w-20 border rounded-lg px-2 py-1 text-right text-sm"
                        />
                      ) : (
                        <span className="font-semibold text-blue-800">{ans.score} / {ans.max}</span>
                      )}
                    </div>
                  );
                })}
                {(editingEvaluation ? getAnswerListFull(editingEvaluation) : getAnswerListFull(activeEvaluation)).length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">ไม่มีรายละเอียดหัวข้อ</div>
                )}
              </div>
            </div>
            {editingEvaluation && (
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEvaluation(null);
                    setEditingAnswers({});
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={savingEvaluation}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingEvaluation) return;
                    setSavingEvaluation(true);
                    try {
                      const answers = getAnswerListFull(editingEvaluation).map((ans, idx) => {
                        const qid = editingEvaluation.answers?.[idx]?.questionId || editingEvaluation.answers?.[idx]?.question?.id || idx;
                        const raw = editingAnswers[qid];
                        const score = raw === "" || raw == null ? ans.score : Number(raw);
                        return {
                          questionId: qid,
                          score,
                        };
                      });
                      const overallScore = answers.length
                        ? answers.reduce((sum, a) => sum + Number(a.score || 0), 0) / answers.length
                        : editingEvaluation.overallScore;
                      const token = localStorage.getItem("token");
                      const payload = {
                        templateId: editingEvaluation.templateId || editingEvaluation.template?._id || editingEvaluation.template?.id,
                        userId: getEvaluationUserId(editingEvaluation),
                        evaluatedPerson: editingEvaluation.evaluatedPerson,
                        evaluationRound: editingEvaluation.evaluationRound,
                        evaluationPeriod:
                          editingEvaluation.evaluationPeriod ||
                          editingEvaluation.submittedAt ||
                          editingEvaluation.updatedAt ||
                          editingEvaluation.createdAt,
                        subject: editingEvaluation.subject,
                        summary: editingEvaluation.summary,
                        companyCode: editingEvaluation.companyCode,
                        battalionCode: editingEvaluation.battalionCode,
                        evaluationInclude: editingEvaluation.evaluationInclude || [],
                        answers,
                        overallScore,
                      };
                      await axios.put(`/api/student-evaluations/${editingEvaluation.id || editingEvaluation._id}`, payload, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      setEvaluations((prev) =>
                        prev.map((item) =>
                          (item.id ?? item._id) === (editingEvaluation.id ?? editingEvaluation._id)
                            ? { ...item, ...payload }
                            : item
                        )
                      );
                      Swal.fire({ icon: "success", title: "บันทึกคะแนนสำเร็จ", timer: 1500, showConfirmButton: false });
                      setEditingEvaluation(null);
                      setEditingAnswers({});
                    } catch (error) {
                      Swal.fire({
                        icon: "error",
                        title: "บันทึกไม่สำเร็จ",
                        text: error?.response?.data?.message || error?.message || "เกิดข้อผิดพลาด",
                      });
                    } finally {
                      setSavingEvaluation(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                  disabled={savingEvaluation}
                >
                  {savingEvaluation ? "กำลังบันทึก..." : "บันทึกคะแนน"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
