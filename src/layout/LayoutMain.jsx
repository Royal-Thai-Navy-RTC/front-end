import { Outlet } from 'react-router-dom'
import bg from "../assets/bg-sea.jpg"
import Nav from '../components/Nav'

export default function LayoutMain() {
  const user = JSON.parse(localStorage.getItem("user")) || { role: "guest" };

  return (
    <div className="relative min-h-screen flex flex-col">
      <img src={bg} className="absolute inset-0 w-full h-full object-cover -z-10" />
      <Nav user={user} />
      {/* ส่วนเนื้อหา */}
      <div className="flex flex-col flex-grow items-center p-2 px-5 mb-5">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="flex justify-center items-center bg-blue-900 bg-opacity-75 text-white font-bold">
        <p className="p-1 text-sm text-center h-full">
          © 2025 ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ
        </p>
      </div>
    </div>
  )
}
