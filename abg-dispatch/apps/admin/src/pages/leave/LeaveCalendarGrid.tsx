import { useNavigate } from "react-router-dom";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, LEAVE_TYPE_ORDER, type LeaveStatus, type LeaveType } from "@abg-dispatch/shared";
import { cx } from "../../components/ui";
import { LEAVE_TYPE_COLOR } from "./parts";
import type { CalendarLeave, LeaveCalendar } from "./types";

const DAY_MS = 86_400_000;
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** People down the side, the month's days across; each leave is a coloured run (pending ones hatched). */
export function LeaveCalendarGrid({ data, today }: { data: LeaveCalendar; today: string }) {
  const navigate = useNavigate();
  const days = eachDay(data.from, data.to);
  const holidays = new Map(data.holidays.map((h) => [h.date, h.name]));
  const weekend = new Set(data.weekendDays);
  const off = (d: string) => weekend.has(new Date(`${d}T00:00:00Z`).getUTCDay()) || holidays.has(d);
  const leaveOn = (leaves: CalendarLeave[], d: string) => leaves.find((l) => l.startDate <= d && l.endDate >= d);
  const typesShown = LEAVE_TYPE_ORDER.filter((t) => data.people.some((p) => p.leaves.some((l) => l.type === t)));

  if (!data.people.length) return null;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[180px] min-w-[180px] border-b border-line bg-white px-3 py-2 font-semibold text-ink-muted">Person</th>
              {days.map((d) => {
                const dt = new Date(`${d}T00:00:00Z`);
                return (
                  <th
                    key={d}
                    title={holidays.get(d) ?? undefined}
                    className={cx("w-7 min-w-[28px] border-b border-line px-0 py-1.5 text-center font-semibold", off(d) ? "bg-surface text-ink-subtle" : "text-ink-muted", d === today && "text-active")}
                  >
                    <span className="block text-[10px] font-medium">{WEEKDAY[dt.getUTCDay()]}</span>
                    <span className={cx("tabular mx-auto grid h-5 w-5 place-items-center rounded-full text-[11px]", d === today && "bg-active text-white")}>{dt.getUTCDate()}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.people.map((p) => (
              <tr key={p.userId}>
                <th scope="row" className="sticky left-0 z-10 border-b border-line bg-white px-3 py-1.5 font-normal">
                  <span className="block max-w-[164px] truncate text-[13px] font-semibold text-ink">{p.name}</span>
                  <span className="block max-w-[164px] truncate text-[11px] text-ink-subtle">{[p.designation, p.office].filter(Boolean).join(" · ")}</span>
                </th>
                {days.map((d) => {
                  const l = leaveOn(p.leaves, d);
                  const pending = l && l.status !== "APPROVED";
                  const label = l ? `${p.name}: ${LEAVE_TYPE_LABEL[l.type as LeaveType]}, ${LEAVE_STATUS_LABEL[l.status as LeaveStatus].toLowerCase()} (${l.referenceNumber})` : undefined;
                  return (
                    <td key={d} className={cx("border-b border-line p-0.5", off(d) && "bg-surface")}>
                      {l && !(off(d) && l.type !== "MATERNITY") ? (
                        <button
                          type="button"
                          title={label}
                          aria-label={label}
                          onClick={() => navigate(`/leave/${l.id}`)}
                          className={cx("block h-6 w-full rounded-[4px] transition hover:brightness-110", l.halfDay && "w-1/2")}
                          style={{
                            background: pending ? `repeating-linear-gradient(135deg, ${LEAVE_TYPE_COLOR[l.type]} 0 3px, ${LEAVE_TYPE_COLOR[l.type]}55 3px 6px)` : LEAVE_TYPE_COLOR[l.type],
                          }}
                        />
                      ) : (
                        <span className="block h-6" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-ink-muted">
        {typesShown.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: LEAVE_TYPE_COLOR[t] }} aria-hidden /> {LEAVE_TYPE_LABEL[t]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: "repeating-linear-gradient(135deg, #7a8496 0 2px, #7a849655 2px 4px)" }} aria-hidden /> Waiting for approval
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-surface ring-1 ring-line" aria-hidden /> Weekly or public holiday
        </span>
      </div>
    </div>
  );
}
