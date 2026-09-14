export type UserRole = "USER" | "ADMIN";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  free_test_consumed: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GoogleAuthPayload {
  credential: string;
  guest_attempt_id?: string;
  guest_token?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Topic {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  category_id: string;
  topic_id: string;
  difficulty: Difficulty;
  estimated_time_seconds: number;
  is_premium: boolean;
  is_active: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionCreate {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  category_id: string;
  topic_id: string;
  difficulty: Difficulty;
  estimated_time_seconds: number;
  is_premium: boolean;
  is_active?: boolean;
  source?: string | null;
}

export type QuestionUpdate = QuestionCreate;

export interface QuestionPage {
  items: Question[];
  total: number;
  page: number;
  page_size: number;
}

export interface ImportErrorRow {
  row: number;
  errors: string[];
}

export interface ImportPreview {
  total_rows: number;
  valid_rows: QuestionCreate[];
  invalid_rows: ImportErrorRow[];
}

export interface ImportCommit {
  questions: QuestionCreate[];
}

export interface ImportResult {
  imported_count: number;
}


