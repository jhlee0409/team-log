import {
  Workspace,
  DailyLog,
  YesterdayTasksResponse,
  ApiError,
  isApiError,
} from '../types/api.types';

/**
 * Custom error class for API errors matching backend format
 * Backend returns: { code, message, timestamp, path, traceId, details }
 */
export class ApiServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiServiceError';
  }
}

class ApiService {
  private baseUrl = 'http://localhost:3000';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to parse backend error response
      const errorData = await response.json().catch(() => null);

      if (errorData && isApiError(errorData)) {
        throw new ApiServiceError(
          errorData.code,
          errorData.message,
          response.status,
          errorData.details
        );
      }

      // Fallback for non-standard errors
      throw new ApiServiceError(
        'UNKNOWN_ERROR',
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    return response.json();
  }

  async getWorkspaces(): Promise<Workspace[]> {
    return this.fetch<Workspace[]>('/workspaces');
  }

  async createWorkspace(name: string): Promise<Workspace> {
    return this.fetch<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async inviteMember(workspaceId: string, githubUsername: string): Promise<void> {
    await this.fetch<void>(`/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ githubUsername }),
    });
  }

  async getYesterdayTasks(workspaceId: string): Promise<YesterdayTasksResponse> {
    return this.fetch<YesterdayTasksResponse>(`/logs/${workspaceId}/yesterday-tasks`);
  }

  async getLog(workspaceId: string, date: string): Promise<DailyLog | null> {
    return this.fetch<DailyLog | null>(`/logs/${workspaceId}?date=${date}`);
  }
}

export const apiService = new ApiService();
