import {
  AuthResponse,
  Category,
  Difficulty,
  ImportCommit,
  ImportPreview,
  ImportResult,
  Question,
  QuestionCreate,
  QuestionPage,
  QuestionUpdate,
  Topic,
  User,
} from "@/types/admin";
import {
  AttemptResult,
  AttemptReview,
  FreeTestInfoResponse,
  StartAttemptResponse,
  Test,
  TestCreatePayload,
  TestPreviewData,
  TestUpdatePayload,
} from "@/types/test";
import {
  AdminAnalyticsData,
  CreateOrderResponse,
  MembershipStatus,
  PaymentRecord,
  PaymentVerificationResponse,
  Product,
  StudentDashboardData,
  UserAttemptRecord,
} from "@/types/commerce";
import { clearAuth, getToken, setToken, setUser } from "./auth";


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/login")) {
        window.location.href = "/admin/login?error=session_expired";
      }
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    let errorMessage = `API request failed (${response.status})`;
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail.map((e: { msg?: string }) => e.msg || "").join("; ");
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// Auth APIs
export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

// Taxonomy APIs (Public / cached)
export async function getCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export async function getTopics(categoryId?: string): Promise<Topic[]> {
  const query = categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : "";
  return request<Topic[]>(`/topics${query}`);
}

// Admin Question APIs
export interface QuestionFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  isActive?: boolean;
}

export async function getQuestions(params: QuestionFilterParams = {}): Promise<QuestionPage> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("page_size", params.pageSize.toString());
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("category_id", params.categoryId);
  if (params.topicId) query.set("topic_id", params.topicId);
  if (params.difficulty) query.set("difficulty", params.difficulty);
  if (params.isActive !== undefined) query.set("is_active", params.isActive.toString());

  const queryString = query.toString() ? `?${query.toString()}` : "";
  return request<QuestionPage>(`/admin/questions${queryString}`);
}

export async function getQuestion(id: string): Promise<Question> {
  return request<Question>(`/admin/questions/${encodeURIComponent(id)}`);
}

export async function createQuestion(payload: QuestionCreate): Promise<Question> {
  return request<Question>("/admin/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQuestion(id: string, payload: QuestionUpdate): Promise<Question> {
  return request<Question>(`/admin/questions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deactivateQuestion(id: string): Promise<void> {
  return request<void>(`/admin/questions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function activateQuestion(id: string): Promise<Question> {
  return request<Question>(`/admin/questions/${encodeURIComponent(id)}/activate`, {
    method: "PATCH",
  });
}

// CSV APIs
export function getTemplateDownloadUrl(): string {
  return `${API_URL}/admin/questions/import/template`;
}

export async function downloadCsvTemplate(): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}/admin/questions/import/template`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Failed to download template");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "question-import-template.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function previewCsvImport(file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("file", file);
  return request<ImportPreview>("/admin/questions/import/preview", {
    method: "POST",
    body: formData,
  });
}

export async function commitCsvImport(questions: QuestionCreate[]): Promise<ImportResult> {
  const payload: ImportCommit = { questions };
  return request<ImportResult>("/admin/questions/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Student Test Engine APIs
export async function getPublishedTests(): Promise<Test[]> {
  return request<Test[]>("/tests");
}

export async function getTest(testId: string): Promise<Test> {
  return request<Test>(`/tests/${encodeURIComponent(testId)}`);
}

export async function getFreeTestInfo(): Promise<FreeTestInfoResponse> {
  return request<FreeTestInfoResponse>("/tests/free/info");
}

export async function startFreeTest(): Promise<StartAttemptResponse> {
  return request<StartAttemptResponse>("/tests/free/start", {
    method: "POST",
  });
}

export async function startTest(testId: string): Promise<StartAttemptResponse> {
  return request<StartAttemptResponse>(`/tests/${encodeURIComponent(testId)}/start`, {
    method: "POST",
  });
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  guestToken: string,
  selectedAnswer: string | null,
  timeSpentSeconds?: number
): Promise<void> {
  return request<void>(`/attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`, {
    method: "PUT",
    body: JSON.stringify({
      guest_token: guestToken,
      selected_answer: selectedAnswer,
      time_spent_seconds: timeSpentSeconds,
    }),
  });
}

export async function submitAttempt(attemptId: string, guestToken: string): Promise<AttemptResult> {
  return request<AttemptResult>(`/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
    body: JSON.stringify({ guest_token: guestToken }),
  });
}

