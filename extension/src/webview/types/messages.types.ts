// Extension <-> Webview Message Types (Discriminated Unions)

export type ExtensionMessage =
  | AuthenticatedMessage
  | RefreshMessage;

export interface AuthenticatedMessage {
  type: 'authenticated';
  token: string;
}

export interface RefreshMessage {
  type: 'refresh';
}

// Webview -> Extension Messages
export type WebviewMessage =
  | AuthenticateRequestMessage
  | SetBadgeMessage;

export interface AuthenticateRequestMessage {
  type: 'authenticate';
}

export interface SetBadgeMessage {
  type: 'setBadge';
  count: number;
}
