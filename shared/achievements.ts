export type AchievementRule =
  | { type: "SCORE_THRESHOLD"; metric: "academicScore" | "fantasyScore"; min: number }
  | { type: "IMPROVEMENT_THRESHOLD"; min: number }
  | { type: "FIRST_ATTEMPT_RATE"; min: number }
  | { type: "CONSISTENCY_THRESHOLD"; min: number };

export type AchievementMetrics = {
  academicScore: number;
  fantasyScore: number;
  improvement: number;
  firstAttemptRate: number;
  consistency: number;
};

export function evaluateAchievement(rule: AchievementRule, metrics: AchievementMetrics) {
  switch (rule.type) {
    case "SCORE_THRESHOLD": return metrics[rule.metric] >= rule.min;
    case "IMPROVEMENT_THRESHOLD": return metrics.improvement >= rule.min;
    case "FIRST_ATTEMPT_RATE": return metrics.firstAttemptRate >= rule.min;
    case "CONSISTENCY_THRESHOLD": return metrics.consistency >= rule.min;
    default: return false;
  }
}

export function parseAchievementRule(value: string): AchievementRule | null {
  try {
    const parsed = JSON.parse(value) as AchievementRule;
    if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
