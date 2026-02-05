import React, { useState } from 'react';
import Busbar from './Busbar';
import WBDView from './WBDView';

export default function PMSSimulator() {
  const [view, setView] = useState('compact');

  return (
    <div className="pms-simulator">
      {/* View toggle */}
      <div className="pms-simulator__view-toggle">
        <button
          className={`pms-simulator__view-btn ${view === 'compact' ? 'pms-simulator__view-btn--active' : ''}`}
          onClick={() => setView('compact')}
        >Compact</button>
        <button
          className={`pms-simulator__view-btn ${view === 'wbd' ? 'pms-simulator__view-btn--active' : ''}`}
          onClick={() => setView('wbd')}
        >Full WBD</button>
      </div>

      {view === 'compact' ? (
        <div className="pms-simulator__middle">
          <Busbar />
        </div>
      ) : (
        <div className="pms-simulator__wbd">
          <WBDView />
        </div>
      )}
    </div>
  );
}
