import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Button, Input } from '@/shared/ui';
import { DEFAULT_SERVER_URL, STORAGE_KEYS } from '@/shared/config';
import './styles.css';

function Options() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);

  useEffect(() => {
    chrome.storage.sync.get([STORAGE_KEYS.serverUrl], (r) => {
      setServerUrl(r[STORAGE_KEYS.serverUrl] || DEFAULT_SERVER_URL);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    chrome.storage.sync.set({ [STORAGE_KEYS.serverUrl]: serverUrl }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(5000) });
      setTestResult(res.ok ? 'ok' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🃏</span>
        <h1 className="text-xl font-bold text-gray-900">Planning Poker Settings</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Input
          label="Server URL"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value.replace(/\/$/, ''))}
          placeholder="https://pln-pkr-chr-ext-production.up.railway.app"
          type="url"
        />

        <div className="flex gap-2">
          <Button type="submit" size="sm">
            {saved ? '✓ Saved' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={testing}
            onClick={handleTest}
          >
            Test Connection
          </Button>
        </div>

        {testResult === 'ok' && (
          <p className="text-sm text-emerald-600">✓ Server is reachable</p>
        )}
        {testResult === 'error' && (
          <p className="text-sm text-red-600">✗ Could not reach server. Check the URL.</p>
        )}
      </form>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">Self-hosting</p>
        <p>
          Run the server locally with <code className="bg-gray-100 px-1 rounded">pnpm dev</code>,
          or deploy to any VPS. The server URL should include the protocol and port.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <a
          href="https://buymeacoffee.com/jwebbb"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFDD00] px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-[#FFE74D] transition-colors"
          title="Support the developer"
        >
          <span>☕</span>
          Buy me a coffee
        </a>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
