import { CompanyId, LensId } from "./types";

export const COMPANIES: Record<CompanyId, CompanyInfo> = {
  tesla: { id: "tesla", name: "Tesla" },
  vti: { id: "vti", name: "VTI" },
  samsung: { id: "samsung", name: "Samsung Electronics" },
  nvidia: { id: "nvidia", name: "NVIDIA" },
};

export const LENSES: Record<LensId, LensInfo> = {
  expect_vs_actual: { id: "expect_vs_actual", name: "기대 vs 실제" },
  good_company_vs_good_stock: { id: "good_company_vs_good_stock", name: "좋은 회사 vs 좋은 주식" },
  concentration_vs_diversification: { id: "concentration_vs_diversification", name: "집중 노출 vs 분산 노출" },
  revenue_growth_vs_profit_growth: { id: "revenue_growth_vs_profit_growth", name: "매출 성장 vs 이익 성장" },
  growth_rate_vs_valuation: { id: "growth_rate_vs_valuation", name: "성장률 vs 밸류에이션" },
  one_time_vs_structural: { id: "one_time_vs_structural", name: "일회성 뉴스 vs 구조적 변화" },
  market_vs_company_specific: { id: "market_vs_company_specific", name: "시장 전체 영향 vs 기업 고유 영향" },
  risk_breaks_my_logic: { id: "risk_breaks_my_logic", name: "리스크 = 내 투자 논리를 깨뜨리는 조건" },
};

export const USER_ID = "demo_user";

export function nowISO(): string {
  return new Date().toISOString();
}

export function companyName(id: CompanyId): string {
  return COMPANIES[id]?.name ?? id;
}

export function lensName(id: LensId): string {
  return LENSES[id]?.name ?? id;
}
