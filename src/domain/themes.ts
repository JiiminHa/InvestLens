import { CompanyId } from "../domain/types";
import { companyName } from "../domain/constants";

export const THEMES = [
  { id: "ai_infra", name: "AI 인프라", description: "기대가 먼저 오르는 산업에서 실제 실적과의 간격을 본다", companies: ["nvidia"] },
  { id: "ev_autonomous", name: "전기차·자율주행", description: "성장과 수익성이 엇갈릴 때 무엇을 먼저 볼지 연습한다", companies: ["tesla"] },
  { id: "semiconductor", name: "반도체", description: "가격 사이클과 구조 변화가 겹친 장면을 구분한다", companies: ["nvidia", "samsung"] },
  { id: "diversified_etf", name: "분산형 ETF", description: "분산이라 믿은 것이 실제로 분산인지 확인한다", companies: ["vti"] },
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
