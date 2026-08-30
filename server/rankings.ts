import { and, eq } from "drizzle-orm";
import { rankings, type ScoringConfig } from "../drizzle/schema";
import { rankEntries, type RankingEntry } from "../shared/scoring";
import { getDb } from "./db";

export type SnapshotType = "ACADEMIC" | "FANTASY" | "IMPROVEMENT" | "RECENT_FORM" | "CONSISTENCY" | "SUBJECT";

export type RankingSnapshotInput = {
  cohortId: number;
  semesterId: number;
  scoringConfig: Pick<ScoringConfig, "id" | "version" | "tieBreakOrder">;
  rankingType: SnapshotType;
  entries: RankingEntry[];
  publish?: boolean;
  lock?: boolean;
};

export function buildRankingSnapshot(input: RankingSnapshotInput, previousRanks = new Map<number, number>()) {
  const tieBreakOrder = parseTieBreakOrder(input.scoringConfig.tieBreakOrder);
  const ranked = rankEntries(input.entries, tieBreakOrder);
  return ranked.map(entry => ({
    cohortId: input.cohortId,
    semesterId: input.semesterId,
    scoringConfigId: input.scoringConfig.id,
    rankingType: input.rankingType,
    studentId: Number(entry.studentId),
    rank: entry.rank,
    score: String((input.rankingType === "FANTASY" ? entry.fantasyScore : entry.academicScore).toFixed(4)),
    previousRank: previousRanks.get(Number(entry.studentId)) ?? null,
    explanation: JSON.stringify({ scoringVersion: input.scoringConfig.version, tieBreakOrder, rankingType: input.rankingType }),
    published: Boolean(input.publish),
    locked: Boolean(input.lock),
  }));
}

export function parseTieBreakOrder(value: string | string[]) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) return parsed;
  } catch {
    // Fall back to comma-separated legacy values below.
  }
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

export async function createRankingSnapshot(input: RankingSnapshotInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const previous = await db.select({ studentId: rankings.studentId, rank: rankings.rank, locked: rankings.locked })
    .from(rankings)
    .where(and(
      eq(rankings.cohortId, input.cohortId),
      eq(rankings.semesterId, input.semesterId),
      eq(rankings.rankingType, input.rankingType),
      eq(rankings.published, true),
    ));
  const previousRanks = new Map(previous.map(row => [row.studentId, row.rank]));
  if (input.publish && previous.some(row => row.locked)) throw new Error("A locked published snapshot already exists for this cohort, semester, and ranking type.");
  const snapshot = buildRankingSnapshot(input, previousRanks);

  if (input.publish) {
    await db.update(rankings).set({ published: false }).where(and(
      eq(rankings.cohortId, input.cohortId),
      eq(rankings.semesterId, input.semesterId),
      eq(rankings.rankingType, input.rankingType),
      eq(rankings.published, true),
      eq(rankings.locked, false),
    ));
  }
  if (snapshot.length) await db.insert(rankings).values(snapshot);
  return { version: input.scoringConfig.version, published: Boolean(input.publish), rows: snapshot.length };
}
