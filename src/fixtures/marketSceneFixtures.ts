import { CompanyId } from "../domain/types";

export interface MarketSceneFixture {
  companyId: CompanyId;
  scene: string;
  numbers: string;
  status: "unverified_mock" | "verified";
  note?: string;
  explicitMockFlag?: boolean;
  mockNote?: string;
}

export const MARKET_SCENE_FIXTURES: MarketSceneFixture[] = [
  {
    companyId: "nvidia",
    scene:
      "실적은 시장 기대를 넘겼는데 발표 직후 주가는 오히려 빠진 장면이다. 데이터센터 매출이 실적을 끌고 있고, 다음 분기 가이던스가 시장 기대와 얼마나 벌어져 있는지가 판단 포인트다.",
    numbers:
      "분기 매출 351억 달러 (시장 기대 332억 달러)\n데이터센터 매출 308억 달러\n다음 분기 가이던스 375억 달러 (시장 기대 370억 달러)\n발표 직후 시간외 주가 -2%\n선행 PER 47배",
    status: "unverified_mock",
    explicitMockFlag: true,
    mockNote: "학습용 예시 시나리오입니다. 실제 최신 공시 수치가 아니며, 판단 연습을 위해 구성한 장면입니다. 기업 리포트를 붙여넣으면 그 내용에서 데이터를 추출해 학습합니다.",
    note: "학습용 예시 시나리오.",
  },
  {
    companyId: "tesla",
    scene:
      "인도량이 시장 기대를 밑돌았고, 가격 인하로 수요를 방어하면서 마진이 함께 눌린 장면이다. 판매량과 수익성 중 무엇을 먼저 볼지가 판단 포인트다.",
    numbers:
      "분기 인도량 49.6만 대 (시장 기대 51.0만 대)\n분기 매출 257억 달러\n자동차 부문 매출총이익률 16.6% (전년 동기 17.6%)\n평균 판매가격 전년 대비 -5%\n발표 후 주가 -4%",
    status: "unverified_mock",
    explicitMockFlag: true,
    mockNote: "학습용 예시 시나리오입니다. 실제 최신 공시 수치가 아니며, 판단 연습을 위해 구성한 장면입니다. 기업 리포트를 붙여넣으면 그 내용에서 데이터를 추출해 학습합니다.",
    note: "학습용 예시 시나리오.",
  },
  {
    companyId: "samsung",
    scene:
      "메모리 가격이 내리는 구간에서 반도체 부문 이익이 기대를 밑돌았다. 다만 HBM 비중은 늘고 있어, 단기 가격 사이클과 구조 변화가 같이 놓인 장면이다.",
    numbers:
      "반도체 부문 분기 영업이익 2.2조 원 (시장 기대 2.6조 원)\n메모리 평균 판매가격 전분기 대비 -8%\nHBM 매출 비중 전분기 대비 확대\n최근 3개월 주가 -12%\nPBR 1.0배",
    status: "unverified_mock",
    explicitMockFlag: true,
    mockNote: "학습용 예시 시나리오입니다. 실제 최신 공시 수치가 아니며, 판단 연습을 위해 구성한 장면입니다. 기업 리포트를 붙여넣으면 그 내용에서 데이터를 추출해 학습합니다.",
    note: "학습용 예시 시나리오.",
  },
  {
    companyId: "vti",
    scene:
      "미국 시장 전체를 담는 ETF인데, 최근 상승분의 대부분이 소수 대형주에서 나왔다. 분산 투자라고 생각한 것이 실제로 얼마나 분산되어 있는지가 판단 포인트다.",
    numbers:
      "편입 종목 약 3,600개\n상위 10종목 비중 약 30%\n최근 1년 수익률 +24%\n그중 상위 7개 종목 기여분이 절반 이상\n연간 보수 0.03%",
    status: "unverified_mock",
    explicitMockFlag: true,
    mockNote: "학습용 예시 시나리오입니다. 실제 최신 공시 수치가 아니며, 판단 연습을 위해 구성한 장면입니다. 기업 리포트를 붙여넣으면 그 내용에서 데이터를 추출해 학습합니다.",
    note: "학습용 예시 시나리오.",
  },
];
