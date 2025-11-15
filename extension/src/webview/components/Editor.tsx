import React, { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { WebsocketProvider } from 'y-websocket';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { apiService } from '../services/apiService';

interface Props {
  workspace: { id: string; name: string };
  user: { id: string; githubUsername: string };
  onBack: () => void;
}

export const Editor: React.FC<Props> = ({ workspace, user, onBack }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'yesterday'>('today');
  const [yesterdayContent, setYesterdayContent] = useState('');
  const lastContentRef = useRef('');

  useEffect(() => {
    if (!editorRef.current || viewMode === 'yesterday') return;

    // Initialize Yjs
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('content');

    // Get room name: workspaceId-YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const roomName = `${workspace.id}-${dateStr}`;

    // Connect to Yjs WebSocket server
    const provider = new WebsocketProvider('ws://localhost:1234', roomName, ydoc);
    providerRef.current = provider;

    provider.on('status', (event: { status: string }) => {
      console.log('Yjs connection status:', event.status);
    });

    // Add date header on first connect (if document is empty)
    provider.on('synced', (event: { synced: boolean }) => {
      if (event.synced && ytext.toString().trim() === '') {
        const header = generateDateHeader(today);
        ytext.insert(0, header);
      }
    });

    // Create CodeMirror editor
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        markdown(),
        yCollab(ytext, provider.awareness),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Monitor for @mentions
    ydoc.on('update', () => {
      const content = ytext.toString();
      if (content !== lastContentRef.current) {
        checkForMentions(content, lastContentRef.current, user.githubUsername);
        lastContentRef.current = content;
      }
    });

    lastContentRef.current = ytext.toString();

    return () => {
      view.destroy();
      provider.destroy();
    };
  }, [workspace.id, user.githubUsername, viewMode]);

  const generateDateHeader = (date: Date): string => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];

    return `## ${year}년 ${month}월 ${day}일 (${dayOfWeek})\n\n`;
  };

  const checkForMentions = (newContent: string, oldContent: string, username: string) => {
    const mention = `@${username}`;
    const newMentionCount = (newContent.match(new RegExp(mention, 'g')) || []).length;
    const oldMentionCount = (oldContent.match(new RegExp(mention, 'g')) || []).length;

    if (newMentionCount > oldMentionCount) {
      // New mention detected!
      vscode.postMessage({ type: 'setBadge', count: 1 });
    }
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;

    try {
      await apiService.inviteMember(workspace.id, inviteUsername);
      alert(`Successfully invited ${inviteUsername}!`);
      setInviteUsername('');
      setShowInvite(false);
    } catch (error: any) {
      alert(error.message || 'Failed to invite user');
    }
  };

  const handleImportYesterdayTasks = async () => {
    try {
      const { tasks } = await apiService.getYesterdayTasks(workspace.id);

      if (tasks.length === 0) {
        alert('No uncompleted tasks from yesterday!');
        return;
      }

      // Insert tasks into editor
      if (viewRef.current) {
        const content = viewRef.current.state.doc.toString();
        const tasksText = `\n### Tasks from yesterday\n${tasks.map((t: string) => `- [ ] ${t}`).join('\n')}\n`;

        viewRef.current.dispatch({
          changes: {
            from: content.length,
            insert: tasksText,
          },
        });
      }
    } catch (error) {
      alert('Failed to import yesterday\'s tasks');
    }
  };

  const viewYesterday = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const log = await apiService.getLog(workspace.id, dateStr);

      if (log) {
        setYesterdayContent(log.content);
        setViewMode('yesterday');
      } else {
        alert('No log found for yesterday');
      }
    } catch (error) {
      alert('Failed to load yesterday\'s log');
    }
  };

  if (viewMode === 'yesterday') {
    return (
      <div className="editor-container">
        <div className="toolbar">
          <button onClick={() => setViewMode('today')}>← Back to Today</button>
          <h3>Yesterday's Log (Read-only)</h3>
        </div>
        <div className="readonly-viewer">
          <pre>{yesterdayContent}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="toolbar">
        <button onClick={onBack}>← Workspaces</button>
        <h3>{workspace.name}</h3>
        <div className="toolbar-actions">
          <button onClick={viewYesterday}>📅 Yesterday</button>
          <button onClick={handleImportYesterdayTasks}>+ Import Tasks</button>
          <button onClick={() => setShowInvite(!showInvite)}>👥 Invite</button>
        </div>
      </div>

      {showInvite && (
        <div className="invite-panel">
          <input
            type="text"
            placeholder="@github-username"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
          />
          <button onClick={handleInvite}>Invite</button>
        </div>
      )}

      <div ref={editorRef} className="editor" />
    </div>
  );
};

declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
};

const vscode = acquireVsCodeApi();
