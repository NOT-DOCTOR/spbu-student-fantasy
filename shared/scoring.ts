export type NormalizedResult = "PASS" | "FAIL" | "PENDING" | "NOT_TAKEN";
export type SubjectType = "EXAM" | "PASS_FAIL";

export type SubjectInput = {
  subjectName: string;
  subjectType: SubjectType;
  percentage?: number | null;
  rawGrade?: string | null;
  rawStatus?: string | null;
  credits?: number | null;
  attempts?: Array<{ normalizedResult: NormalizedResult; normalizedScore?: number | null }>;
};

export type ScoringConfigInput = {
  examWeight: number;
  passFailWeight: number;
  creditWeightEnabled: boolean;
  improvementWeight: number;
  consistencyWeight: number;
  firstAttemptWeight: number;
  recentFormWeight: number;
  tieBreakOrder: string[];
};

export type ScoreExplanation = {
  positives: string[];
  negatives: string[];
  components: Record<string, number>;
};

const LETTER_SCORES: Record<string, number> = {
  A: 95,
  B: 85,
  C: 75,
  D: 65,
  E: 55,
  F: 0,
};

export function normalizeResult(rawGrade?: string | null, rawStatus?: string | null): NormalizedResult {
  const value = `${rawStatus ?? ""} ${rawGrade ?? ""}`.trim().toUpperCase();
  if (!value) return "PENDING";
  if (/NOT[ _-]?TAKEN|N\/A|NA|ABSENT/.test(value)) return "NOT_TAKEN";
  if (/FAIL|FAILED|UNSATISFACTORY|^F$/.test(value)) return "FAIL";
  if (/PASS|PASSED|SATISFACTORY|GOOD|EXCELLENT|^[A-E]$/.test(value)) return "PASS";
  return "PENDING";
}

export function normalizedScoreFromSource(percentage?: number | null, rawGrade?: string | null): number | null {
  if (percentage !== null && percentage !== undefined && Number.isFinite(percentage)) {
    return Math.max(0, Math.min(100, percentage));
  }
  const grade = rawGrade?.trim().toUpperCase();
  return grade && grade in LETTER_SCORES ? LETTER_SCORES[grade] : null;
}

export function calculateAcademicScore(subjects: SubjectInput[], config: Pick<ScoringConfigInput, "examWeight" | "passFailWeight" | "creditWeightEnabled">) {
  let numerator = 0;
  let denominator = 0;
  const included: SubjectInput[] = [];

  for (const subject of subjects) {
    const score = normalizedScoreFromSource(subject.percentage, subject.rawGrade);
    if (score === null) continue;
    const typeWeight = subject.subjectType === "EXAM" ? config.examWeight : config.passFailWeight;
    const creditWeight = config.creditWeightEnabled ? Math.max(subject.credits ?? 1, 0.01) : 1;
    const weight = typeWeight * creditWeight;
    numerator += score * weight;
    denominator += weight;
    included.push(subject);
  }

  const score = denominator === 0 ? 0 : numerator / denominator;
  const explanation: ScoreExplanation = { positives: [], negatives: [], components: { includedSubjects: included.length, weightedSubjects: denominator, academicScore: score } };
  if (included.length > 0) explanation.positives.push(`${included.length} published subject results included`);
  if (subjects.length > included.length) explanation.negatives.push(`${subjects.length - included.length} subjects were not scoreable from the source data`);
  return { score, explanation };
}

export function calculateFantasyScore(input: {
  academicScore: number;
  improvement: number;
  consistency: number;
  firstAttemptSuccess: number;
  recentForm: number;
  config: Pick<ScoringConfigInput, "improvementWeight" | "consistencyWeight" | "firstAttemptWeight" | "recentFormWeight">;
}) {
  const { academicScore, improvement, consistency, firstAttemptSuccess, recentForm, config } = input;
  const components = {
    academicScore,
    improvement,
    consistency,
    firstAttemptSuccess,
    recentForm,
  };
  const bonus = improvement * config.improvementWeight + consistency * config.consistencyWeight + firstAttemptSuccess * config.firstAttemptWeight + recentForm * config.recentFormWeight;
  const score = Math.max(0, Math.min(100, academicScore + bonus));
  const positives: string[] = [];
  const negatives: string[] = [];
  if (improvement > 0) positives.push("Positive semester improvement");
  if (consistency >= 80) positives.push("Consistent performance across published results");
  if (firstAttemptSuccess >= 80) positives.push("Strong first-attempt success rate");
  if (recentForm >= 80) positives.push("Strong recent form");
  if (improvement < 0) negatives.push("Recent performance is below the prior period");
  return { score, explanation: { positives, negatives, components } satisfies ScoreExplanation };
}

export type RankingEntry = {
  studentId: string;
  academicScore: number;
  fantasyScore: number;
  recentForm: number;
  firstAttemptSuccess: number;
};

export function rankEntries(entries: RankingEntry[], tieBreakOrder: string[] = ["academicScore", "fantasyScore", "recentForm", "firstAttemptSuccess", "studentId"]) {
  const sorted = [...entries].sort((a, b) => {
    for (const key of tieBreakOrder) {
      if (key === "studentId") return a.studentId.localeCompare(b.studentId);
      const delta = Number((b as Record<string, unknown>)[key]) - Number((a as Record<string, unknown>)[key]);
      if (delta !== 0) return delta;
    }
    return a.studentId.localeCompare(b.studentId);
  });
  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
