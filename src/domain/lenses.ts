// MVP에서 사용하는 렌즈 상수 목록 (LENS_CONSTANTS)
export const LENS_CONSTANTS = [
  { id: "expect_vs_actual", name: "기대 vs 실제" },
  { id: "good_company_vs_good_stock", name: "좋은 회사 vs 좋은 주식" },
  { id: "concentration_vs_diversification", name: "집중 노출 vs 분산 노출" },
  { id: "revenue_growth_vs_profit_growth", name: "매출 성장 vs 이익 성장" },
  { id: "growth_rate_vs_valuation", name: "성장률 vs 밸류에이션" },
  { id: "one_time_vs_structural", name: "일회성 뉴스 vs 구조적 변화" },
  { id: "market_vs_company_specific", name: "시장 전체 영향 vs 기업 고유 영향" },
  { id: "risk_breaks_my_logic", name: "리스크 = 내 투자 논리를 깨뜨리는 조건" },
] as const;

export type LensId = typeof LENS_CONSTANTS[number]["id"];
