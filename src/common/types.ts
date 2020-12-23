export type Statuses = "ok" | "no match" | "no mirror";
export interface Mirror {
  status: Statuses;
  albums: string[];
}
