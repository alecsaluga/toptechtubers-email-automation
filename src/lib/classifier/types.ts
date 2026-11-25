export type FourWayCategory = "GOOD_OPPORTUNITY" | "IMP_OUTREACH" | "SPAM" | "NOISE";
export type TwoWayCategory = "realOpportunity" | "spam";

export interface ClassifyInput {
  sender: string;
  subject: string;
  body: string;
  from: string;
}

export interface ClassifyResult<C extends string> {
  category: C;
  reason?: string;
}

export interface Classifier {
  classifyFourWay(input: ClassifyInput): Promise<ClassifyResult<FourWayCategory>>;
  classifyTwoWay(input: ClassifyInput): Promise<ClassifyResult<TwoWayCategory>>;
}
