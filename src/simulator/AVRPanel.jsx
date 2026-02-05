import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

const VOLTAGE_MIN = 620;
const VOLTAGE_MAX = 760;

export default function AVRPanel({ genId }) {
  const { engineState, setAvrSetpoint } = useGame();
  const { t } = useLang();

  const gen = engineState?.generators?.[genId];

  const voltageSetpoint = gen?.avrSetpoint ?? 690;
  const voltage = gen?.voltage || 0;
  const reactivePower = gen?.reactivePower || 0;
  const activePower = gen?.activePower || 0;
  const apparentPower = Math.sqrt(activePower * activePower + reactivePower * reactivePower);
  const powerFactor = apparentPower > 0 ? activePower / apparentPower : 1.0;

  function handleSetpointChange(e) {
    setAvrSetpoint(genId, parseFloat(e.target.value));
  }

  return (
    <div className="avr-panel">
      <div className="avr-panel__title">{t('avr')} - {genId}</div>

      {/* Voltage setpoint slider */}
      <div className="avr-panel__control">
        <label className="avr-panel__control-label">
          {t('voltageSetpoint')}: {Math.round(voltageSetpoint)} V
        </label>
        <input
          type="range"
          className="avr-panel__slider"
          min={VOLTAGE_MIN}
          max={VOLTAGE_MAX}
          step={1}
          value={voltageSetpoint}
          onChange={handleSetpointChange}
        />
        <div className="avr-panel__slider-range">
          <span>{VOLTAGE_MIN} V</span>
          <span>{VOLTAGE_MAX} V</span>
        </div>
      </div>

      {/* Current readings */}
      <div className="avr-panel__readings">
        <div className="avr-panel__reading">
          <span className="avr-panel__reading-label">{t('voltage')}</span>
          <span className="avr-panel__reading-value">{Math.round(voltage)} V</span>
        </div>
        <div className="avr-panel__reading">
          <span className="avr-panel__reading-label">{t('reactivePower')}</span>
          <span className="avr-panel__reading-value">{Math.round(reactivePower)} kVAR</span>
        </div>
        <div className="avr-panel__reading">
          <span className="avr-panel__reading-label">{t('powerFactor')}</span>
          <span className="avr-panel__reading-value">{powerFactor.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
