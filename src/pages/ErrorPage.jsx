import React from "react";
import { useRouteError, Link } from "react-router-dom";

const getStatusText = (status) => {
  if (status === 404) return "ไม่พบหน้าที่ร้องขอ";
  if (status === 401) return "ต้องเข้าสู่ระบบ";
  if (status === 500) return "เกิดข้อผิดพลาดภายในระบบ";
  return "เกิดข้อผิดพลาด";
};

export default function ErrorPage() {
  const error = useRouteError();
  const status = error?.status || error?.statusCode || 404;
  const message =
    error?.statusText ||
    error?.data ||
    error?.message ||
    "ขออภัย ไม่พบหน้าหรือเกิดข้อผิดพลาด ไม่สามารถแสดงข้อมูลได้ในขณะนี้";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white border border-gray-100 shadow-lg rounded-2xl p-8 space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-700 text-xl font-bold">
          {status || 404}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{getStatusText(status)}</h1>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            to="/home"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            กลับหน้าหลัก
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            ลองใหม่
          </button>
        </div>
        <p className="text-[11px] text-gray-400">ถ้ายังพบปัญหา โปรดติดต่อผู้ดูแลระบบ</p>
      </div>
    </div>
  );
}

