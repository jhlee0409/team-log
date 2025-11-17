class ApiService {
  private baseUrl = 'http://localhost:3000';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
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
      const error = await response.json().catch(() => ({ message: 'Request failed' })) as { message?: string };
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getWorkspaces() {
    return this.fetch('/workspaces');
  }

  async createWorkspace(name: string) {
    return this.fetch('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async inviteMember(workspaceId: string, githubUsername: string) {
    return this.fetch(`/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ githubUsername }),
    });
  }

  async getYesterdayTasks(workspaceId: string) {
    return this.fetch(`/logs/${workspaceId}/yesterday-tasks`);
  }

  async getLog(workspaceId: string, date: string) {
    return this.fetch(`/logs/${workspaceId}?date=${date}`);
  }
}

export const apiService = new ApiService();
