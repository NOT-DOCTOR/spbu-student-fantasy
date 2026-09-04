import { describe, expect, it } from "vitest";
import { calculateAcademicScore, calculateFantasyScore, normalizeResult, normalizedScoreFromSource, rankEntries } from "../shared/scoring";
import { canViewAcademicData, mapStoredRole } from "../shared/privacy";

describe("academic normalization and scoring", () => {
  it("normalizes source status without changing the source value", () => {
    expect(normalizeResult("", "PASSED")).toBe("PASS");
    expect(normalizeResult("F", "")).toBe("FAIL");
    expect(normalizeResult("", "Not Taken")).toBe("NOT_TAKEN");
  });

  it("uses a supplied percentage before a letter-grade fallback", () => {
    expect(normalizedScoreFromSource(88, "B")).toBe(88);
    expect(normalizedScoreFromSource(null, "A")).toBe(95);
    expect(normalizedScoreFromSource(null, "unknown")).toBeNull();
  });

  it("applies configurable exam and pass/fail weights", () => {
    const result = calculateAcademicScore([
      { subjectName: "Anatomy", subjectType: "EXAM", percentage: 80 },
      { subjectName: "Ethics", subjectType: "PASS_FAIL", percentage: 60 },
    ], { examWeight: 2, passFailWeight: 1, creditWeightEnabled: false });
    expect(result.score).toBeCloseTo(73.3333, 3);
    expect(result.explanation.components.includedSubjects).toBe(2);
  });

  it("keeps fantasy score explainable and bounded", () => {
    const result = calculateFantasyScore({
      academicScore: 78,
      improvement: 8,
      consistency: 84,
      firstAttemptSuccess: 90,
      recentForm: 82,
      config: { improvementWeight: 0.2, consistencyWeight: 0.05, firstAttemptWeight: 0.05, recentFormWeight: 0.1 },
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.explanation.positives).toContain("Positive semester improvement");
  });

  it("uses deterministic tie breaking and student ID fallback", () => {
    const ranked = rankEntries([
      { studentId: "B-02", academicScore: 80, fantasyScore: 70, recentForm: 70, firstAttemptSuccess: 70 },
      { studentId: "A-01", academicScore: 80, fantasyScore: 70, recentForm: 70, firstAttemptSuccess: 70 },
    ]);
    expect(ranked.map(entry => entry.studentId)).toEqual(["A-01", "B-02"]);
  });
});

describe("role and privacy rules", () => {
  it("maps stored template roles to application roles", () => {
    expect(mapStoredRole("admin")).toBe("ADMIN");
    expect(mapStoredRole("user")).toBe("STUDENT");
  });

  it("allows self and admins while respecting private mode for peers", () => {
    const settings = { privateMode: true, showProfile: true, showRank: true, showSubjectStats: true };
    expect(canViewAcademicData({ viewerRole: "ADMIN", isSelf: false, settings, field: "rank" })).toBe(true);
    expect(canViewAcademicData({ viewerRole: "STUDENT", isSelf: true, settings, field: "rank" })).toBe(true);
    expect(canViewAcademicData({ viewerRole: "STUDENT", isSelf: false, settings, field: "rank" })).toBe(false);
  });
});


describe("attempt policy defaults", () => {
  it("does not apply an attempt-weight modifier in the initial release", () => {
    const result = calculateFantasyScore({
      academicScore: 80,
      improvement: 0,
      consistency: 80,
      firstAttemptSuccess: 50,
      recentForm: 80,
      config: { improvementWeight: 0, consistencyWeight: 0, firstAttemptWeight: 0, recentFormWeight: 0 },
    });
    expect(result.score).toBe(80);
    expect(result.explanation.positives).not.toContain("First-attempt success");
  });
});
