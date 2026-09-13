import { CompanyId } from "../domain/types";

export const THEMES = [
  { id: "ai_infra", name: "AI 인프라", companies: ["nvidia", "amd"] },
  { id: "ev_autonomous", name: "전기차·자율주행", companies: ["tesla"] },
  { id: "semiconductor", name: "반도체", companies: ["nvidia", "amd", "intel"] },
  { id: "diversified_etf", name: "분산형 ETF", companies: ["vti"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function themeById(id: string): (typeof THEMES)[number] | undefined {
  return THEMES.find((t) => t.id === id);
}

export function companiesForTheme(themeId: string): CompanyId[] {
  const theme = themeById(themeId);
  if (!theme) return [];
  return [...theme.companies] as CompanyId[];
}
