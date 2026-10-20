import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Parcel } from "../lib/types";
import { ErrorNote, Spinner } from "../components/ui";

/** Resolves a scanned label (<base>/q/<token> or the bare token) to the parcel it belongs to. */
export async function openScanned(payload: string): Promise<string> {
  const res = await api.post<{ parcel: Parcel }>("/parcels/scan", { payload });
  return res.parcel.id;
}

/** Landing page for label URLs opened in the portal, e.g. by a desk scanner or a phone camera. */
export function QrLandingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    openScanned(window.location.href)
      .then((id) => navigate(`/parcels/${id}`, { replace: true }))
      .catch(setError);
  }, [navigate]);
  return <div className="mx-auto max-w-lg py-10">{error ? <ErrorNote error={error} /> : <Spinner label="Opening scanned parcel" />}</div>;
}
