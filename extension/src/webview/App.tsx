import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { Editor } from './components/Editor';
import { apiService, ApiServiceError } from './services/apiService';
import { User, Workspace, isAuthResponse, isWorkspaceArray, isWorkspace } from './types/api.types';
import { ExtensionMessage } from './types/messages.types';

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

      const data = await response.json();

      // Type guard validation
      if (isAuthResponse(data) && data.success) {
        setAuthToken(data.access_token);
        setUser(data.user);
        apiService.setToken(data.access_token);
        await loadWorkspaces();
      } else {
        throw new Error('Invalid authentication response format');
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      if (error instanceof ApiServiceError) {
        console.error(`Error code: ${error.code}, Details:`, error.details);
      }
    }
  };

  const loadWorkspaces = async () => {
    try {
      const ws = await apiService.getWorkspaces();

      // Type guard validation
      if (isWorkspaceArray(ws)) {
        setWorkspaces(ws);

        // Auto-select first workspace or create one if none exist
        if (ws.length > 0) {
          setSelectedWorkspace(ws[0]);
        }
      } else {
        throw new Error('Invalid workspaces response format');
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      if (error instanceof ApiServiceError) {
        console.error(`Error code: ${error.code}, Details:`, error.details);
      }
    }
  };

  const handleCreateWorkspace = async (name: string) => {
    try {
      const newWorkspace = await apiService.createWorkspace(name);

      // Type guard validation
      if (isWorkspace(newWorkspace)) {
        setWorkspaces([...workspaces, newWorkspace]);
        setSelectedWorkspace(newWorkspace);
      } else {
        throw new Error('Invalid workspace response format');
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
      if (error instanceof ApiServiceError) {
        console.error(`Error code: ${error.code}, Details:`, error.details);
      }
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
