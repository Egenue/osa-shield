export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export type BackendUser = {
  id?: string;
  user_id?: string;
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  trustScore?: number;
  totalScans?: number;
  totalReports?: number;
  location?: string | null;
};

export type AnalysisTrigger = {
  key: string;
  label: string;
  icon: string;
  description: string;
  matches: string[];
};

export type ScamAnalysisResponse = {
  prediction: string;
  spam_probability: number;
  threshold: number;
  triggers: AnalysisTrigger[];
  explanation: string;
  is_scam: boolean;
  scan_id: string;
  stored_scam_id: string | null;
  stored_in_community: boolean;
  location: string | null;
};

export type CommunityReport = {
  id: string;
  type: string;
  source: string;
  content: string;
  prediction: string;
  spamProbability: number;
  threshold: number | null;
  triggers: AnalysisTrigger[];
  explanation: string | null;
  location: string;
  verified: boolean;
  anonymous: boolean;
  reporterName: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  currentUserVote: 'like' | 'dislike' | null;
};

export type ProfileActivity = {
  id: string;
  type: 'scan' | 'report';
  label: string;
  status: string;
  details: string | null;
  createdAt: string;
};

export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    if (data?.message) {
      return data.message;
    }
  } catch {
    // Fall through to the generic error below.
  }

  return 'Request failed.';
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
