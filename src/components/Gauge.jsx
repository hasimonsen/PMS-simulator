import React from 'react';

export default function Gauge({ label, value, min, max, unit, zones, vertical }) {
  const range = max - min;
  const percent = Math.max(0, Math.min(100, ((value - min) / range) * 100));

  const defaultZones = [
    { start: 0, end: 20, color: '#ff4444' },
    { start: 20, end: 80, color: '#44ff44' },
    { start: 80, end: 100, color: '#ff4444' },
  ];

  const activeZones = zones || defaultZones;

  function getBarColor() {
    for (const zone of activeZones) {
      if (percent >= zone.start && percent <= zone.end) {
        return zone.color;
      }
    }
    return '#44ff44';
  }

  if (vertical) {
    return (
      <div className="gauge gauge--vertical">
        {label && <div className="gauge__label">{label}</div>}
        <div className="gauge__track gauge__track--vertical">
          {activeZones.map((zone, i) => (
            <div
              key={i}
              className="gauge__zone"
              style={{
                bottom: `${zone.start}%`,
                height: `${zone.end - zone.start}%`,
                backgroundColor: zone.color,
                opacity: 0.15,
              }}
            />
          ))}
          <div
            className="gauge__fill gauge__fill--vertical"
            style={{
              height: `${percent}%`,
              backgroundColor: getBarColor(),
            }}
          />
        </div>
        <div className="gauge__value">
          {typeof value === 'number' ? value.toFixed(1) : value}
          {unit && <span className="gauge__unit">{unit}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="gauge gauge--horizontal">
      {label && <div className="gauge__label">{label}</div>}
      <div className="gauge__track">
        {activeZones.map((zone, i) => (
          <div
            key={i}
            className="gauge__zone"
            style={{
              left: `${zone.start}%`,
              width: `${zone.end - zone.start}%`,
              backgroundColor: zone.color,
              opacity: 0.15,
            }}
          />
        ))}
        <div
          className="gauge__fill"
          style={{
            width: `${percent}%`,
            backgroundColor: getBarColor(),
          }}
        />
      </div>
      <div className="gauge__value">
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span className="gauge__unit">{unit}</span>}
      </div>
    </div>
  );
}
