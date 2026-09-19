'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: '24px',
        backgroundColor: '#fbf8f2',
        color: '#122619',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #e7ddcf',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: '#122619',
          }}>
            Service Temporarily Unavailable
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#3d6148',
            lineHeight: '1.6',
            marginBottom: '24px',
          }}>
            Mana Grameena is experiencing a brief service interruption. Please refresh or try again in a few moments.
          </p>
          {error.digest && (
            <p style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#839688',
              marginBottom: '20px',
            }}>
              Incident: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              backgroundColor: '#1b3b26',
              color: '#fbf8f2',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh Application
          </button>
        </div>
      </body>
    </html>
  );
}
