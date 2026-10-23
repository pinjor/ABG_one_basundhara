import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound, X, type LucideIcon } from "lucide-react";
import { api, qs } from "../lib/api";

/** A colleague from the directory. */
export interface DirectoryPerson {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string | null;
  department: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
  isMe: boolean;
  hasAccount: boolean;
  userId: string | null;
}

export interface PickedPerson {
  /** Employee id. */
  id: string;
  /** Account id, when they can sign in. */
  userId: string | null;
  name: string;
  designation: string | null;
}

/**
 * Choose a colleague from the directory: shows the choice with Change / Clear,
 * and a search box while choosing. `needsAccount` greys out people who cannot
 * sign in (approvers and action owners must).
 */
export function PersonPicker({
  label,
  value,
  onChange,
  needsAccount = false,
  allowMe = false,
  optional = false,
  emptyText = "Nobody chosen",
  icon: Icon = UserRound,
}: {
  label: string;
  value: PickedPerson | null;
  onChange: (p: PickedPerson | null) => void;
  needsAccount?: boolean;
  allowMe?: boolean;
  optional?: boolean;
  emptyText?: string;
  icon?: LucideIcon;
}) {
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const people = useQuery({
    queryKey: ["directory", "employees", debounced],
    queryFn: () => api.get<DirectoryPerson[]>(`/directory/employees${qs({ q: debounced })}`),
    enabled: picking && debounced.length >= 2,
  });

  return (
    <div>
      <p className="label">{label}</p>
      {!picking ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              {value ? (
                <>
                  <p className="truncate text-sm font-semibold text-ink">{value.name}</p>
                  <p className="truncate text-xs text-ink-muted">{value.designation ?? "—"}</p>
                </>
              ) : (
                <p className="text-sm text-ink-muted">{emptyText}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {optional && value && (
              <button type="button" className="btn-ghost h-9 px-2" onClick={() => onChange(null)} aria-label={`Clear ${label.toLowerCase()}`}>
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => setPicking(true)}>
              {value ? "Change" : "Choose"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-line p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input className="input pl-9" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID or designation" aria-label={`Search ${label.toLowerCase()}`} />
          </div>
          <ul className="mt-2 max-h-56 overflow-y-auto">
            {debounced.length < 2 && <li className="px-3 py-2 text-xs text-ink-subtle">Type at least two letters.</li>}
            {people.isFetching && <li className="px-3 py-2 text-xs text-ink-subtle">Searching…</li>}
            {debounced.length >= 2 && !people.isFetching && (people.data ?? []).length === 0 && <li className="px-3 py-2 text-xs text-ink-subtle">Nobody matches.</li>}
            {(people.data ?? [])
              .filter((p) => allowMe || !p.isMe)
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={needsAccount && !p.hasAccount}
                    onClick={() => {
                      onChange({ id: p.id, userId: p.userId, name: p.fullName, designation: p.designation });
                      setPicking(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{p.fullName}</span>
                      <span className="block truncate text-xs text-ink-muted">{[p.designation, p.department?.name, p.branch?.name].filter(Boolean).join(" · ")}</span>
                    </span>
                    {needsAccount && !p.hasAccount && <span className="shrink-0 text-[11px] text-ink-subtle">No account</span>}
                  </button>
                </li>
              ))}
          </ul>
          <div className="mt-1 text-right">
            <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setPicking(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
