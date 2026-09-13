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
      "NVIDIA는 최근 데이터센터와 AI 관련 매출 기대가 크게 강조되고, 주가도 그 기대를 반영해 움직인 장면이다. 실제 매출·가이드라인과 시장의 기대 수준이 얼마나 겹치는지, 혹은 차이가 나는지가 판단 포인트다.",
    numbers: "[검증되지 않은 개발용 mock 데이터. wiring 테스트 전용이며 실제 데모에는 노출하지 않는다.]",
    status: "unverified_mock",
    explicitMockFlag: true,
    mockNote:
      "MVP golden path wiring 테스트용. 실제 사용자/심사 데모에는 노출되지 않으며, MVP 이후 검증된 실제 장면/숫자로 교체해야 한다.",
    note: "MVP golden path wiring 테스트용. 이후 검증된 실제 장면/숫자로 교체.",
  },
  {
    companyId: "tesla",
    scene:
      "Tesla는 최근 배송실적과 가격 정책 변화로 마진 방어와 수요 기대가 함께 이야기되는 장면이다. 실제 실적과 시장 기대 사이의 차이를 어떻게 볼지가 학습 포인트다.",
    numbers: "[검증되지 않은 개발용 mock 데이터. wiring 테스트 전용이며 실제 데모에는 노출하지 않는다.]",
    status: "unverified_mock",
    explicitMockFlag: true,
    mockNote:
      "MVP golden path wiring 테스트용. 실제 사용자/심사 데모에는 노출되지 않으며, MVP 이후 검증된 실제 장면/숫자로 교체해야 한다.",
    note: "MVP golden path wiring 테스트용. 이후 검증된 실제 장면/숫자로 교체.",
  },
];
