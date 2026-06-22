export type IssueStatus = "active" | "fixed" | "deprecated";

export type IssueSeverity = "low" | "medium" | "high" | "critical";

export type Applies = "Yes" | "No" | "Unknown";

export type CodexSurface = "cli" | "desktop";

export type TargetId =
  | "darwin-arm64"
  | "darwin-x64"
  | "linux-arm64"
  | "linux-x64"
  | "win32-arm64"
  | "win32-x64";

export interface IssueSources {
  issues: string[];
  fixes: string[];
}

export interface IssueTarget {
  applies: Applies;
  script?: string;
}

export interface IssueManifest {
  id: string;
  title: string;
  status: IssueStatus;
  severity: IssueSeverity;
  summary: string;
  sources: IssueSources;
  targets: Partial<
    Record<CodexSurface, Partial<Record<TargetId, IssueTarget>>>
  >;
}

export const issues: IssueManifest[] = [];