export async function getAttempt(attemptId: string, guestToken: string): Promise<StartAttemptResponse> {
  return request<StartAttemptResponse>(
    `/attempts/${encodeURIComponent(attemptId)}?guest_token=${encodeURIComponent(guestToken)}`
  );
}

export async function getAttemptResult(attemptId: string, guestToken: string): Promise<AttemptReview> {
  return request<AttemptReview>(
    `/attempts/${encodeURIComponent(attemptId)}/result?guest_token=${encodeURIComponent(guestToken)}`
  );
}

// Student Authentication APIs
export async function studentRegister(payload: {
  email: string;
  password: string;
  full_name?: string;
  guest_attempt_id?: string;
  guest_token?: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(res.access_token);
  setUser(res.user);
  return res;
}

export async function studentLogin(payload: {
  email: string;
  password: string;
  guest_attempt_id?: string;
  guest_token?: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(res.access_token);
  setUser(res.user);
  return res;
}

export async function studentGoogleLogin(payload: {
  credential: string;
  guest_attempt_id?: string;
  guest_token?: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(res.access_token);
  setUser(res.user);
  return res;
}

export async function studentLogout(): Promise<void> {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearAuth();
  }
}

export async function getStudentMe(): Promise<User> {
  return request<User>("/auth/me");
}

// Commerce & Products APIs
export async function getProducts(): Promise<Product[]> {
  return request<Product[]>("/products");
}

export async function createPaymentOrder(productId: string): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>("/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function verifyPayment(payload: {
  order_id: string;
  payment_id: string;
  signature: string;
}): Promise<PaymentVerificationResponse> {
  return request<PaymentVerificationResponse>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getUserMembership(): Promise<MembershipStatus> {
  return request<MembershipStatus>("/users/me/membership");
}

export async function getUserAttempts(): Promise<UserAttemptRecord[]> {
  return request<UserAttemptRecord[]>("/users/me/attempts");
}

export async function getUserPayments(): Promise<PaymentRecord[]> {
  return request<PaymentRecord[]>("/users/me/payments");
}

// Admin Commerce APIs
export async function adminGetProducts(): Promise<Product[]> {
  return request<Product[]>("/admin/products");
}

export async function adminCreateProduct(payload: Partial<Product>): Promise<Product> {
  return request<Product>("/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateProduct(productId: string, payload: Partial<Product>): Promise<Product> {
  return request<Product>(`/admin/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  return request<StudentDashboardData>("/users/me/dashboard");
}

// Admin Analytics APIs
export async function adminGetAnalytics(): Promise<AdminAnalyticsData> {
  return request<AdminAnalyticsData>("/admin/analytics");
}

// Admin Test Management APIs
export async function adminGetTests(): Promise<Test[]> {
  return request<Test[]>("/admin/tests");
}

export async function adminGetTest(testId: string): Promise<Test> {
  return request<Test>(`/admin/tests/${encodeURIComponent(testId)}`);
}

export async function adminCreateTest(payload: TestCreatePayload): Promise<Test> {
  return request<Test>("/admin/tests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateTest(testId: string, payload: TestUpdatePayload): Promise<Test> {
  return request<Test>(`/admin/tests/${encodeURIComponent(testId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminPublishTest(testId: string): Promise<Test> {
  return request<Test>(`/admin/tests/${encodeURIComponent(testId)}/publish`, {
    method: "POST",
  });
}

export async function adminArchiveTest(testId: string): Promise<Test> {
  return request<Test>(`/admin/tests/${encodeURIComponent(testId)}/archive`, {
    method: "POST",
  });
}

export async function adminPreviewTest(testId: string): Promise<TestPreviewData> {
  return request<TestPreviewData>(`/admin/tests/${encodeURIComponent(testId)}/preview`);
}




