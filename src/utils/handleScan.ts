import { Dispatch, SetStateAction } from "react";
import { ScanStatus } from "@/app/page";

export async function handleScan(
  status: ScanStatus,
  result: string,
  setStatus: Dispatch<SetStateAction<ScanStatus>>,
  setMessage: (message: string) => void,
  setGuestName: (name: string) => void,
) {
  // Prevent multiple scans while processing
  if (status !== "idle") return;

  console.log("Scan result:", result);

  setStatus("scanning");
  setMessage("Verifying QR Code...");

  // Support if the QR code returns a full URL (e.g. http://arduino-day.com/test-qr-123)
  let parsedId = result.trim();
  try {
    if (parsedId.startsWith("http://") || parsedId.startsWith("https://")) {
      const url = new URL(parsedId);

      // Check for common query parameters first
      const idFromQuery =
        url.searchParams.get("id") ||
        url.searchParams.get("ticket") ||
        url.searchParams.get("qr");

      if (idFromQuery) {
        parsedId = idFromQuery;
      } else {
        const pathParts = url.pathname.split("/").filter(Boolean);
        // Assuming the ID is the last part of the URL path
        if (pathParts.length > 0) {
          parsedId = pathParts[pathParts.length - 1];
        }
      }
    }
  } catch (e) {
    /* Ignore URL parse errors, fallback to raw result */
  }

  try {
    const res = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCodeId: parsedId, rawString: result }),
    });

    const data = await res.json();

    if (res.ok) {
      setStatus("success");
      setGuestName(data.name);
      setMessage("Checked in successfully!");

      // Reset after 3 seconds so they can scan the next person
      setTimeout(() => {
        setStatus("idle");
        setGuestName("");
        setMessage("");
      }, 5000);
    } else {
      setStatus("error");
      setMessage(data.error || "Invalid QR Code");

      // Reset error state quicker
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 2000);
    }
  } catch (e) {
    console.error(e);
    setStatus("error");
    setMessage("Network error. Please try again.");
    setTimeout(() => setStatus("idle"), 2000);
  }
}
