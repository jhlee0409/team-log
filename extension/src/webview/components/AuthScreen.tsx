import React from 'react';

export const AuthScreen: React.FC = () => {
  return (
    <div className="auth-screen">
      <div className="auth-content">
        <h2>🌊 TeamLog</h2>
        <p>Authenticating with GitHub...</p>
        <div className="spinner"></div>
      </div>
    </div>
  );
};
