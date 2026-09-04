import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useRoute } from "wouter";

export default function PeerProfile() {
  const [, params] = useRoute("/profile/:studentId");
  const studentId = Number(params?.studentId);
  const profile = trpc.academic.profile.useQuery({ studentId }, { enabled: Number.isInteger(studentId) && studentId > 0, retry: false });
  if (profile.isLoading) return <div className="grid min-h-[60vh] place-items-center text-cyan-300">Checking profile visibility…</div>;
  if (profile.error || !profile.data) return <div className="hud-card mx-auto mt-12 max-w-xl p-9 text-center"><LockKeyhole className="mx-auto h-9 w-9 text-pink-300" /><h1 className="mt-5 display-font text-xl font-bold">Profile is private</h1><p className="mt-3 text-sm leading-6 text-slate-400">The server did not release this profile because the owner’s visibility policy does not permit peer access.</p></div>;
  return <div className="mx-auto max-w-3xl space-y-6"><header><p className="eyebrow">League profile / permission-aware view</p><h1 className="mt-2 display-font text-3xl font-black">Student <span className="neon-cyan">signal.</span></h1></header><Card className="hud-card border-0 bg-card/70"><CardHeader><Badge className="w-fit border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><ShieldCheck className="mr-2 h-3.5 w-3.5" />Visibility permitted</Badge><CardTitle className="mt-4 display-font text-2xl">{profile.data.student.fullName}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-400">This peer view contains identity-level information only. Academic results, attempts, and private analytics remain withheld.</p></CardContent></Card></div>;
}
