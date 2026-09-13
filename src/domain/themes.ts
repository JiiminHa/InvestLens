import { CompanyId } from "./types";

export interface Theme {
  id: string;
  name: string;
  description: string;
  companies: CompanyId[];
}

export const THEMES: Theme[] = [
  {
    id: "ai_infra",
    name: "AI 인프라",
    description: "데이터센터, AI 칩, 클라우드 등 AI가 실제로 돌아가는 기반 시설.",
    companies: ["nvidia"],
  },
  {
    id: "ev_autonomous",
    name: "전기차·자율주행",
    description: "전기차 제조, 배터리, 자율주행 소프트웨어 등.",
    companies: ["tesla"],
  },
  {
    id: "semiconductor",
    name: "반도체",
    description: "메모리, 파운드리, 팹리스 등 반도체 사이클이 중요한 기업.",
    companies: ["samsung"],
  },
  {
    id: "diversified_etf",
    name: "분산투자·ETF",
    description: "개별기업 위험을 줄이고 시장 전체에 분산 노출되는 상품.",
    companies: ["vti"],
  },
];
