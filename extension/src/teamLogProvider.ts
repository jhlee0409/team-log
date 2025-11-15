import * as vscode from 'vscode';
import { AuthService } from './services/authService';

export class TeamLogProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly authService: AuthService
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'authenticate':
            const session = await this.authService.authenticate();
            if (session) {
              webviewView.webview.postMessage({
                type: 'authenticated',
                token: session.accessToken,
              });
            }
            break;
          case 'setBadge':
            vscode.commands.executeCommand('teamlog.setBadge', message.count);
            break;
          case 'clearBadge':
            vscode.commands.executeCommand('teamlog.clearBadge');
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    // Clear badge when view becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        vscode.commands.executeCommand('teamlog.clearBadge');
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'refresh' });
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.js')
    );

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src http://localhost:3000 ws://localhost:1234;">
  <title>TeamLog</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
