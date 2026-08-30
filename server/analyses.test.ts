import { describe, expect, it } from "vitest";
import { validateAnalysisPayload } from "./routers/analyses";

describe("structured AI analysis validation", () => {
  it("accepts a structured pre-generated payload", () => {
    const result = validateAnalysisPayload({ title: "Semester signal", summary: "A concise summary.", sections: [{ heading: "Strength", body: "Strong exam performance." }], model: "offline-import" });
    expect(result.success).toBe(true);
  });

  it("rejects unstructured or empty payloads", () => {
    expect(validateAnalysisPayload({ text: "pretend this was generated live" }).success).toBe(false);
    expect(validateAnalysisPayload({ title: "Missing sections", summary: "No sections" }).success).toBe(false);
  });
});
