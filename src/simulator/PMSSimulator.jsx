import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Generator from './Generator';
import Busbar from './Busbar';

const MAIN_GENERATORS = ['DG1', 'DG2', 'DG3', 'DG4'];

export default function PMSSimulator() {
  const { engineState } = useGame();
  const [selectedGen, setSelectedGen] = useState('DG1');

  return (
    <div className="pms-simulator">
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
    </div>
  );
}
