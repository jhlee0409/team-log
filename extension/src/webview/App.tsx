import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { Editor } from './components/Editor';
import { apiService } from './services/apiService';

interface User {
  id: string;
  githubUsername: string;
  email: string;
  avatarUrl: string;
}

interface Workspace {
  id: string;
  name: string;
}

interface ExtensionMessage {
  type: string;
  token?: string;
  [key: string]: any;
}

const App: React.FC = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    // Listen for messages from extension
    window.addEventListener('message', handleMessage);

    // Request authentication on mount
    vscode.postMessage({ type: 'authenticate' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleMessage = async (event: MessageEvent<ExtensionMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'authenticated':
        if (message.token) {
          await handleAuthentication(message.token);
        }
        break;
      case 'refresh':
        if (authToken) {
          await loadWorkspaces();
        }
        break;
    }
  };

  const handleAuthentication = async (githubToken: string) => {
    try {
      // Exchange GitHub token for our JWT
      const response = await fetch('http://localhost:3000/auth/github/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: githubToken }),
      });

      const data = await response.json() as {
        success: boolean;
        access_token: string;
        user: User;
      };

      if (data.success) {
        setAuthToken(data.access_token);
        setUser(data.user);
        apiService.setToken(data.access_token);
        await loadWorkspaces();
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const ws = await apiService.getWorkspaces() as Workspace[];
      setWorkspaces(ws);

      // Auto-select first workspace or create one if none exist
      if (ws.length > 0) {
        setSelectedWorkspace(ws[0]);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleCreateWorkspace = async (name: string) => {
    try {
      const newWorkspace = await apiService.createWorkspace(name) as Workspace;
      setWorkspaces([...workspaces, newWorkspace]);
      setSelectedWorkspace(newWorkspace);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  if (!authToken || !user) {
    return <AuthScreen />;
  }

  if (!selectedWorkspace) {
    return (
      <WorkspaceSelector
        workspaces={workspaces}
        onSelect={setSelectedWorkspace}
        onCreate={handleCreateWorkspace}
      />
    );
  }

  return (
    <Editor
      workspace={selectedWorkspace}
      user={user}
      onBack={() => setSelectedWorkspace(null)}
    />
  );
};

// VS Code API type
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
};

const vscode = acquireVsCodeApi();

export default App;
