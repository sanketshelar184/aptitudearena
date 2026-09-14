export type ProductType = "TEST" | "SUBSCRIPTION";
export type PaymentStatus = "CREATED" | "PAID" | "FAILED" | "REFUNDED";
export type SubscriptionStatus = "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  product_type: ProductType;
  price_paise: number;
  price_inr: number;
  currency: string;
  question_limit: number | null;
  duration_seconds: number | null;
  billing_interval_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderResponse {
  order_id: string;
  amount_paise: number;
  amount_inr: number;
  currency: string;
  product_id: string;
  product_name: string;
  product_type: ProductType;
  razorpay_key_id: string | null;
  is_mock_mode: boolean;
}

export interface PaymentVerificationResponse {
  success: boolean;
  payment_id: string;
  order_id: string;
  status: PaymentStatus;
  message: string;
  entitlement_id: string | null;
  subscription_id: string | null;
}

export interface MembershipStatus {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_subscribed: boolean;
  subscription_status: SubscriptionStatus | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  available_test_credits: number;
  free_test_consumed: boolean;
}

export interface PaymentRecord {
  id: string;
  product_name: string;
  product_type: ProductType;
  amount_inr: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  created_at: string;
}

export interface UserAttemptRecord {
  id: string;
  test_id: string;
  test_name: string;
  status: string;
  score: number | null;
  total_questions: number;
  correct_count: number | null;
  wrong_count: number | null;
  skipped_count: number | null;
  accuracy: number | null;
  time_taken_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
}

export interface TopicWeakness {
  category_name: string;
  topic_name: string;
  total_questions: number;
  correct_questions: number;
  accuracy: number;
}

export interface StudentDashboardData {
  user_name: string;
  email: string;
  role: string;
  is_subscribed: boolean;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  available_test_credits: number;
  free_test_consumed: boolean;
  tests_completed: number;
  questions_attempted: number;
  overall_accuracy: number;
  average_time_per_question_seconds: number;
  best_score: number | null;
  best_score_total: number | null;
  best_accuracy: number | null;
  streak_days: number;
  weak_topics: TopicWeakness[];
  recent_attempts: UserAttemptRecord[];
}

export interface RecentRegistration {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface RecentPaymentRecord {
  id: string;
  user_email: string;
  amount_inr: number;
  status: PaymentStatus;
  product_name: string;
  created_at: string;
}

export interface PopularTestRecord {
  test_id: string;
  test_name: string;
  attempt_count: number;
  average_accuracy: number;
}

export interface AdminAnalyticsData {
  total_users: number;
  total_tests_taken: number;
  total_questions_in_bank: number;
  total_revenue_inr: number;
  paid_purchases_count: number;
  active_subscriptions_count: number;
  recent_registrations: RecentRegistration[];
  recent_payments: RecentPaymentRecord[];
  popular_tests: PopularTestRecord[];
}

