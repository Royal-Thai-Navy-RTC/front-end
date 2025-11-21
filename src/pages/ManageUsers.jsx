import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Users, RefreshCw, Search, UserPlus } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import navy from "../assets/navy.png";
import { SummaryCard, ToggleSwitch, ActiveFiltersBar } from "../components/manage/ManageUsersShared";
import { UsersListSection } from "../components/manage/UsersListSection";
import { SearchResultsSection } from "../components/manage/SearchResultsSection";

const ROLE_FILTERS = [
    { label: "ทั้งหมด", value: "ALL" },
    { label: "ผู้ดูแลระบบ", value: "ADMIN" },
    { label: "ครูผู้สอน", value: "TEACHER" },
    { label: "นักเรียน", value: "STUDENT" },
    { label: "หัวหน้าหมวดวิชา", value: "SUB_ADMIN" },
];

const ROLE_LABELS = {
    ADMIN: "ผู้ดูแลระบบ",
    OWNER: "ผู้บังคับบัญชา",
    SUB_ADMIN: "หัวหน้าหมวดวิชา",
    TEACHER: "ครูผู้สอน",
    STUDENT: "นักเรียน",
};

const ROLE_FILTER_LABELS = {
    ALL: "ทุกบทบาท",
    ...ROLE_LABELS,
};

const ROLE_BADGE_STYLES = {
    ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
    OWNER: "bg-amber-50 text-amber-700 border-amber-200",
    SUB_ADMIN: "bg-sky-50 text-sky-700 border-sky-200",
    TEACHER: "bg-emerald-50 text-emerald-700 border-emerald-200",
    STUDENT: "bg-blue-50 text-blue-700 border-blue-200",
};

const RANK_OPTIONS = [
    { value: "ADMIRAL", label: "พลเรือเอก" },
    { value: "VICE_ADMIRAL", label: "พลเรือโท" },
    { value: "REAR_ADMIRAL", label: "พลเรือตรี" },
    { value: "CAPTAIN", label: "นาวาเอก" },
    { value: "COMMANDER", label: "นาวาโท" },
    { value: "LIEUTENANT_COMMANDER", label: "นาวาตรี" },
    { value: "LIEUTENANT", label: "เรือเอก" },
    { value: "SUB_LIEUTENANT", label: "เรือโท" },
    { value: "ENSIGN", label: "เรือตรี" },
    { value: "PETTY_OFFICER_1", label: "พันจ่าเอก" },
    { value: "PETTY_OFFICER_2", label: "พันจ่าโท" },
    { value: "PETTY_OFFICER_3", label: "พันจ่าตรี" },
    { value: "PETTY_OFFICER", label: "จ่าเอก" },
    { value: "LEADING_RATING", label: "จ่าโท" },
    { value: "ABLE_SEAMAN", label: "จ่าตรี" },
    { value: "SEAMAN_RECRUIT", label: "พลฯ" },
];

