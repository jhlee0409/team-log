import * as vscode from 'vscode';
import { TeamLogProvider } from './teamLogProvider';
import { AuthService } from './services/authService';

let badgeCount = 0;

export function activate(context: vscode.ExtensionContext) {
  console.log('TeamLog extension is now active');

  const authService = new AuthService();
  const teamLogProvider = new TeamLogProvider(context, authService);

  // Register the webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('teamlog.panel', teamLogProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    })
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('teamlog.openPanel', () => {
      vscode.commands.executeCommand('teamlog.panel.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('teamlog.refresh', () => {
      teamLogProvider.refresh();
    })
  );

  // Badge management
  context.subscriptions.push(
    vscode.commands.registerCommand('teamlog.setBadge', (count: number) => {
      badgeCount = count;
      // VS Code doesn't have a direct API for sidebar badges yet,
      // but we can use the title to show notifications
      if (count > 0) {
        vscode.window.showInformationMessage(`TeamLog: ${count} new mention(s)`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('teamlog.clearBadge', () => {
      badgeCount = 0;
    })
  );
}

export function deactivate() {
  console.log('TeamLog extension is now deactivated');
}
