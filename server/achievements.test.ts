import { describe, expect, it } from "vitest";
import { evaluateAchievement, parseAchievementRule } from "../shared/achievements";

describe("rule-based achievements", () => {
  const metrics = { academicScore: 88, fantasyScore: 94, improvement: 6, firstAttemptRate: 82, consistency: 79 };

  it("evaluates stored threshold rules", () => {
    expect(evaluateAchievement({ type: "SCORE_THRESHOLD", metric: "fantasyScore", min: 90 }, metrics)).toBe(true);
    expect(evaluateAchievement({ type: "CONSISTENCY_THRESHOLD", min: 80 }, metrics)).toBe(false);
    expect(evaluateAchievement({ type: "IMPROVEMENT_THRESHOLD", min: 5 }, metrics)).toBe(true);
  });

  it("rejects malformed rule payloads", () => {
    expect(parseAchievementRule("not-json")).toBeNull();
    expect(parseAchievementRule(JSON.stringify({ type: "SCORE_THRESHOLD", metric: "academicScore", min: 85 }))).toEqual({ type: "SCORE_THRESHOLD", metric: "academicScore", min: 85 });
  });
});
