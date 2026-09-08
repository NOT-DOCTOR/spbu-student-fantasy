import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, BarChart3, LockKeyhole, Radar, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";

const previewRows = [
  { rank: "01", name: "PREVIEW STUDENT", score: "92.8", move: "+12" },
  { rank: "02", name: "PREVIEW STUDENT", score: "88.4", move: "+07" },
  { rank: "03", name: "PREVIEW STUDENT", score: "84.9", move: "+03" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08070d] text-white">
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(105,241,255,.2)]"><Radar className="h-5 w-5" /></div>
          <div>
            <p className="display-font text-sm font-bold tracking-[0.18em]">SPBU//FANTASY</p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Independent academic intelligence layer</p>
          </div>
        </div>
        <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex"><a href="#system" className="transition hover:text-cyan-200">System</a><a href="#privacy" className="transition hover:text-cyan-200">Privacy</a><a href="#signal" className="transition hover:text-cyan-200">Signal</a></div>
        <Button onClick={() => startLogin()} className="border border-pink-300/40 bg-pink-400/15 text-pink-100 shadow-[0_0_24px_rgba(255,51,166,.18)] hover:bg-pink-400/25">Enter platform <ArrowUpRight className="ml-2 h-4 w-4" /></Button>
      </nav>

      <section className="container relative grid gap-12 pb-24 pt-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pt-24">
        <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-pink-500/10 blur-[100px]" /><div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-[100px]" />
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-3"><span className="eyebrow">SPBU-inspired / private cohort layer</span><span className="institutional-rule h-px w-16" /></div>
          <h1 className="display-font max-w-4xl text-5xl font-black leading-[1.03] tracking-[-0.06em] sm:text-7xl">Your results.<br /><span className="neon-cyan">Your signal.</span><br /><span className="neon-pink">Your rank.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">SPBU Student Fantasy turns academic performance into a private, explainable competitive layer: clear metrics, meaningful trends, and a league table that never loses sight of the underlying result.</p>
          <div className="mt-9 flex flex-wrap gap-4"><Button onClick={() => startLogin()} size="lg" className="h-12 bg-cyan-300 px-6 font-semibold text-slate-950 shadow-[0_0_30px_rgba(105,241,255,.25)] hover:bg-cyan-200">Launch your profile <Zap className="ml-2 h-4 w-4" /></Button><a href="#system" className="inline-flex h-12 items-center rounded-lg border border-white/10 px-6 text-sm text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200">Explore the system</a></div>
          <div className="mt-10 flex flex-wrap gap-6 text-xs uppercase tracking-[0.18em] text-slate-500"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Private by design</span><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-pink-300" /> Server-side access</span></div>
        </div>
        <div className="hud-card pulse-neon scanline relative mx-auto w-full max-w-md p-5 lg:ml-auto">
          <div className="flex items-start justify-between"><div><p className="eyebrow">Live league / preview only</p><h2 className="display-font mt-2 text-2xl font-bold">MATCHWEEK 03</h2></div><div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-cyan-200">DEMO DATA</div></div>
          <div className="hud-line my-5" />
          <div className="space-y-2">{previewRows.map(row => <div key={row.rank} className="grid grid-cols-[42px_1fr_64px_48px] items-center gap-2 rounded-xl border border-white/5 bg-white/[.025] px-3 py-3"><span className="display-font text-sm text-slate-500">#{row.rank}</span><span className="text-sm font-semibold tracking-wide text-slate-200">{row.name}</span><span className="display-font text-right font-bold text-cyan-200">{row.score}</span><span className="text-right text-xs font-bold text-pink-300">{row.move}</span></div>)}</div>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-pink-400/10 p-4"><p className="eyebrow text-pink-200">Cohort pulse</p><p className="mt-2 display-font text-2xl font-bold text-pink-100">+8.4%</p></div><div className="rounded-xl bg-cyan-300/10 p-4"><p className="eyebrow">Published data</p><p className="mt-2 display-font text-2xl font-bold text-cyan-100">0 leaks</p></div></div>
        </div>
      </section>

      <section id="system" className="container border-t border-white/10 py-20"><div className="mb-10 max-w-2xl"><p className="eyebrow">01 / System architecture</p><h2 className="mt-3 display-font text-3xl font-bold tracking-tight sm:text-4xl">A league layer over real academic data.</h2><p className="mt-4 leading-7 text-slate-400">The platform separates official results from derived metrics. Every score can be traced, every ranking can be versioned, and every publication is an explicit admin action.</p></div><div className="grid gap-4 md:grid-cols-3">{[{icon: BarChart3, title: "Explainable metrics", copy: "Academic score, fantasy score, rank movement, form, and percentile with visible factors."}, {icon: Trophy, title: "Competitive clarity", copy: "Overall, improvement, subject leaders, recent form, consistency, and cohort views."}, {icon: Sparkles, title: "AI as enhancement", copy: "Structured pre-generated analysis rendered as content—not pretend live generation."}].map(({icon: Icon, title, copy}) => <div key={title} className="hud-card p-6"><Icon className="h-6 w-6 text-pink-300" /><h3 className="mt-5 text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p></div>)}</div></section>

      <section id="privacy" className="container pb-24"><div className="hud-card grid gap-8 p-7 md:grid-cols-[1fr_auto] md:items-center md:p-10"><div><p className="eyebrow">02 / Visibility protocol</p><h2 className="mt-3 display-font text-2xl font-bold">Competitive does not mean exposed.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-400">Academic data is gated behind authentication and verified student access. Private Mode is a meaningful control, not a premium upsell. Visitors see product previews only; students see only what policy permits.</p></div><div className="grid grid-cols-2 gap-3 text-center text-xs uppercase tracking-[0.18em]"><div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-cyan-200"><LockKeyhole className="mx-auto mb-2 h-5 w-5" />Verified</div><div className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-5 py-4 text-pink-200"><ShieldCheck className="mx-auto mb-2 h-5 w-5" />Auditable</div></div></div></section>

      <footer id="signal" className="container flex flex-col gap-4 border-t border-white/10 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p className="tracking-[0.15em]">SPBU//FANTASY — UNIVERSITY PERFORMANCE LEAGUE</p><p><span className="institutional-red">Independent product mark.</span> Built for insight, not surveillance.</p></footer>
    </main>
  );
}
