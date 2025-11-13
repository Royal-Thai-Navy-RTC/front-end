import { useState, createContext, useContext, useEffect } from "react"
import { CgProfile } from "react-icons/cg";
import { MdArrowForwardIos, MdArrowBackIosNew } from "react-icons/md";
import { Link } from "react-router-dom";
import { IoLogOut } from "react-icons/io5";

const SidebarContext = createContext();

export default function Sidebar({ children, payload }) {
  const [expanded, setExpanded] = useState(window.innerWidth >= 1200);
  const { userName, userEmail, userRole } = payload;
  useEffect(() => {
    const handleResize = () => {
      setExpanded(window.innerWidth >= 1200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <aside className={`${(window.innerWidth <= 1200) && expanded ? "absolute z-10 h-full" : "relative flex"}`}>
      <nav className="h-full flex flex-col bg-slate-800 border-r border-slate-900 text-gray-100">
        <div className={`p-4 pb-2 flex justify-between items-center border-b border-slate-900 transition-all `}>
          <div className={`flex items-center gap-x-3 ${expanded ? "w-full" : "w-0 hidden"}`}>
            <CgProfile size={40} className="text-green-500" />
            <div className="leading-4 flex flex-col gap-y-1">
              <p className="font-bold text-lg">{userName}</p>
              <div className="flex gap-2">
                <p className="text-sm font-bold capitalize text-yellow-500">Role : {userRole}</p>
                <p className="font-bold">UAT</p>
              </div>
            </div>
          </div>
          <button onClick={() => setExpanded((curr) => !curr)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-600">
            {expanded ? <MdArrowBackIosNew size={26} /> : <MdArrowForwardIos size={26} />}
          </button>
        </div>
        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3 mt-3"> {children} </ul>
        </SidebarContext.Provider>
      </nav>
    </aside>
  )
}

export function SidebarItem({ path, icon, text, active, alert, onClick }) {
  const { expanded } = useContext(SidebarContext);

  return (
    <>
      <Link onClick={onClick} to={path} className={`relative flex items-center py-2 px-3 my-1 font-medium rounded cursor-pointer transition-colors group 
    ${active ? "bg-gradient-to-r from-slate-700 to-slate-700 " : "hover:bg-slate-700"}`}>
        {icon}
        <span className={`overflow-hidden transition-all ${expanded ? "w-40 ml-3" : "w-0"}`}>{text}</span>
      </Link>
    </>
  )
}
