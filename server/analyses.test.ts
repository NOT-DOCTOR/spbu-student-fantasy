import { describe, expect, it } from "vitest";
import { validateAnalysisPayload, validatePublicationApproval } from "./routers/analyses";

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


describe("structured AI analysis replacement boundaries", () => {
  it("rejects a missing analysis", async () => {
    const { assertDraftAnalysis } = await import("./routers/analyses");
    expect(() => assertDraftAnalysis(undefined)).toThrow("Analysis not found.");
  });

  it("rejects published and archived analyses", async () => {
    const { assertDraftAnalysis } = await import("./routers/analyses");
    expect(() => assertDraftAnalysis("published")).toThrow("Only draft analyses can be replaced.");
    expect(() => assertDraftAnalysis("archived")).toThrow("Only draft analyses can be replaced.");
  });

  it("accepts only a draft analysis", async () => {
    const { assertDraftAnalysis } = await import("./routers/analyses");
    expect(assertDraftAnalysis("draft")).toBe(true);
  });
});

describe("structured AI publication governance", () => {
  it("requires a meaningful administrator approval note", () => {
    expect(() => validatePublicationApproval("too short")).toThrow("at least 20 characters");
    expect(validatePublicationApproval("Reviewed against the approved source and release policy.")).toContain("approved source");
  });
});
