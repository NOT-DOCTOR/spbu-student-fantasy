import { describe, expect, it } from "vitest";
import { buildRankingSnapshot, parseTieBreakOrder } from "./rankings";

describe("ranking snapshots", () => {
  const config = { id: 7, version: "v1.3", tieBreakOrder: '["academicScore","fantasyScore","studentId"]' } as const;

  it("parses stored JSON and builds versioned unpublished rows", () => {
    const snapshot = buildRankingSnapshot({
      cohortId: 2,
      semesterId: 4,
      scoringConfig: config,
      rankingType: "ACADEMIC",
      entries: [
        { studentId: "2", academicScore: 91, fantasyScore: 93, recentForm: 90, firstAttemptSuccess: 90 },
        { studentId: "1", academicScore: 91, fantasyScore: 93, recentForm: 90, firstAttemptSuccess: 90 },
      ],
    });
    expect(snapshot.map(row => row.studentId)).toEqual([1, 2]);
    expect(snapshot[0]?.published).toBe(false);
    expect(snapshot[0]?.explanation).toContain("v1.3");
  });

  it("tracks previous rank and supports published snapshots", () => {
    const snapshot = buildRankingSnapshot({
      cohortId: 2,
      semesterId: 4,
      scoringConfig: { ...config, tieBreakOrder: "academicScore,fantasyScore,studentId" },
      rankingType: "FANTASY",
      publish: true,
      lock: true,
      entries: [{ studentId: "12", academicScore: 81.25, fantasyScore: 95.4, recentForm: 92, firstAttemptSuccess: 88 }],
    }, new Map([[12, 4]]));
    expect(snapshot[0]).toMatchObject({ rank: 1, previousRank: 4, published: true, locked: true, score: "95.4000" });
    expect(parseTieBreakOrder("academicScore,studentId")).toEqual(["academicScore", "studentId"]);
  });
});
