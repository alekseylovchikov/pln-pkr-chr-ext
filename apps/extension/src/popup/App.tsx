import { useState } from 'react';
import { Button } from '@/shared/ui';

export function App() {
  const [code, setCode] = useState('');

  function openSidePanel() {
    chrome.windows.getCurrent({ populate: false }, (win) => {
      if (win.id !== undefined) {
        chrome.sidePanel.open({ windowId: win.id });
      }
    });
  }

  function openSidePanelWithCode() {
    // Store the code for the side panel to pick up
    if (code.length === 6) {
      chrome.storage.session.set({ pendingRoomCode: code.toUpperCase() }, () => {
        openSidePanel();
        window.close();
      });
    } else {
      openSidePanel();
      window.close();
    }
  }

  return (
    <div className="w-64 bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">🃏</span>
        <h1 className="text-sm font-bold text-gray-900">Planning Poker</h1>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-mono uppercase tracking-widest text-center focus:border-indigo-500 focus:outline-none"
          />
          <Button
            size="sm"
            variant={code.length === 6 ? 'primary' : 'secondary'}
            onClick={openSidePanelWithCode}
          >
            Join
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative text-center">
            <span className="bg-white px-2 text-xs text-gray-400">or</span>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={() => {
            chrome.storage.session.set({ openView: 'create-room' }, () => {
              openSidePanel();
              window.close();
            });
          }}
        >
          + Create Room
        </Button>

        <Button size="sm" variant="ghost" className="w-full" onClick={openSidePanel}>
          Open Side Panel
        </Button>
      </div>

      <div className="px-4 py-2 border-t border-gray-100">
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
