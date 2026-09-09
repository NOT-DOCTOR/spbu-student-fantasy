import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { useEffect } from "react";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Acceptance of terms",
    body: [
      "By creating an account or using SPBU//FANTASY, you agree to these Terms. If you do not agree, do not use the platform.",
    ],
  },
  {
    title: "2. Eligibility and accounts",
    body: [
      "Access to academic data requires a verified student account, linked and approved by an administrator. You are responsible for keeping your session secure and for activity under your account.",
    ],
  },
  {
    title: "3. Accuracy of academic data",
    body: [
      "The platform reproduces official academic results as imported and reviewed by an administrator. It does not modify, invent, or reinterpret your official grades. Fantasy scores, rankings, and derived metrics are gamified indicators only and never replace your official academic record.",
    ],
  },
  {
    title: "4. Acceptable use",
    body: [
      "Do not attempt to access another student's private data, interfere with the platform's security, upload unauthorized or fabricated academic data, or use the service for any unlawful purpose.",
      "Administrator accounts must only be used for legitimate institutional administration, and all administrative actions are logged.",
    ],
  },
  {
    title: "5. Privacy controls",
    body: [
      "You may enable Private Mode at any time to limit what other students can see about your profile, rank, and subject statistics. Your own view of your data is never restricted.",
    ],
  },
  {
    title: "6. No monetary transactions (current release)",
    body: [
      "The current release does not process payments. Any future premium features will be described in updated terms before launch, and will not be a condition of accessing core privacy protections.",
    ],
  },
  {
    title: "7. Service availability",
    body: [
      "The platform is provided on an as-is, as-available basis. We may suspend or modify features (including for maintenance) and will aim to minimize disruption to published academic data.",
    ],
  },
  {
    title: "8. Termination",
    body: [
      "We may suspend or disable an account that violates these Terms, misuses the platform, or attempts to access data without authorization. Academic records are retained per our data retention policy even if an account is disabled.",
    ],
  },
  {
    title: "9. Limitation of liability",
    body: [
      "The platform is a supplementary analytics tool. Your institution's official records remain the authoritative source of truth for grades, standing, and academic decisions.",
    ],
  },
  {
    title: "10. Changes to these terms",
    body: [
      "We may update these Terms from time to time. Continued use after an update constitutes acceptance of the revised Terms.",
    ],
  },
];

export default function Terms() {
  useEffect(() => {
    document.title = "Terms & Conditions — SPBU//FANTASY";
  }, []);

  return (
    <main className="min-h-screen bg-[#08070d] text-white">
      <div className="container max-w-3xl py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-200">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <FileText className="h-6 w-6 text-pink-300" />
          <h1 className="display-font text-3xl font-black">Terms &amp; Conditions</h1>
        </div>
        <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-10 space-y-8">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-pink-200">{section.title}</h2>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-400">
                {section.body.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-xs text-slate-600">
          See also our{" "}
          <Link href="/privacy" className="text-cyan-300 underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