const CREATE_USER_DEFAULT = {
    rank: "SEAMAN_RECRUIT",
    role: "STUDENT",
    firstName: "",
    lastName: "",
    username: "",
    birthDate: "",
    fullAddress: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    profileImage: "",
    password: "",
    confirmPassword: "",
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const resolveAvatarUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_BASE_URL}${path}`;
};

const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};

const getCurrentRole = (storedUser) => {
    const directRole = localStorage.getItem("role");
    return (storedUser?.role || directRole || "guest").toString().toUpperCase();
};

const extractUsers = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
};

const filterUsersForDisplay = (users = [], roleFilter = "ALL", currentUserId, currentUsername) => {
    const normalizedUsername = (currentUsername || "").toString().toLowerCase();
    return users.filter((user) => {
        const candidateId = user?.id ?? user?._id;
        const userRole = (user?.role || "").toString().toUpperCase();
        const username = (user?.username || "").toString().toLowerCase();
        const isSelf =
            (currentUserId != null && candidateId === currentUserId) ||
            (!!normalizedUsername && username === normalizedUsername);
        if (isSelf) return false;
        if (roleFilter !== "ALL" && userRole !== roleFilter) return false;
        return true;
    });
};

const formatDisplayValue = (value) => {
    if (value === null || value === undefined) return "-";
    const text = value.toString().trim();
    return text || "-";
};

const formatListValue = (value) => {
    if (!value) return "-";
    if (Array.isArray(value)) {
        return value.length ? value.join(", ") : "-";
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return "-";
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.length ? parsed.join(", ") : "-";
            }
        } catch {
            // ignore parse error and fall through
        }
        return trimmed;
    }
    return formatDisplayValue(value);
};

const getFullName = (user) => {
    const composed = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return composed || "-";
};

const getRoleLabel = (role) => {
    if (!role) return "-";
    const normalized = role.toString().toUpperCase();
    return ROLE_LABELS[normalized] || role;
};

const getRoleBadgeClasses = (role) => {
    const normalized = (role || "").toString().toUpperCase();
    const color = ROLE_BADGE_STYLES[normalized] || "bg-gray-50 text-gray-700 border-gray-200";
    return `px-3 py-1 rounded-full text-xs font-semibold border ${color}`;
};

export default function ManageUsers() {
    const { rankOptions = [], divisionOptions = [], religionOptions = [] } = useOutletContext?.() || {};
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [actionUserId, setActionUserId] = useState(null);
    const [editUserId, setEditUserId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [editOriginal, setEditOriginal] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState(CREATE_USER_DEFAULT);
    const [createAvatarPreview, setCreateAvatarPreview] = useState("");
    const [creatingUser, setCreatingUser] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [previewImage, setPreviewImage] = useState("");
    const [previewImageName, setPreviewImageName] = useState("");
    const pageSize = 10;
    const currentUser = getStoredUser();
    const currentUserId = currentUser?.id;
    const currentUsername = currentUser?.username;
    const currentRole = getCurrentRole(currentUser);
    const isAdmin = currentRole === "ADMIN" || currentRole === "OWNER";
    const createAvatarSrc = useMemo(() => {
        if (createAvatarPreview) return createAvatarPreview;
        const value = createForm.profileImage || "";
        if (!value) return "";
        if (value.startsWith("data:")) return value;
        return resolveAvatarUrl(value);
    }, [createAvatarPreview, createForm.profileImage]);
    const rankSelectOptions = rankOptions.length ? rankOptions : RANK_OPTIONS;
    const getRankLabel = useCallback(
        (rank) => {
            const normalized = (rank || "").toString();
            const match = rankSelectOptions.find(
                (option) => option.value === normalized || option.label === normalized
            );
            return match?.label || rank || "-";
        },
        [rankSelectOptions]
    );

    useEffect(() => {
        if (!isAdmin) return;

        const fetchUsers = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem("token");
                const params = roleFilter === "ALL" ? {} : { role: roleFilter };
                const response = await axios.get("/api/admin/users", {
                    params,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                setUsers(extractUsers(response.data));
            } catch (err) {
                const message = err.response?.data?.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้";
                setError(message);
                setUsers([]);
                Swal.fire({
                    title: "เกิดข้อผิดพลาด",
                    text: message,
                    icon: "error",
                });
            } finally {
                setLoading(false);
                setPage(1);
            }
        };

        fetchUsers();
    }, [roleFilter, reloadKey, isAdmin]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        if (!isAdmin) return;
        const keyword = debouncedSearch;
        if (!keyword) {
            setSearchResults([]);
            setSearchError("");
            setSearchLoading(false);
            return;
        }
        let active = true;
        const fetchSearch = async () => {
            setSearchLoading(true);
            setSearchError("");
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("/api/admin/users/personal-search", {
                    params: { q: keyword, limit: 50 },
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (!active) return;
                setSearchResults(extractUsers(response.data));
            } catch (err) {
                if (!active) return;
                const message = err.response?.data?.message || "ค้นหาผู้ใช้ไม่สำเร็จ";
                setSearchError(message);
                setSearchResults([]);
            } finally {
                // eslint-disable-next-line no-unsafe-finally
                if (!active) return;
                setSearchLoading(false);
            }
        };
        fetchSearch();
        return () => {
            active = false;
        };
    }, [debouncedSearch, isAdmin]);

    const filteredUsers = useMemo(
        () => filterUsersForDisplay(users, roleFilter, currentUserId, currentUsername),
        [users, roleFilter, currentUserId, currentUsername]
    );

    const filteredSearchResults = useMemo(
        () => filterUsersForDisplay(searchResults, roleFilter, currentUserId, currentUsername),
        [searchResults, roleFilter, currentUserId, currentUsername]
    );

    const handleClearSearch = useCallback(() => {
        setSearch("");
        setPage(1);
    }, []);

    const handleClearRoleFilter = useCallback(() => {
        setRoleFilter("ALL");
        setPage(1);
    }, []);

    const handleOpenAvatarPreview = useCallback((user) => {
        const targetName = getFullName(user);
        const imageSrc = resolveAvatarUrl(user.avatar) || navy;
        setPreviewImage(imageSrc);
        setPreviewImageName(targetName);
    }, []);

    const handleCloseAvatarPreview = useCallback(() => {
        setPreviewImage("");
        setPreviewImageName("");
    }, []);

    const isSearchMode = Boolean(debouncedSearch);
    const activeUsers = isSearchMode ? filteredSearchResults : filteredUsers;
    const listLoading = isSearchMode ? searchLoading : loading;
    const listError = isSearchMode ? searchError : error;

    const totalPages = Math.max(1, Math.ceil(activeUsers.length / pageSize));
    const paginated = activeUsers.slice((page - 1) * pageSize, page * pageSize);

    const stats = useMemo(() => {
        return users.reduce(
            (acc, user) => {
                const role = (user.role || "").toUpperCase();
                if (role === "ADMIN") acc.admin += 1;
                else if (role === "SUB_ADMIN") acc.subAdmin += 1;
                else if (role === "TEACHER") acc.teacher += 1;
                else if (role === "STUDENT") acc.student += 1;
                else acc.others += 1;
                acc.total += 1;
                return acc;
            },
            { total: 0, admin: 0, teacher: 0, subAdmin: 0, student: 0, others: 0 }
        );
    }, [users]);

    const getPaginationNumbers = () => {
        if (totalPages <= 1) return [1];

        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (
            let i = Math.max(2, page - delta);
            i <= Math.min(totalPages - 1, page + delta);
            i++
        ) {
            range.push(i);
        }

        if (page - delta > 2) rangeWithDots.push("...");
        rangeWithDots.push(...range);
        if (page + delta < totalPages - 1) rangeWithDots.push("...");

        return [1, ...rangeWithDots, totalPages];
    };

    const handleToggleStatus = async (user) => {
        const userId = user?.id ?? user?._id;
        if (!userId) return;
        const isActive = user.isActive ?? true;
        const token = localStorage.getItem("token");
        const url = isActive
            ? `/api/admin/users/deactivate/${userId}`
            : `/api/admin/users/activate/${userId}`;
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const confirmResult = await Swal.fire({
            icon: "warning",
            title: isActive ? "ต้องการปิดการใช้งานผู้ใช้นี้?" : "ต้องการเปิดใช้งานผู้ใช้นี้?",
            text: isActive
                ? "ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง"
                : "ผู้ใช้จะกลับมาเข้าสู่ระบบได้ตามปกติ",
            showCancelButton: true,
            confirmButtonText: isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: isActive ? "#dc2626" : "#059669",
        });

        if (!confirmResult.isConfirmed) return;

        setActionUserId(userId);
        try {
            if (isActive) {
                await axios.delete(url, config);
            } else {
                await axios.patch(url, {}, config);
            }
            setUsers((prev) =>
                prev.map((item) =>
                    (item.id ?? item._id) === userId ? { ...item, isActive: !isActive } : item
                )
            );
            Swal.fire({
                icon: "success",
                title: isActive ? "ปิดการใช้งานสำเร็จ" : "เปิดการใช้งานสำเร็จ",
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถอัปเดตสถานะผู้ใช้ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setActionUserId(null);
        }
    };

const normalizeTextList = (value) => {
    if (!value) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "string") return value;
    return String(value);
};

const mapUserToForm = (data = {}) => ({
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    username: data.username || "",
    email: data.email || "",
    phone: data.phone || "",
    rank: data.rank || "",
    division: data.division || "",
    role: (data.role || "STUDENT").toUpperCase(),
    isActive: data.isActive ?? true,
    birthDate: data.birthDate || "",
    education: data.education || "",
    position: data.position || "",
    religion: data.religion || "",
    fullAddress: data.fullAddress || "",
    emergencyContactName: data.emergencyContactName || "",
    emergencyContactPhone: data.emergencyContactPhone || "",
    medicalHistory: data.medicalHistory || "",
    chronicDiseases: normalizeTextList(data.chronicDiseases),
    drugAllergies: normalizeTextList(data.drugAllergies),
    foodAllergies: normalizeTextList(data.foodAllergies),
    specialSkills: data.specialSkills || "",
    secondaryOccupation: data.secondaryOccupation || "",
    notes: data.notes || "",
    avatar: data.avatar || "",
    password: "",
});

    const openEditModal = async (user) => {
        const userId = user?.id ?? user?._id;
        if (!userId) return;
        setEditUserId(userId);
        setEditLoading(true);
        const initialForm = mapUserToForm(user);
        setEditForm(initialForm);
        setEditOriginal(initialForm);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/admin/users/${userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const payload = response.data?.data ?? response.data;
            if (payload) {
                const mapped = mapUserToForm(payload);
                setEditForm(mapped);
                setEditOriginal(mapped);
            }
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถโหลดข้อมูลผู้ใช้ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setEditLoading(false);
        }
    };

    const closeEditModal = () => {
        setEditUserId(null);
        setEditForm(null);
        setEditOriginal(null);
        setEditLoading(false);
        setSaving(false);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditToggleActive = () => {
        setEditForm((prev) => ({ ...prev, isActive: !prev.isActive }));
    };

    const handleSaveEdit = async () => {
        if (!editUserId || !editForm) return;
        const payload = {};
        const keysToCompare = [
            "firstName",
            "lastName",
            "username",
            "email",
            "phone",
            "rank",
            "division",
            "role",
            "isActive",
            "fullAddress",
            "birthDate",
            "education",
            "position",
            "religion",
            "emergencyContactName",
            "emergencyContactPhone",
            "medicalHistory",
            "chronicDiseases",
            "drugAllergies",
            "foodAllergies",
            "specialSkills",
            "secondaryOccupation",
            "notes",
        ];

        keysToCompare.forEach((key) => {
            if (!editOriginal || editForm[key] !== editOriginal[key]) {
                if (key === "birthDate" && editForm[key]) {
                    const iso = new Date(editForm[key]).toISOString();
                    payload[key] = iso;
                } else {
                    payload[key] = editForm[key];
                }
            }
        });

        if (editForm.password) {
            payload.password = editForm.password;
        }

        if (Object.keys(payload).length === 0) {
            Swal.fire({
                icon: "info",
                title: "ไม่มีการเปลี่ยนแปลง",
                text: "กรุณาแก้ไขข้อมูลก่อนบันทึก",
            });
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.put(`/api/admin/users/${editUserId}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const updatedUser = response.data?.data ?? response.data ?? payload;

            setUsers((prev) =>
                prev.map((user) =>
                    (user.id ?? user._id) === editUserId ? { ...user, ...updatedUser } : user
                )
            );

            Swal.fire({
                icon: "success",
                title: "บันทึกข้อมูลสำเร็จ",
                timer: 1500,
                showConfirmButton: false,
            });
            closeEditModal();
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !editUserId) return;

        const formData = new FormData();
        formData.append("avatar", file);

        setUploadingAvatar(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`/api/admin/users/${editUserId}/avatar`, formData, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    "Content-Type": "multipart/form-data",
                },
            });

            const updatedUser = response.data?.data ?? response.data;

            setUsers((prev) =>
                prev.map((user) =>
                    (user.id ?? user._id) === editUserId ? { ...user, ...updatedUser } : user
                )
            );
            setEditForm((prev) => (prev ? { ...prev, avatar: updatedUser.avatar || prev.avatar || "" } : prev));
            setEditOriginal((prev) => (prev ? { ...prev, avatar: updatedUser.avatar || prev.avatar || "" } : prev));

            Swal.fire({
                icon: "success",
                title: "อัปโหลดรูปโปรไฟล์สำเร็จ",
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setUploadingAvatar(false);
            event.target.value = "";
        }
    };

    const resetCreateForm = () => {
        setCreateForm(CREATE_USER_DEFAULT);
        setCreateAvatarPreview("");
    };

    const openCreateModal = () => {
        resetCreateForm();
        setCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (creatingUser) return;
        setCreateModalOpen(false);
        resetCreateForm();
    };

    const handleCreateChange = (event) => {
        const { name, value } = event.target;
        setCreateForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateAvatarChange = (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;

        if (file.size > MAX_AVATAR_FILE_SIZE) {
            Swal.fire({
                icon: "warning",
                title: "ไฟล์รูปภาพใหญ่เกินไป",
                text: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB",
            });
            input.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result?.toString() ?? "";
            setCreateForm((prev) => ({ ...prev, profileImage: base64 }));
            setCreateAvatarPreview(base64);
            input.value = "";
        };
        reader.readAsDataURL(file);
    };

    const handleClearCreateAvatar = () => {
        setCreateForm((prev) => ({ ...prev, profileImage: "" }));
        setCreateAvatarPreview("");
    };

    const handleCreateSubmit = async () => {
        const requiredFields = [
            "firstName",
            "lastName",
            "username",
            "birthDate",
            "fullAddress",
            "email",
            "phone",
            "emergencyContactName",
            "emergencyContactPhone",
            "password",
            "confirmPassword",
        ];

        const missing = requiredFields.filter((field) => !`${createForm[field] ?? ""}`.trim());
        if (missing.length) {
            Swal.fire({
                icon: "warning",
                title: "กรุณากรอกข้อมูลให้ครบ",
                text: "โปรดตรวจสอบข้อมูลให้ครบทุกช่องที่จำเป็น",
            });
            return;
        }

        if (createForm.password !== createForm.confirmPassword) {
            Swal.fire({
                icon: "warning",
                title: "รหัสผ่านไม่ตรงกัน",
                text: "กรุณายืนยันรหัสผ่านให้ตรงกัน",
            });
            return;
        }

        const payload = {
            rank: createForm.rank,
            firstName: createForm.firstName,
            lastName: createForm.lastName,
            username: createForm.username,
            birthDate: createForm.birthDate,
            fullAddress: createForm.fullAddress,
            email: createForm.email,
            phone: createForm.phone,
            emergencyContactName: createForm.emergencyContactName,
            emergencyContactPhone: createForm.emergencyContactPhone,
            password: createForm.password,
        };

        if (!payload.rank) {
            delete payload.rank;
        }

        if (createForm.role) {
            payload.role = createForm.role.toUpperCase();
        }

        if (createForm.profileImage) {
            payload.profileImage = createForm.profileImage;
        }

        setCreatingUser(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/admin/users", payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            Swal.fire({
                icon: "success",
                title: "สร้างผู้ใช้สำเร็จ",
                timer: 1600,
                showConfirmButton: false,
            });
            setReloadKey((prev) => prev + 1);
            setCreateModalOpen(false);
            resetCreateForm();
        } catch (err) {
            const message = err.response?.data?.message || "ไม่สามารถสร้างผู้ใช้ได้";
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message,
            });
        } finally {
            setCreatingUser(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-md w-full text-center">
                <h2 className="text-2xl font-semibold text-red-600 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
                <p className="text-gray-600">หน้าจัดการผู้ใช้สามารถเปิดได้เฉพาะผู้ดูแลระบบเท่านั้น</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">
            <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500">ระบบจัดการผู้ใช้</p>
                        <h1 className="text-3xl font-bold text-blue-900">Admin Control Center</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-blue-900">
                            <Users />
                            <span className="text-sm">อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")}</span>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow"
                            >
                                <UserPlus size={16} />
                                สร้างผู้ใช้ใหม่
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-gray-600 text-sm">
                    จัดการผู้ใช้ทุกบทบาทด้วยเครื่องมือค้นหาและตรวจสอบสถานะอย่างมืออาชีพ พร้อมข้อมูลสถิติที่อัปเดตแบบเรียลไทม์
                </p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard label="ผู้ใช้ทั้งหมด" value={stats.total} accent="from-blue-500 to-blue-700" />
                <SummaryCard label="ผู้ดูแลระบบ" value={stats.admin} accent="from-purple-500 to-purple-700" />
                <SummaryCard label="ครูผู้สอน" value={stats.teacher} accent="from-green-500 to-emerald-600" />
                <SummaryCard label="หัวหน้าหมวดวิชา" value={stats.subAdmin} accent="from-cyan-500 to-sky-600" />
                <SummaryCard label="นักเรียน" value={stats.student} accent="from-amber-500 to-yellow-500" />
            </section>

            <section className="bg-white rounded-2xl shadow px-4 py-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-base font-semibold text-gray-800">ค้นหาและกรองผู้ใช้</p>
                        <p className="text-xs text-gray-500">เลือกบทบาทและระบุคำค้นเพื่อดูรายการที่ตรงที่สุด</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-400" />
                            บทบาท
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-400" />
                            คำค้น
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 md:flex-row">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="border rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                        >
                            {ROLE_FILTERS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <div className="flex items-center border rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-blue-200 transition w-full">
                            <Search className="text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, Username, เบอร์โทร..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="px-2 py-2 flex-1 text-sm focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleClearSearch}
                            className="px-3 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition"
                        >
                            ล้าง
                        </button>
                        <button
                            onClick={() => setReloadKey((prev) => prev + 1)}
                            disabled={loading}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition"
                        >
                            <RefreshCw size={16} />
                            รีเฟรชข้อมูล
                        </button>
                    </div>
                </div>
                <ActiveFiltersBar
                    roleFilter={roleFilter}
                    roleLabel={ROLE_FILTER_LABELS[roleFilter] || roleFilter}
                    searchValue={debouncedSearch}
                    onClearRoleFilter={handleClearRoleFilter}
                    onClearSearch={handleClearSearch}
                />
            </section>

            {isSearchMode && (
                <SearchResultsSection
                    filteredSearchResults={filteredSearchResults}
                    listLoading={listLoading}
                    listError={listError}
                    debouncedSearch={debouncedSearch}
                    getRankLabel={getRankLabel}
                    getRoleLabel={getRoleLabel}
                    formatDisplayValue={formatDisplayValue}
                    formatListValue={formatListValue}
                />
            )}

            <UsersListSection
                paginated={paginated}
                listLoading={listLoading}
                listError={listError}
                activeUsersLength={activeUsers.length}
                page={page}
                totalPages={totalPages}
                onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
                onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                onJumpPage={(num) => setPage(num)}
                getPaginationNumbers={getPaginationNumbers}
                getRankLabel={getRankLabel}
                getRoleBadgeClasses={getRoleBadgeClasses}
                getRoleLabel={getRoleLabel}
                handleOpenAvatarPreview={handleOpenAvatarPreview}
                handleToggleStatus={handleToggleStatus}
                openEditModal={openEditModal}
                actionUserId={actionUserId}
                resolveAvatarUrl={resolveAvatarUrl}
            />
            {createModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-sm text-blue-500 font-semibold">สร้างผู้ใช้ใหม่</p>
                                <h3 className="text-2xl font-semibold text-gray-900">บันทึกข้อมูลกำลังพล</h3>
                                <p className="text-sm text-gray-500">ข้อมูลที่ครบถ้วนช่วยให้ระบบจัดการสิทธิ์ได้อย่างแม่นยำ</p>
                            </div>
                            <button
                                onClick={closeCreateModal}
                                disabled={creatingUser}
                                className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 p-2 disabled:opacity-60"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid lg:grid-cols-[260px,1fr] gap-6">
                            <div className="flex flex-col items-center gap-4 border border-gray-100 rounded-2xl p-4">
                                {createAvatarSrc ? (
                                    <img
                                        src={createAvatarSrc}
                                        alt="profile preview"
                                        className="w-32 h-32 rounded-full object-cover border border-gray-200"
                                        onError={() => handleClearCreateAvatar()}
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                                        รูปโปรไฟล์
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-200 transition">
                                        {createAvatarSrc ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleCreateAvatarChange}
                                            disabled={creatingUser}
                                        />
                                    </label>
                                    {createAvatarSrc && (
                                        <button
                                            type="button"
                                            onClick={handleClearCreateAvatar}
                                            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                                            disabled={creatingUser}
                                        >
                                            ลบรูปภาพ
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 text-center px-2">รองรับไฟล์ภาพ .jpg .jpeg .png ขนาดไม่เกิน 2MB</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ยศ</span>
                                        <select
                                            name="rank"
                                            value={createForm.rank}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="">-- เลือกยศ --</option>
                                            {rankSelectOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>บทบาท</span>
                                        <select
                                            name="role"
                                            value={createForm.role}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="TEACHER">TEACHER</option>
                                            <option value="STUDENT">STUDENT</option>
                                            <option value="SUB_ADMIN">SUB_ADMIN</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ชื่อ</span>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={createForm.firstName}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>นามสกุล</span>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={createForm.lastName}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>Username</span>
                                        <input
                                            type="text"
                                            name="username"
                                            value={createForm.username}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>วันเดือนปีเกิด</span>
                                        <input
                                            type="date"
                                            name="birthDate"
                                            value={createForm.birthDate}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>อีเมล</span>
                                        <input
                                            type="email"
                                            name="email"
                                            value={createForm.email}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>เบอร์โทรศัพท์</span>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={createForm.phone}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ที่อยู่</span>
                                    <textarea
                                        name="fullAddress"
                                        value={createForm.fullAddress}
                                        onChange={handleCreateChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-20"
                                    />
                                </label>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ผู้ติดต่อฉุกเฉิน</span>
                                        <input
                                            type="text"
                                            name="emergencyContactName"
                                            value={createForm.emergencyContactName}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>เบอร์ติดต่อฉุกเฉิน</span>
                                        <input
                                            type="text"
                                            name="emergencyContactPhone"
                                            value={createForm.emergencyContactPhone}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>รหัสผ่าน</span>
                                        <input
                                            type="password"
                                            name="password"
                                            value={createForm.password}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        <span>ยืนยันรหัสผ่าน</span>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={createForm.confirmPassword}
                                            onChange={handleCreateChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeCreateModal}
                                disabled={creatingUser}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={creatingUser}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                                {creatingUser ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {editForm && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-blue-500 font-semibold">แก้ไขข้อมูลผู้ใช้</p>
                                <h3 className="text-2xl font-semibold text-gray-900">
                                    {editForm.firstName || editForm.lastName
                                        ? `${editForm.firstName} ${editForm.lastName}`
                                        : editForm.username}
                                </h3>
                                <p className="text-xs text-gray-500">Username: {editForm.username || "-"}</p>
                            </div>
                            <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-700 text-xl font-semibold">
                                ✕
                            </button>
                        </div>

                        {editLoading ? (
                            <div className="text-center py-10 text-blue-600 font-semibold">กำลังโหลดข้อมูล...</div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex flex-col items-center gap-3 sm:col-span-2">
                                    <img
                                        src={resolveAvatarUrl(editForm.avatar) || navy}
                                        alt="avatar preview"
                                        className="w-32 h-32 rounded-full object-cover border border-gray-200 shadow"
                                    />
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-200 transition">
                                        {uploadingAvatar ? "กำลังอัปโหลด..." : "เปลี่ยนรูปโปรไฟล์"}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                                    </label>
                                </div>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ชื่อผู้ใช้ (Username)</span>
                                    <input
                                        type="text"
                                        name="username"
                                        value={editForm.username}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>บทบาท</span>
                                    <select
                                        name="role"
                                        value={editForm.role}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="TEACHER">TEACHER</option>
                                        <option value="STUDENT">STUDENT</option>
                                        <option value="SUB_ADMIN">SUB_ADMIN</option>
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ชื่อ</span>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={editForm.firstName}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>นามสกุล</span>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={editForm.lastName}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ยศ / ตำแหน่ง</span>
                                    <select
                                        name="rank"
                                        value={editForm.rank}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="">-- เลือกยศ --</option>
                                        {rankSelectOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>หมวดวิชา</span>
                                    {divisionOptions.length ? (
                                        <select
                                            name="division"
                                            value={editForm.division}
                                            onChange={handleEditChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="">-- เลือกหมวดวิชา --</option>
                                            {divisionOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            name="division"
                                            value={editForm.division}
                                            onChange={handleEditChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    )}
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>วันเกิด</span>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={editForm.birthDate ? editForm.birthDate.split("T")[0] : ""}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>การศึกษา</span>
                                    <input
                                        type="text"
                                        name="education"
                                        value={editForm.education}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ตำแหน่ง / หน้าที่</span>
                                    <input
                                        type="text"
                                        name="position"
                                        value={editForm.position}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ศาสนา</span>
                                    {religionOptions.length ? (
                                        <select
                                            name="religion"
                                            value={editForm.religion}
                                            onChange={handleEditChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="">-- เลือกศาสนา --</option>
                                            {religionOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            name="religion"
                                            value={editForm.religion}
                                            onChange={handleEditChange}
                                            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    )}
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>อีเมล</span>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editForm.email}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>เบอร์โทรศัพท์</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={editForm.phone}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>ที่อยู่</span>
                                    <textarea
                                        name="fullAddress"
                                        value={editForm.fullAddress}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-24"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>ผู้ติดต่อฉุกเฉิน</span>
                                    <input
                                        type="text"
                                        name="emergencyContactName"
                                        value={editForm.emergencyContactName}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    <span>เบอร์ผู้ติดต่อฉุกเฉิน</span>
                                    <input
                                        type="text"
                                        name="emergencyContactPhone"
                                        value={editForm.emergencyContactPhone}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>ประวัติสุขภาพเพิ่มเติม</span>
                                    <textarea
                                        name="medicalHistory"
                                        value={editForm.medicalHistory}
                                        onChange={handleEditChange}
                                        rows={3}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>โรคประจำตัว</span>
                                    <input
                                        name="chronicDiseases"
                                        value={editForm.chronicDiseases}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>แพ้ยา</span>
                                    <input
                                        name="drugAllergies"
                                        value={editForm.drugAllergies}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>แพ้อาหาร</span>
                                    <input
                                        name="foodAllergies"
                                        value={editForm.foodAllergies}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>ทักษะพิเศษ</span>
                                    <input
                                        name="specialSkills"
                                        value={editForm.specialSkills}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        placeholder="ระบุ เช่น ว่ายน้ำ, ภาษาอังกฤษ"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>อาชีพเสริม</span>
                                    <input
                                        name="secondaryOccupation"
                                        value={editForm.secondaryOccupation}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        placeholder="เช่น ช่างภาพ, นักเขียน"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>หมายเหตุ</span>
                                    <textarea
                                        name="notes"
                                        value={editForm.notes}
                                        onChange={handleEditChange}
                                        rows={3}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                                    <span>รีเซ็ตรหัสผ่าน (เว้นว่างหากไม่ต้องการเปลี่ยน)</span>
                                    <input
                                        type="password"
                                        name="password"
                                        value={editForm.password}
                                        onChange={handleEditChange}
                                        className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <div className="flex flex-col gap-2 text-sm">
                                    <span>สถานะการใช้งาน</span>
                                    <div className="flex items-center gap-3">
                                        <ToggleSwitch isActive={editForm.isActive} disabled={false} onToggle={handleEditToggleActive} />
                                        <span className={`text-sm font-semibold ${editForm.isActive ? "text-emerald-600" : "text-red-500"}`}>
                                            {editForm.isActive ? "เปิดใช้งาน" : "ปิดการใช้งาน"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50"
                                disabled={saving}
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving || editLoading}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={handleCloseAvatarPreview}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl p-4 flex flex-col items-center gap-4 max-w-lg w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img src={previewImage} alt={previewImageName} className="w-full rounded-xl object-contain" />
                        <p className="text-sm text-gray-600">{previewImageName || "รูปผู้ใช้"}</p>
                        <button
                            type="button"
                            onClick={handleCloseAvatarPreview}
                            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                        >
                            ปิดภาพ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}