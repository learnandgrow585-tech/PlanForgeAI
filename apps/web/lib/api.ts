import type { PlanJSON } from '@planforge/shared-types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Try to mint a new access token from the stored refresh token. */
async function tryRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(init.headers ?? {}),
    },
  });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, init);

  // Access token likely expired — silently refresh once and retry.
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawFetch(path, init);
  }

  if (res.status === 401) {
    // Refresh failed too — session is truly over.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    throw new Error('Your session expired. Please sign in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── Response types ────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PlannerSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  inputSchema: {
    preferredModelTier?: string;
    inputFields: Array<{
      name: string;
      label: string;
      type: string;
      placeholder?: string;
      required?: boolean;
      options?: { label: string; value: string }[];
      min?: number;
      max?: number;
      step?: number;
      helpText?: string;
    }>;
  };
}

export interface PlanSummary {
  id: string;
  title: string;
  status: string;
  plannerName: string;
  createdAt: string;
}

export interface PlanDetail extends PlanSummary {
  planData: PlanJSON;
  updatedAt: string;
  milestones: Array<{
    id: string;
    title: string;
    status: string;
    targetDate?: string;
    completedAt?: string;
    order: number;
  }>;
}

export interface DashboardSummary {
  counts: {
    activePlans: number;
    totalPlans: number;
    totalMilestones: number;
    completedMilestones: number;
    completionRate: number;
  };
  streak: number;
  upcoming: Array<{ planId: string; planTitle: string; title: string; targetDate: string | null }>;
  nextActions: Array<{ planId: string; planTitle: string; nextMilestone: string | null }>;
}

// ── API client ────────────────────────────────────────────────
export const apiClient = {
  login: (email: string, password: string) =>
    api<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    api<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  planners: () => api<PlannerSummary[]>('/planners'),

  getPlanner: (slug: string) => api<PlannerSummary>(`/planners/${slug}`),

  plans: () => api<PlanSummary[]>('/plans'),

  getPlan: (id: string) => api<PlanDetail>(`/plans/${id}`),

  createPlan: (body: {
    plannerId: string;
    title: string;
    goal: string;
    formData: Record<string, unknown>;
  }) =>
    api<{ id: string }>('/plans', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () =>
    api<{ id: string; email: string; name: string | null; role: string; subscriptionTier: string; createdAt: string }>('/auth/me'),

  summary: () => api<DashboardSummary>('/plans/summary'),

  toggleMilestone: (planId: string, milestoneId: string) =>
    api<void>(`/plans/${planId}/milestones/${milestoneId}/complete`, { method: 'PATCH' }),

  addMilestone: (planId: string, title: string, description?: string) =>
    api<void>(`/plans/${planId}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),

  reorderMilestone: (planId: string, milestoneId: string, direction: 'up' | 'down') =>
    api<void>(`/plans/${planId}/milestones/${milestoneId}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ direction }),
    }),

  deleteMilestone: (planId: string, milestoneId: string) =>
    api<void>(`/plans/${planId}/milestones/${milestoneId}`, { method: 'DELETE' }),

  retryPlan: (planId: string) => api<{ planId: string }>(`/plans/${planId}/retry`, { method: 'POST' }),

  deletePlan: (planId: string) => api<void>(`/plans/${planId}`, { method: 'DELETE' }),

  knowledge: (planId: string) => api<KnowledgeResult>(`/knowledge-hub/plan/${planId}`),
  refreshKnowledge: (planId: string) =>
    api<KnowledgeResult>(`/knowledge-hub/plan/${planId}/refresh`, { method: 'POST' }),
  milestoneKnowledge: (milestoneId: string) =>
    api<KnowledgeResult>(`/knowledge-hub/milestone/${milestoneId}`),

  search: (q: string) => api<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};

export interface KnowledgeResult {
  topic: string;
  youtubeEnabled: boolean;
  videos: Array<{ id: string; title: string; channel: string; thumbnail: string; views: number; url: string }>;
  blogs: Array<{ title: string; url: string; sourceName: string; summary: string; readingTimeMinutes: number; difficulty: string }>;
}

export interface SearchResults {
  planners: Array<{ slug: string; name: string; description: string; category: string; icon: string }>;
  plans: Array<{ id: string; title: string; status: string; plannerName: string }>;
}

// ── Admin (SUPER_ADMIN only) ──────────────────────────────────
export interface AdminStats {
  totals: { users: number; plans: number; activePlanners: number; newUsers7d: number };
  plansByPlanner: Array<{ planner: string; count: number }>;
  plansByStatus: Array<{ status: string; count: number }>;
}
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionTier: string;
  isActive: boolean;
  planCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}
export interface AdminPlanner {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  order: number;
  isActive: boolean;
  inputSchema: unknown;
  systemPromptTemplate: string;
}
export interface AuditEntry {
  id: string;
  action: string;
  target: string | null;
  createdAt: string;
  actor: { email: string } | null;
}

export const adminClient = {
  stats: () => api<AdminStats>('/admin/stats'),
  audit: () => api<AuditEntry[]>('/admin/audit'),
  users: () => api<AdminUser[]>('/admin/users'),
  setUserActive: (id: string, isActive: boolean) =>
    api<void>(`/admin/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  setUserRole: (id: string, role: string) =>
    api<void>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  deleteUser: (id: string) => api<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  planners: () => api<AdminPlanner[]>('/admin/planners'),
  createPlanner: (data: Record<string, unknown>) =>
    api<AdminPlanner>('/admin/planners', { method: 'POST', body: JSON.stringify(data) }),
  updatePlanner: (id: string, data: Record<string, unknown>) =>
    api<AdminPlanner>(`/admin/planners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlanner: (id: string) => api<{ deleted?: boolean; disabled?: boolean; reason?: string }>(`/admin/planners/${id}`, { method: 'DELETE' }),

  // Blog CMS
  blogList: () => api<BlogAdminPost[]>('/admin/blog'),
  blogGet: (id: string) => api<BlogAdminPost>(`/admin/blog/${id}`),
  blogCreate: (data: Record<string, unknown>) => api<BlogAdminPost>('/admin/blog', { method: 'POST', body: JSON.stringify(data) }),
  blogUpdate: (id: string, data: Record<string, unknown>) => api<BlogAdminPost>(`/admin/blog/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  blogDelete: (id: string) => api<void>(`/admin/blog/${id}`, { method: 'DELETE' }),
};

export interface BlogAdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
}
