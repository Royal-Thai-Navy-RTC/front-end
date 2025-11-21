import React from "react";
import { SearchDetailField } from "./ManageUsersShared";

export function SearchResultsSection({
  filteredSearchResults,
  listLoading,
  listError,
  debouncedSearch,
  getRankLabel,
  getRoleLabel,
  formatDisplayValue,
  formatListValue,
}) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-gray-800">ผลการค้นหาข้อมูลผู้ใช้</p>
        <p className="text-sm text-gray-500">
          พบ {filteredSearchResults.length} รายการที่เกี่ยวข้องกับคำค้น "{debouncedSearch}"
        </p>
      </div>
      {listLoading ? (
        <p className="text-sm text-blue-600">กำลังค้นหาข้อมูล...</p>
      ) : listError ? (
        <p className="text-sm text-red-500">{listError}</p>
      ) : filteredSearchResults.length === 0 ? (
        <p className="text-sm text-gray-500">ไม่พบข้อมูลที่ตรงกับคำค้น</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredSearchResults.map((user) => {
            const rankLabel = getRankLabel(user.rank);
            const emergencyContactDisplay = user.emergencyContactName
              ? `${formatDisplayValue(user.emergencyContactName)} (${formatDisplayValue(user.emergencyContactPhone)})`
              : formatDisplayValue(user.emergencyContactPhone);
            return (
              <article key={user.id ?? user._id} className="border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDisplayValue(user.firstName)} {formatDisplayValue(user.lastName)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {rankLabel} · {formatDisplayValue(user.position || getRoleLabel(user.role))}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-50 text-gray-700">
                    {formatDisplayValue(user.username)}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-3">
                    <SearchDetailField label="ชื่อ" value={formatDisplayValue(user.firstName)} />
                    <SearchDetailField label="นามสกุล" value={formatDisplayValue(user.lastName)} />
                    <SearchDetailField label="ที่อยู่" value={formatDisplayValue(user.fullAddress)} />
                    <SearchDetailField label="การศึกษา" value={formatDisplayValue(user.education)} />
                    <SearchDetailField label="ตำแหน่ง/หน้าที่" value={formatDisplayValue(user.position || getRoleLabel(user.role))} />
                  </div>
                  <div className="grid gap-3">
                    <SearchDetailField label="ประวัติสุขภาพ" value={formatDisplayValue(user.medicalHistory)} />
                    <SearchDetailField label="ศาสนา" value={formatDisplayValue(user.religion)} />
                    <SearchDetailField label="ทักษะพิเศษ" value={formatDisplayValue(user.specialSkills)} />
                    <SearchDetailField label="อาชีพเสริม" value={formatDisplayValue(user.secondaryOccupation)} />
                    <SearchDetailField label="ผู้ติดต่อฉุกเฉิน" value={emergencyContactDisplay} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <SearchDetailField label="อีเมล" value={formatDisplayValue(user.email)} />
                  <SearchDetailField label="โทรศัพท์" value={formatDisplayValue(user.phone)} />
                  <SearchDetailField label="โรคประจำตัว" value={formatListValue(user.chronicDiseases)} />
                  <SearchDetailField label="แพ้ยา" value={formatListValue(user.drugAllergies)} />
                  <SearchDetailField label="แพ้อาหาร" value={formatListValue(user.foodAllergies)} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
