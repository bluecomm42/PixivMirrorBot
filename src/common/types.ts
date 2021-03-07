import { Comment, Submission } from "snoowrap";

export type Statuses = "ok" | "no match" | "only sfw" | "error";
export interface Mirror {
  status: Statuses;
  albums: string[];
}

export function isComment(a: any): a is Comment {
  return a && typeof a.name === "string" && a.name.startsWith("t1_");
}

export function isSubmission(a: any): a is Submission {
  return a && typeof a.name === "string" && a.name.startsWith("t3_");
}
