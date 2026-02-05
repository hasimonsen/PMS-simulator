import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import Generator from './Generator';
import EmergencyGen from './EmergencyGen';
import Busbar from './Busbar';
import EmergencyBus from './EmergencyBus';
import Synchroscope from './Synchroscope';
import BreakerPanel from './BreakerPanel';
import GovernorPanel from './GovernorPanel';
import AVRPanel from './AVRPanel';

const MAIN_GENERATORS = ['DG1', 'DG2', 'DG3', 'SG'];

export default function PMSSimulator() {
  const { engineState } = useGame();
  const { t } = useLang();
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

      {/* Middle row: Busbar diagram + Emergency section */}
      <div className="pms-simulator__middle">
        <div className="pms-simulator__busbar-section">
          <Busbar
            selectedGen={selectedGen}
            onSelectGen={setSelectedGen}
          />
        </div>
        <div className="pms-simulator__emergency-section">
          <EmergencyGen
            selected={selectedGen === 'EMG'}
            onSelect={() => setSelectedGen('EMG')}
          />
          <EmergencyBus />
        </div>
      </div>

      {/* Bottom row: Active generator control panels */}
      <div className="pms-simulator__controls">
        <div className="pms-simulator__controls-header">
          <span className="pms-simulator__controls-label">
            {t('governor')} / {t('avr')} / {t('synchroscope')} — {selectedGen}
          </span>
        </div>
        <div className="pms-simulator__controls-panels">
          <GovernorPanel genId={selectedGen} />
          <AVRPanel genId={selectedGen} />
          <Synchroscope genId={selectedGen} />
          <BreakerPanel genId={selectedGen} />
        </div>
      </div>
    </div>
  );
}
