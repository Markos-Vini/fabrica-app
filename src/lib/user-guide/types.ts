export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | {
      kind: "table";
      headers: [string, string];
      rows: [string, string][];
    }
  | { kind: "callout"; variant: "info" | "tip" | "warn"; title?: string; text: string };

export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  blocks: GuideBlock[];
};
