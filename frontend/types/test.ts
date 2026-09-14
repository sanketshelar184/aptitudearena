export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type TestStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

export interface Test {
  id: string;
  name: string;
  description: string | null;
  question_count: number;
  duration_seconds: number;
  category_id: string | null;
  topic_id: string | null;
  category_name?: string | null;
  topic_name?: string | null;
  difficulty: Difficulty | null;
  is_free: boolean;
  is_premium: boolean;
  price_inr: number;
  negative_marking_ratio: number;
  status: TestStatus;
  created_at: string;
  updated_at: string;
}

export interface PublicQuestion {
  id: string;
  position: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_answer?: string | null;
}

export interface StartAttemptResponse {
  attempt_id: string;
  test_id: string;
  test_name: string;
  guest_token: string;
  expires_at: string;
  duration_seconds: number;
  total_questions: number;
  questions: PublicQuestion[];
}

export interface AttemptResult {
  attempt_id: string;
  test_id: string;
  status: AttemptStatus;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  average_time_seconds: number;
}

export interface TopicPerformance {
  category: string;
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface AnswerReview {
  position: number;
  question_id: string;
  question_text: string;
  options: Record<string, string>;
  selected_answer: string | null;
  correct_answer: string;
  is_correct: boolean | null;
  explanation: string;
}

export interface SpeedPerformance {
  average_seconds_per_question: number;
  benchmark_seconds_per_question: number;
  pace_status: "FAST" | "OPTIMAL" | "SLOW";
}

export interface AttemptReview extends AttemptResult {
  topic_performance: TopicPerformance[];
  weakest_topic: string | null;
  speed_performance: SpeedPerformance;
  answers: AnswerReview[];
}

export interface FreeTestInfoResponse {
  test_id: string;
  test_name: string;
  question_count: number;
  duration_seconds: number;
  has_active_attempt: boolean;
  active_attempt_id: string | null;
  active_guest_token: string | null;
  has_completed_free_test: boolean;
  last_attempt_id: string | null;
  last_guest_token: string | null;
}

export interface TestCreatePayload {
  name: string;
  description?: string | null;
  question_count: number;
  duration_seconds: number;
  category_id?: string | null;
  topic_id?: string | null;
  difficulty?: Difficulty | null;
  is_free?: boolean;
  is_premium?: boolean;
  price_inr?: number;
  negative_marking_ratio?: number;
  status?: TestStatus;
}

export interface TestUpdatePayload {
  name?: string;
  description?: string | null;
  question_count?: number;
  duration_seconds?: number;
  category_id?: string | null;
  topic_id?: string | null;
  difficulty?: Difficulty | null;
  is_free?: boolean;
  is_premium?: boolean;
  price_inr?: number;
  negative_marking_ratio?: number;
  status?: TestStatus;
}

export interface TestPreviewData {
  test_id: string;
  test_name: string;
  target_question_count: number;
  matching_pool_count: number;
  is_sufficient: boolean;
  sample_questions: PublicQuestion[];
}

