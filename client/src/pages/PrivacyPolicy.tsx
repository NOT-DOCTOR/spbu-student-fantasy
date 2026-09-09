import { Link } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. What this platform is",
    body: [
      "SPBU//FANTASY is an academic performance platform for a defined student cohort. This policy explains what data we collect, why, and how it is protected. It applies to the web application only, not to the university itself.",
    ],
  },
  {
    title: "2. Data we collect",
    body: [
      "Account data: your name and email as provided through the sign-in provider, and your role (student or admin).",
      "Academic data: student ID, faculty, program, cohort, semester, subject results, attempt history, and derived scores — sourced only from administrator-reviewed institutional imports, never invented or inferred.",
      "Usage data: basic technical logs (timestamps, IP address, browser type) needed for security, abuse prevention, and debugging.",
    ],
  },
  {
    title: "3. Why we collect it",
    body: [
      "To authenticate you and show you your own academic profile, rankings, and analytics.",
      "To power the leaderboard, achievement, and analytics features you opt into.",
      "To maintain audit logs of administrative actions for accountability.",
      "We do not sell academic or personal data, and we do not use it for advertising.",
    ],
  },
  {
    title: "4. Who can see your data",
    body: [
      "You can always see your own full academic record.",
      "Administrators can see records needed to manage the platform, and every administrative action is logged.",
      "Other students can see only what your Privacy Mode setting permits (profile, rank, subject stats). Enabling Private Mode hides all of these from peers immediately.",
      "We never expose academic data through unauthenticated pages or public APIs.",
    ],
  },
  {
    title: "5. How long we keep data",
    body: [
      "Student records are retained (not deleted) even when a student becomes inactive or graduates, to preserve institutional history and audit integrity. You can request correction of inaccurate data by contacting an administrator.",
    ],
  },
  {
    title: "6. Cookies",
    body: [
      "We use a single essential session cookie to keep you signed in. We do not use third-party advertising or tracking cookies. See our Cookie banner for details and your choices.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "Passwords are never stored by us (authentication is delegated to the sign-in provider). All traffic is served over HTTPS. Access to academic data requires authentication and role checks enforced on the server, not just the interface.",
    ],
  },
  {
    title: "8. Your rights",
    body: [
      "You may request a copy of your data, request correction of inaccurate academic records, or ask an administrator to review your account status. Contact your program administrator to exercise these rights.",
    ],
  },
  {
    title: "9. Changes to this policy",
    body: [
      "If this policy changes materially, we will update the date below and, where appropriate, notify active users.",
    ],
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy — SPBU//FANTASY";
  }, []);

  return (
    <main className="min-h-screen bg-[#08070d] text-white">
      <div className="container max-w-3xl py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-200">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
          <h1 className="display-font text-3xl font-black">Privacy Policy</h1>
        </div>
        <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-10 space-y-8">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-cyan-200">{section.title}</h2>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-400">
                {section.body.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-xs text-slate-600">
          Questions about this policy or your data? Contact your program administrator, or see our{" "}
          <Link href="/terms" className="text-cyan-300 underline underline-offset-4">Terms &amp; Conditions</Link>.
        </p>
      </div>
    </main>
  );
}
