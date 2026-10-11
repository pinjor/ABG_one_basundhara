import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** High-contrast QR. The alt text does not include the token. */
export function TicketQr({ value }: { value: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(value, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: "M",
      color: { dark: "#080B0C", light: "#F7F5EE" },
    }).then((next) => {
      if (live) setUrl(next);
    });
    return () => {
      live = false;
    };
  }, [value]);
  if (!url) return <div className="skeleton h-[280px] w-[280px]" aria-hidden />;
  return <img src={url} width={280} height={280} alt="Digital ticket QR code" className="h-[280px] w-[280px] bg-[#F7F5EE] p-3" />;
}
