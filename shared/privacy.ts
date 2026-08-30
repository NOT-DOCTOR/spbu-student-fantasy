export type AppRole = "STUDENT" | "ADMIN";

export type VisibilitySettings = {
  privateMode: boolean;
  showProfile: boolean;
  showRank: boolean;
  showSubjectStats: boolean;
};

export function mapStoredRole(role: "user" | "admin" | null | undefined): AppRole | null {
  if (role === "admin") return "ADMIN";
  if (role === "user") return "STUDENT";
  return null;
}

export function canViewAcademicData(input: {
  viewerRole: AppRole;
  isSelf: boolean;
  settings?: VisibilitySettings | null;
  field: "profile" | "rank" | "subjectStats";
}) {
  if (input.viewerRole === "ADMIN" || input.isSelf) return true;
  const settings = input.settings;
  if (!settings || settings.privateMode) return false;
  if (input.field === "profile") return settings.showProfile;
  if (input.field === "rank") return settings.showRank;
  return settings.showSubjectStats;
}
