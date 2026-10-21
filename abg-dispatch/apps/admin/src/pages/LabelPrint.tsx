import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { CLASSIFICATION_LABEL, Classification, PRIORITY_LABEL, Priority } from "@abg-dispatch/shared";
import { api } from "../lib/api";
import { stamp } from "../lib/format";
import type { Parcel } from "../lib/types";
import { ErrorNote, Spinner } from "../components/ui";

/**
 * 100 × 150 mm parcel label. The QR holds only an opaque token URL; it says
 * nothing about the contents. Confidential titles are never printed on the outside.
 */
export function LabelPrintPage() {
  const { id } = useParams<{ id: string }>();
  const parcel = useQuery({ queryKey: ["parcel", id], queryFn: () => api.get<Parcel>(`/parcels/${id}`) });
  const [svg, setSvg] = useState("");

  useEffect(() => {
    if (parcel.data?.qrPayload) void QRCode.toString(parcel.data.qrPayload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0C1727", light: "#FFFFFF" } }).then(setSvg);
  }, [parcel.data?.qrPayload]);

  if (parcel.isLoading) return <Spinner />;
  if (!parcel.data) return <div className="p-8"><ErrorNote error={parcel.error} /></div>;
  const p = parcel.data;
  if (!p.qrPayload) return <div className="p-8"><ErrorNote error={new Error("Your role cannot print this parcel's label.")} /></div>;
  const showTitle = p.classification === Classification.NORMAL || p.classification === Classification.INTERNAL;
  const receiver = p.receiver.employee ? `${p.receiver.employee.fullName} · ${p.receiver.employee.employeeCode}` : p.receiver.department?.name ?? p.receiver.external?.name ?? p.destination.branch?.name;

  return (
    <div className="min-h-screen bg-surface py-10 print:bg-white print:py-0">
      <style>{`@page { size: 100mm 150mm; margin: 0; }`}</style>
      <div className="no-print mx-auto mb-6 flex max-w-[100mm] justify-between">
        <p className="text-sm text-ink-muted">Label preview · 100 × 150 mm</p>
        <button className="btn-primary h-9" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>
      <article className="mx-auto flex h-[150mm] w-[100mm] flex-col overflow-hidden bg-white shadow-raised print:shadow-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        <header className="flex items-center justify-between bg-midnight px-[5mm] py-[3.5mm]">
          <img src="/brand/abg-logo-light.png" alt="ABG" className="h-[11mm]" />
          <div className="text-right">
            <p className="text-[8pt] font-bold uppercase tracking-[0.18em] text-platinum">ABG ONE · Dispatch</p>
            <p className="text-[7pt] text-platinum-deep">Internal custody label</p>
          </div>
        </header>
        <div className="flex flex-1 flex-col px-[5mm] pt-[4mm]">
          <div className="flex items-start gap-[4mm]">
            <div className="h-[38mm] w-[38mm] shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="min-w-0 flex-1">
              <p className="text-[7pt] font-bold uppercase tracking-wider text-ink-subtle">Tracking ID</p>
              <p className="mono whitespace-nowrap text-[10.5pt] leading-tight tracking-normal text-navy">{p.trackingNumber}</p>
              <div className="mt-[2mm] flex flex-wrap gap-[1.5mm]">
                {p.priority !== Priority.NORMAL && <span className="rounded bg-navy px-[1.5mm] py-[0.5mm] text-[8pt] font-bold uppercase text-white">{PRIORITY_LABEL[p.priority as Priority]}</span>}
                {p.classification !== Classification.NORMAL && <span className="rounded border border-navy px-[1.5mm] py-[0.5mm] text-[8pt] font-bold uppercase text-navy">{CLASSIFICATION_LABEL[p.classification as Classification]}</span>}
              </div>
            </div>
          </div>
          <div className="mt-[4mm] space-y-[3mm] border-t-2 border-navy pt-[3mm]">
            <div>
              <p className="text-[7pt] font-bold uppercase tracking-wider text-ink-subtle">To</p>
              <p className="text-[12pt] font-bold leading-tight text-navy">{receiver}</p>
              <p className="text-[9pt] text-ink">{p.destination.location?.path ?? p.destination.branch?.name ?? p.destination.address}</p>
            </div>
            <div>
              <p className="text-[7pt] font-bold uppercase tracking-wider text-ink-subtle">From</p>
              <p className="text-[10pt] font-semibold text-ink">
                {p.sender.fullName} · {p.sender.employeeCode}
              </p>
              <p className="text-[9pt] text-ink-muted">{p.origin.location?.path ?? p.origin.branch.name}</p>
            </div>
            <div>
              <p className="text-[7pt] font-bold uppercase tracking-wider text-ink-subtle">Contents</p>
              <p className="text-[9pt] text-ink">{showTitle ? p.title : "Sealed — details available to authorised staff in ABG ONE"}</p>
            </div>
          </div>
          <footer className="mt-auto border-t border-line py-[3mm] text-[7pt] leading-snug text-ink-muted">
            Booked {stamp(p.milestones.bookedAt ?? p.createdAt)}. Arrival is not receipt: the receiver must confirm in ABG ONE. Scan this code to view or receive. Do not open if the seal is broken — report it.
          </footer>
        </div>
      </article>
    </div>
  );
}
