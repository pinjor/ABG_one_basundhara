import { useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2, Printer, QrCode, ShieldCheck } from "lucide-react";
import { TRIP_TYPE_LABEL, type TripType } from "@abg-dispatch/shared";
import { Card } from "../../components/ui";
import { toast } from "../../components/toast";
import { stamp, when } from "../../lib/format";
import type { CarRequisition } from "./types";
import { useQrSvg } from "./ui";

const NAVY = "#0C1727";

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

/** A 900 × 1300 px pass the requester can keep on their phone or print: QR, car, driver, time. */
async function renderPassPng(r: CarRequisition): Promise<string> {
  await document.fonts?.ready;
  const W = 900;
  const H = 1300;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  const head = ctx.createLinearGradient(0, 0, W, 210);
  head.addColorStop(0, "#071225");
  head.addColorStop(0.55, "#0B1A31");
  head.addColorStop(1, "#142238");
  ctx.fillStyle = head;
  ctx.fillRect(0, 0, W, 210);
  ctx.fillStyle = "#EEF1F5";
  ctx.font = "800 46px Manrope, Inter, sans-serif";
  ctx.fillText("ABG ONE", 64, 100);
  ctx.fillStyle = "#9AA4B2";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillText("VEHICLE GATE PASS · ANVIR BASHUNDHARA GROUP", 64, 148);
  ctx.textAlign = "right";
  ctx.fillStyle = "#CAD0D8";
  ctx.font = "700 26px Inter, sans-serif";
  ctx.fillText(r.referenceNumber, W - 64, 100);
  ctx.textAlign = "left";

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, r.gatePass!.payload, { width: 540, margin: 1, errorCorrectionLevel: "M", color: { dark: NAVY, light: "#FFFFFF" } });
  ctx.drawImage(qr, (W - 540) / 2, 250);

  ctx.textAlign = "center";
  ctx.fillStyle = NAVY;
  ctx.font = "800 48px Manrope, Inter, sans-serif";
  ctx.fillText(r.vehicle?.registrationNumber ?? "", W / 2, 870);
  ctx.fillStyle = "#5B6678";
  ctx.font = "600 28px Inter, sans-serif";
  ctx.fillText(`${r.vehicle?.name ?? ""} · ${r.vehicle?.typeLabel ?? ""}`, W / 2, 915);
  ctx.textAlign = "left";

  ctx.strokeStyle = "#E3E8EF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 960);
  ctx.lineTo(W - 64, 960);
  ctx.stroke();

  const row = (label: string, value: string, y: number) => {
    ctx.fillStyle = "#8A94A6";
    ctx.font = "700 20px Inter, sans-serif";
    ctx.fillText(label.toUpperCase(), 64, y);
    ctx.fillStyle = NAVY;
    ctx.font = "600 28px Inter, sans-serif";
    ctx.fillText(fitText(ctx, value, W - 128), 64, y + 38);
  };
  row("Driver", `${r.driver?.fullName ?? ""} · ${r.driver?.phone ?? ""}`, 1010);
  row("Trip", `${TRIP_TYPE_LABEL[r.tripType as TripType] ?? r.tripType} · ${r.pickupLocation} → ${r.dropLocation}`, 1095);
  row("Pickup", `${stamp(r.pickupAt)} · ${r.requester.name} + ${Math.max(0, r.passengerCount - 1)}`, 1180);

  ctx.fillStyle = "#8A94A6";
  ctx.font = "500 19px Inter, sans-serif";
  ctx.fillText(`Valid ${when(r.gatePass!.validFrom)} – ${when(r.gatePass!.validUntil)} (Asia/Dhaka). Show at the gate; security scans it on exit and return.`, 64, 1268);
  return canvas.toDataURL("image/png");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function GatePassCard({ r }: { r: CarRequisition }) {
  const svg = useQrSvg(r.gatePass?.payload);
  const [busy, setBusy] = useState<"png" | "print" | null>(null);
  if (!r.gatePass) return null;

  const download = async () => {
    setBusy("png");
    try {
      const url = await renderPassPng(r);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.referenceNumber}-gate-pass.png`;
      a.click();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    setBusy("print");
    try {
      const url = await renderPassPng(r);
      const w = window.open("", "_blank", "width=520,height=760");
      if (!w) throw new Error("Allow pop-ups for this site to print the gate pass.");
      w.document.write(
        `<!doctype html><html><head><title>${escapeHtml(r.referenceNumber)} gate pass</title><style>@page{size:A5;margin:10mm}body{margin:0;display:flex;justify-content:center}img{width:100%;max-width:120mm}</style></head><body><img src="${url}" alt="Gate pass ${escapeHtml(r.referenceNumber)}" onload="window.print();setTimeout(()=>window.close(),300)"></body></html>`,
      );
      w.document.close();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <QrCode className="h-4 w-4 text-active" aria-hidden /> Gate pass
        </span>
      }
      action={<span className="text-[11px] font-semibold text-success">Live</span>}
    >
      <div className="flex flex-col items-center text-center">
        <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
          <div className="h-[200px] w-[200px]" role="img" aria-label={`QR gate pass for ${r.referenceNumber}`} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <p className="mono mt-3 text-lg text-navy">{r.vehicle?.registrationNumber}</p>
        <p className="text-xs text-ink-muted">
          {r.vehicle?.name} · Driver {r.driver?.fullName}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Valid {when(r.gatePass.validFrom)} – {when(r.gatePass.validUntil)}
        </p>
        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={download} disabled={!!busy}>
            {busy === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PNG
          </button>
          <button className="btn-secondary" onClick={print} disabled={!!busy}>
            {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-ink-subtle">Security scans this at the gate when the car leaves and when it returns. A new pass is issued if the car or driver changes.</p>
      </div>
    </Card>
  );
}
