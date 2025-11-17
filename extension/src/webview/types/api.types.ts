// API Response Types

export interface User {
  id: string;
  githubUsername: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface Workspace {
  id: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  access_token: string;
  user: User;
}

export interface DailyLog {
  id: string;
  workspaceId: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface YesterdayTasksResponse {
  tasks: string[];
}

// Backend Error Response (from CLAUDE.md P1-1-ERROR_HANDLING.md)
export interface ApiError {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  traceId: string;
  details?: any;
}

// Type Guards
export function isAuthResponse(data: unknown): data is AuthResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    'access_token' in data &&
    'user' in data &&
    typeof (data as any).access_token === 'string'
  );
}

export function isWorkspaceArray(data: unknown): data is Workspace[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'name' in item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string'
    )
  );
}

export function isWorkspace(data: unknown): data is Workspace {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).name === 'string'
  );
}

export function isDailyLog(data: unknown): data is DailyLog {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'content' in data &&
    typeof (data as any).content === 'string'
  );
}

export function isYesterdayTasksResponse(data: unknown): data is YesterdayTasksResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tasks' in data &&
    Array.isArray((data as any).tasks) &&
    (data as any).tasks.every((task: unknown) => typeof task === 'string')
  );
}

export function isApiError(data: unknown): data is ApiError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    'message' in data &&
    typeof (data as any).code === 'string' &&
    typeof (data as any).message === 'string'
  );
}
