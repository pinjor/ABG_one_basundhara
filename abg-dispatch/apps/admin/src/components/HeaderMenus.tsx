import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CalendarClock, CarFront, CheckCheck, ChevronDown, ClipboardCheck, FileBadge, IdCard, Newspaper, Palmtree, Plane, Plus, type LucideIcon } from "lucide-react";
import { Capability } from "@abg-dispatch/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ago } from "../lib/format";
import { cx } from "./ui";

/** Closes a popover on outside click or Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

interface QuickAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  to: string;
  cap: string;
}

/** In the menu order: notice board, appointments, regulatory affairs, audit, visitors, leave, pool car, tours. */
const QUICK_ACTIONS: QuickAction[] = [
  { label: "Post a notice", hint: "Notice board broadcast", icon: Newspaper, to: "/notices?new=1", cap: Capability.NOTICE_PUBLISH },
  { label: "Request a meeting", hint: "MD, Chairman or head of department", icon: CalendarClock, to: "/appointments?new=1", cap: Capability.APPOINTMENT_REQUEST },
  { label: "Add a licence", hint: "Regulatory register", icon: FileBadge, to: "/licences?new=1", cap: Capability.LICENCE_MANAGE },
  { label: "Plan an audit", hint: "Findings and corrective actions", icon: ClipboardCheck, to: "/audits?new=1", cap: Capability.AUDITS_MANAGE },
  { label: "Pre-register a visitor", hint: "Digital gate pass", icon: IdCard, to: "/visitors?new=1", cap: Capability.VISITOR_INVITE },
  { label: "Apply for leave", hint: "Head of department, then HR", icon: Palmtree, to: "/leave?new=1", cap: Capability.LEAVE_APPLY },
  { label: "Pool car requisition", hint: "Car with driver", icon: CarFront, to: "/pool-car?new=1", cap: Capability.FLEET_REQUEST },
  { label: "Official tour request", hint: "Local or foreign", icon: Plane, to: "/tours?new=1", cap: Capability.TOUR_REQUEST },
];

/** "New request" in the header: one click to start any request the user may make. */
export function QuickCreate({ compact = false }: { compact?: boolean }) {
  const caps = useAuth((s) => s.profile?.capabilities ?? []);
  const navigate = useNavigate();
  const { open, setOpen, ref } = usePopover();
  const actions = QUICK_ACTIONS.filter((a) => caps.includes(a.cap));
  if (!actions.length) return null;
  return (
    <div className="relative" ref={ref}>
      <button className="btn-primary h-10" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <Plus className="h-4 w-4" />
        {!compact && <span>New request</span>}
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-raised">
          {actions.map((a) => (
            <button
              key={a.to}
              role="menuitem"
              onClick={() => (setOpen(false), navigate(a.to))}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-platinum-bright text-navy-500">
                <a.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-navy">{a.label}</span>
                <span className="block text-xs text-ink-muted">{a.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface NotificationItem {
  id: string;
  parcelId: string | null;
  eventType: string;
  category: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data: { route?: string; parcelId?: string; incidentId?: string } | null;
}

/** Where a notification opens in the portal (the apps share the same paths). */
function targetOf(n: NotificationItem): string | null {
  if (n.data?.route?.startsWith("/")) return n.data.route;
  if (n.data?.incidentId) return `/incidents/${n.data.incidentId}`;
  if (n.parcelId) return `/parcels/${n.parcelId}`;
  return null;
}

/** Bell with the person's in-app notifications: approvals waiting, new incident reports, licence alerts… */
export function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { open, setOpen, ref } = usePopover();
  const unread = useQuery({ queryKey: ["notifications", "unread"], queryFn: () => api.get<{ total: number }>("/notifications/unread-count"), refetchInterval: 45_000 });
  const list = useQuery({ queryKey: ["notifications", "list"], queryFn: () => api.get<{ items: NotificationItem[] }>("/notifications?limit=12"), enabled: open });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["notifications"] });
  const markRead = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.post("/notifications/read-all"), onSuccess: refresh });
  const total = unread.data?.total ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative grid h-10 w-10 place-items-center rounded-full text-navy transition hover:bg-surface"
        onClick={() => setOpen((v) => !v)}
        aria-label={total ? `Notifications, ${total} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {total ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {total > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full border-2 border-white bg-danger px-1 text-center text-[10px] font-bold leading-[14px] text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-40 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-[15px] font-bold text-navy">Notifications</p>
            <button className="inline-flex items-center gap-1 text-xs font-semibold text-active hover:underline disabled:opacity-40" onClick={() => markAll.mutate()} disabled={!total || markAll.isPending}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {list.isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">Loading…</p>
            ) : !list.data?.items.length ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">You're all caught up.</p>
            ) : (
              list.data.items.map((n) => {
                const to = targetOf(n);
                return (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onOpen={() => {
                      if (!n.read) markRead.mutate(n.id);
                      setOpen(false);
                      if (to) navigate(to);
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onOpen }: { n: NotificationItem; onOpen: () => void }): ReactNode {
  const action = n.category === "ACTION_REQUIRED";
  return (
    <button onClick={onOpen} className={cx("flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-surface", !n.read && "bg-active-soft/40")}>
      <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-active")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-ink">{n.title}</span>
          <span className="shrink-0 text-[11px] text-ink-subtle">{ago(n.createdAt)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">{n.body}</span>
        {action && <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-pending">Action required</span>}
      </span>
    </button>
  );
}
