import React from "react";

export const SummaryCard = ({ label, value, accent }) => (
  <div className={`rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${accent}`}>
    <p className="text-sm text-white/80">{label}</p>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

export const ToggleSwitch = ({ isActive, disabled, onToggle }) => (
  <label className={`relative inline-flex items-center cursor-pointer ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
    <input type="checkbox" className="sr-only peer" checked={isActive} disabled={disabled} onChange={onToggle} />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 transition-colors"></div>
    <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-5" : ""}`}></div>
  </label>
);

export const SearchDetailField = ({ label, value }) => (
  <div className="flex flex-col gap-1 text-sm">
    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
    <span className="text-gray-900">{value}</span>
  </div>
);

export const ActiveFiltersBar = ({
  roleFilter,
  roleLabel,
  divisionFilter,
  divisionLabel,
  searchValue,
  onClearRoleFilter,
  onClearDivisionFilter,
  onClearSearch,
}) => {
  const hasRoleFilter = roleFilter !== "ALL";
  const hasDivisionFilter = divisionFilter && divisionFilter !== "ALL";
  const hasSearch = Boolean(searchValue);
  if (!hasRoleFilter && !hasDivisionFilter && !hasSearch) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ตัวกรองที่ใช้งาน</span>
      {hasRoleFilter && (
        <button
          type="button"
          onClick={onClearRoleFilter}
          className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
        >
          บทบาท: {roleLabel || roleFilter}
        </button>
      )}
      {hasDivisionFilter && (
        <button
          type="button"
          onClick={onClearDivisionFilter}
          className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition"
        >
          Division: {divisionLabel || divisionFilter}
        </button>
      )}
      {hasSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
        >
          คำค้นหา: "{searchValue}"
        </button>
      )}
    </div>
  );
};
