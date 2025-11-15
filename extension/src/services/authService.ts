import * as vscode from 'vscode';

export class AuthService {
  async authenticate(): Promise<vscode.AuthenticationSession | undefined> {
    try {
      // Get GitHub session from VS Code's built-in authentication
      const session = await vscode.authentication.getSession('github', ['user:email'], {
        createIfNone: true,
      });

      return session;
    } catch (error) {
      vscode.window.showErrorMessage('Failed to authenticate with GitHub');
      console.error('Authentication failed:', error);
      return undefined;
    }
  }

  async getSession(): Promise<vscode.AuthenticationSession | undefined> {
    try {
      return await vscode.authentication.getSession('github', ['user:email'], {
        createIfNone: false,
      });
    } catch (error) {
      return undefined;
    }
  }
}
