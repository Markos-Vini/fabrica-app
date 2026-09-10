import { slugify } from "@/lib/artifacts/slug";

export function githubRepoName(appName: string): string {
  return `fabrica-${slugify(appName)}`;
}
