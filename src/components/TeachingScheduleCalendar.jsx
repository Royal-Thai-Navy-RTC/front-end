import React, { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const palette = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#d946ef"];

const formatTeacher = (teacher) => {
  if (!teacher) return "";
  if (typeof teacher === "string") return teacher;
  if (typeof teacher === "object") {
    const name = `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
    return name || teacher.username || teacher.role || "";
  }
  return String(teacher);
};

export default function TeachingScheduleCalendar({ schedules = [] }) {
  const events = useMemo(
    () =>
      schedules.map((item, idx) => {
        const start =
          item.start ||
          item.date ||
          item.time ||
          item.beginDate ||
          item.beginTime ||
          new Date().toISOString();
        const end = item.end || item.finish || item.endTime || null;
        const color = item.color || palette[idx % palette.length];
        return {
          id: item.id || `event-${idx}`,
          title: item.title || item.subject || "ไม่ระบุวิชา",
          start,
          end,
          allDay: Boolean(item.allDay),
          color,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            teacher: formatTeacher(item.teacher),
            location: item.location || "-",
          },
        };
      }),
    [schedules]
  );

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      buttonText={{ today: "วันนี้" }}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "",
      }}
      locale="th"
      height="auto"
      events={events}
      eventContent={(arg) => (
        <div
          className="text-[11px] leading-tight rounded-sm px-1 py-0.5 text-white"
          style={{
            backgroundColor:
              arg.event.extendedProps.backgroundColor ||
              arg.event.backgroundColor ||
              arg.event.color ||
              "#2563eb",
            border: "none",
          }}
        >
          <p className="font-semibold">{arg.event.title}</p>
          {arg.event.extendedProps.teacher && <p className="opacity-90">{arg.event.extendedProps.teacher}</p>}
        </div>
      )}
      eventDidMount={(info) => {
        const color = info.event.extendedProps.backgroundColor || info.event.backgroundColor || info.event.color;
        if (color) {
          info.el.style.backgroundColor = color;
          info.el.style.borderColor = color;
          info.el.style.color = "#fff";
        }
      }}
    />
  );
}
