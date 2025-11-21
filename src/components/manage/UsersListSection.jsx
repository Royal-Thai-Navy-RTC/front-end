import React from "react";
import { Link } from "react-router-dom";
import { Pencil, Eye } from "lucide-react";
import navyFallback from "../../assets/navy.png";
import { ToggleSwitch } from "./ManageUsersShared";

export function UsersListSection({
  paginated,
  listLoading,
  listError,
  activeUsersLength,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onJumpPage,
  getPaginationNumbers,
  getRankLabel,
  getRoleBadgeClasses,
  getRoleLabel,
  handleOpenAvatarPreview,
  handleToggleStatus,
  openEditModal,
  actionUserId,
  resolveAvatarUrl,
}) {
  const renderDesktop = () => (
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100">
      <table className="min-w-full text-left text-gray-700 text-sm table-fixed">
        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
          <tr>
            <th className="p-3 text-center w-20">รูป</th>
            <th className="p-3 text-center w-28">ยศ</th>
            <th className="p-3 w-[220px]">ชื่อ - นามสกุล</th>
            <th className="p-3 w-32 text-center">ชื่อผู้ใช้</th>
            <th className="p-3 w-48">อีเมล</th>
            <th className="p-3 text-center w-32">บทบาท</th>
            <th className="p-3 text-center w-36">สถานะ</th>
            <th className="p-3 text-center w-40">การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {listLoading && (
            <tr>
              <td colSpan="8" className="text-center p-6 text-blue-600">
                กำลังโหลดข้อมูล...
              </td>
            </tr>
          )}
          {!listLoading && listError && (
            <tr>
              <td colSpan="8" className="text-center p-6 text-red-500">
                {listError}
              </td>
            </tr>
          )}
          {!listLoading &&
            !listError &&
            paginated.map((user) => {
              const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
              const rankLabel = getRankLabel(user.rank);
              const isActive = user.isActive ?? true;
              return (
                <tr key={user.id || user.username} className="border-t border-gray-100 hover:bg-blue-50/40 transition text-sm">
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenAvatarPreview(user)}
                      className="relative group mx-auto block rounded-full"
                      aria-label={`ดูรูปของ ${fullName}`}
                    >
                      <img
                        src={resolveAvatarUrl(user.avatar) || navyFallback}
                        alt={fullName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 transition group-hover:scale-105"
                      />
                      <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition">
                        ดูรูป
                      </span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {rankLabel || "-"}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold truncate">{fullName}</p>
                    <p className="text-[11px] text-gray-500">{user.department || "ไม่ระบุแผนก"}</p>
                  </td>
                  <td className="p-3 text-center break-all text-xs">{user.username || "-"}</td>
                  <td className="p-3">
                    <p className="text-xs break-all">{user.email || "-"}</p>
                  </td>
                  <td className="p-3 text-center">
                    <span className={getRoleBadgeClasses(user.role)}>{getRoleLabel(user.role)}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[11px] font-semibold ${isActive ? "text-emerald-600" : "text-red-500"}`}>
                        {isActive ? "เปิดใช้งานอยู่" : "ปิดการใช้งาน"}
                      </span>
                      <ToggleSwitch
                        isActive={isActive}
                        disabled={actionUserId === (user.id ?? user._id)}
                        onToggle={() => handleToggleStatus(user)}
                      />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center justify-center rounded-full border border-blue-200 text-blue-700 p-2 hover:bg-blue-50 transition"
                        aria-label="แก้ไข"
                      >
                        <Pencil size={16} />
                        <span className="sr-only">แก้ไข</span>
                      </button>
                      <Link
                        to={`/users/${user.id ?? user._id}`}
                        className="inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-700 p-2 hover:bg-gray-50 transition"
                        aria-label="ดูข้อมูล"
                      >
                        <Eye size={16} />
                        <span className="sr-only">ดูข้อมูล</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          {!listLoading && !listError && paginated.length === 0 && (
            <tr>
              <td colSpan="8" className="text-center p-6 text-gray-400">
                ไม่พบข้อมูลผู้ใช้
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderMobile = () => (
    <div className="md:hidden flex flex-col gap-3">
      {listLoading && <p className="text-center text-blue-600 py-4 text-sm font-medium">กำลังโหลดข้อมูล...</p>}
      {!listLoading && listError && <p className="text-center text-red-500 py-4 text-sm font-medium">{listError}</p>}
      {!listLoading &&
        !listError &&
        paginated.map((user) => {
          const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
          const rankLabel = getRankLabel(user.rank);
          const isActive = user.isActive ?? true;
          return (
            <article
              key={user.id || user.username}
              className="rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3"
            >
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => handleOpenAvatarPreview(user)}
                  className="relative group rounded-full"
                  aria-label={`ดูรูปของ ${fullName}`}
                >
                  <img
                    src={resolveAvatarUrl(user.avatar) || navyFallback}
                    alt={fullName}
                    className="w-14 h-14 rounded-full object-cover border border-gray-200"
                  />
                  <span className="absolute inset-0 rounded-full bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition">
                    ดูรูป
                  </span>
                </button>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{fullName}</p>
                  <p className="text-xs text-gray-500">
                    {rankLabel} · {user.department || "ไม่ระบุแผนก"}
                  </p>
                </div>
                <span className={getRoleBadgeClasses(user.role)}>{getRoleLabel(user.role)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <p className="font-semibold text-gray-500">Username</p>
                  <p className="text-gray-900">{user.username || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-500">อีเมล</p>
                  <p className="text-gray-900 break-all">{user.email || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-500">สถานะ</p>
                  <p className={isActive ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                    {isActive ? "เปิดใช้งานอยู่" : "ปิดการใช้งาน"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-500">เบอร์โทร</p>
                  <p className="text-gray-900">{user.phone || "-"}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition"
                    aria-label="แก้ไข"
                  >
                    <Pencil size={16} />
                    <span className="sr-only">แก้ไข</span>
                  </button>
                  <Link
                    to={`/users/${user.id ?? user._id}`}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                    aria-label="ดูข้อมูล"
                  >
                    <Eye size={16} />
                    <span className="sr-only">ดูข้อมูล</span>
                  </Link>
                </div>
                <ToggleSwitch
                  isActive={isActive}
                  disabled={actionUserId === (user.id ?? user._id)}
                  onToggle={() => handleToggleStatus(user)}
                />
              </div>
            </article>
          );
        })}
      {!listLoading && !listError && paginated.length === 0 && (
        <p className="text-center text-gray-400 py-4 text-sm">ไม่พบข้อมูลผู้ใช้</p>
      )}
    </div>
  );

  return (
    <section className="bg-white rounded-2xl p-5 shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-lg font-semibold text-gray-800">รายชื่อผู้ใช้</p>
          <p className="text-sm text-gray-500">
            แสดงผล {paginated.length} รายการจากทั้งหมด {activeUsersLength} รายการ
          </p>
        </div>
        <span className="text-sm text-gray-400">
          Page {page} / {totalPages}
        </span>
      </div>
      {renderDesktop()}
      {renderMobile()}
      <div className="flex flex-wrap justify-center sm:justify-between items-center mt-6 gap-2 text-sm">
        <button
          onClick={onPrevPage}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          ก่อนหน้า
        </button>
        <div className="flex items-center gap-2">
          {getPaginationNumbers().map((num, idx) =>
            num === "..." ? (
              <span key={`${num}-${idx}`} className="px-2 text-gray-500">
                ...
              </span>
            ) : (
              <button
                key={idx}
                onClick={() => onJumpPage(num)}
                className={`px-3 py-1 rounded-lg ${page === num ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                {num}
              </button>
            )
          )}
        </div>
        <button
          onClick={onNextPage}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          ถัดไป
        </button>
      </div>
    </section>
  );
}
