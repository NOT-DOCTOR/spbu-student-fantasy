import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";
const ANALYTICS_SCRIPT_ID = "spbu-analytics";

type Consent = "accepted" | "rejected";

function loadAnalyticsIfConsented(consent: Consent | null) {
  if (consent !== "accepted" || document.getElementById(ANALYTICS_SCRIPT_ID)) return;
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;

  const endpoint = String(import.meta.env.VITE_ANALYTICS_ENDPOINT ?? "").replace(/\/+$/, "");
  const websiteId = String(import.meta.env.VITE_ANALYTICS_WEBSITE_ID ?? "");
  if (!endpoint || !websiteId) return;

  const script = document.createElement("script");
  script.id = ANALYTICS_SCRIPT_ID;
  script.defer = true;
  script.src = `${endpoint}/umami`;
  script.dataset.websiteId = websiteId;
  script.dataset.doNotTrack = "true";
  script.dataset.domains = window.location.hostname;
  document.head.appendChild(script);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: Consent | null = null;
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === "accepted" || value === "rejected") stored = value;
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (e.g. private browsing) — don't block the page.
    }
    loadAnalyticsIfConsented(stored);
  }, []);

  const respond = (value: Consent) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    if (value === "accepted") loadAnalyticsIfConsented(value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-cyan-300/20 bg-[#0d0d14]/95 p-4 backdrop-blur-md sm:p-5"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
          <p className="text-sm leading-6 text-slate-300">
            We use one essential cookie to keep you signed in. No advertising or third-party tracking cookies.{" "}
            <Link href="/privacy" className="text-cyan-300 underline underline-offset-4">Learn more</Link>.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="border-white/10" onClick={() => respond("rejected")}>
            Essential only
          </Button>
          <Button size="sm" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => respond("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
