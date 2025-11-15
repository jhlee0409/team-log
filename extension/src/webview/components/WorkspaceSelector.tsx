import React, { useState } from 'react';

interface Workspace {
  id: string;
  name: string;
}

interface Props {
  workspaces: Workspace[];
  onSelect: (workspace: Workspace) => void;
  onCreate: (name: string) => void;
}

export const WorkspaceSelector: React.FC<Props> = ({ workspaces, onSelect, onCreate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const handleCreate = () => {
    if (newWorkspaceName.trim()) {
      onCreate(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="workspace-selector">
      <h2>Select Workspace</h2>

      {workspaces.length > 0 ? (
        <div className="workspace-list">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              className="workspace-item"
              onClick={() => onSelect(ws)}
            >
              {ws.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-state">No workspaces yet. Create one to get started!</p>
      )}

      {isCreating ? (
        <div className="create-workspace">
          <input
            type="text"
            placeholder="Workspace name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate}>Create</button>
          <button onClick={() => setIsCreating(false)}>Cancel</button>
        </div>
      ) : (
        <button className="create-button" onClick={() => setIsCreating(true)}>
          + New Workspace
        </button>
      )}
    </div>
  );
};
