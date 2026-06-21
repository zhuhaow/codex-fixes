export type IssueStatus = "active" | "historical" | "resolved" | "planned";

export type FixRisk = "info" | "safe" | "careful" | "experimental" | "manual";

export interface IssueManifest {
  id: string;
  title: string;
  summary: string;
  status: IssueStatus;
  risk: FixRisk;
  reversible: boolean;
  platforms: string[];
  lastVerified?: string;
}

export const issues: IssueManifest[] = [];
