import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Generator from './Generator';
import Busbar from './Busbar';
import WBDView from './WBDView';

const MAIN_GENERATORS = ['DG1', 'DG2', 'DG3', 'DG4'];

export default function PMSSimulator() {
  const { engineState } = useGame();
  const [selectedGen, setSelectedGen] = useState('DG1');
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
        <>
          {/* Top row: Generator panels */}
          <div className="pms-simulator__generators">
            {MAIN_GENERATORS.map((genId) => (
              <Generator
                key={genId}
                genId={genId}
                selected={selectedGen === genId}
                onSelect={() => setSelectedGen(genId)}
              />
            ))}
          </div>

          {/* Main area: Busbar diagram with all controls in popups */}
          <div className="pms-simulator__middle">
            <Busbar
              selectedGen={selectedGen}
              onSelectGen={setSelectedGen}
            />
          </div>
        </>
      ) : (
        <div className="pms-simulator__wbd">
          <WBDView />
        </div>
      )}
    </div>
  );
}
