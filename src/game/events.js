// ============================================================================
// events.js - PMS Simulator Random Events System
// ============================================================================
// Generates and applies random events during gameplay based on difficulty.
// Higher difficulty levels produce more frequent and severe events.
// ============================================================================

/**
 * Event type constants
 */
export const EVENT_TYPES = {
  LOAD_STEP_UP: 'load_step_up',
  LOAD_STEP_DOWN: 'load_step_down',
  LOAD_FLUCTUATION: 'load_fluctuation',
  GENERATOR_TRIP: 'generator_trip',
  GOVERNOR_FAULT: 'governor_fault',
};

/**
 * Human-readable labels for event types (maps to i18n or direct display)
 */
export const EVENT_LABELS = {
  [EVENT_TYPES.LOAD_STEP_UP]: 'Load Step Increase',
  [EVENT_TYPES.LOAD_STEP_DOWN]: 'Load Step Decrease',
  [EVENT_TYPES.LOAD_FLUCTUATION]: 'Load Fluctuation',
  [EVENT_TYPES.GENERATOR_TRIP]: 'Generator Trip',
  [EVENT_TYPES.GOVERNOR_FAULT]: 'Governor Fault',
};

/**
 * Event severity levels
 */
export const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Generate a random event based on current difficulty and engine state.
 *
 * The probability of an event occurring increases with difficulty.
 * At difficulty 1, events are very rare. At difficulty 13, events are frequent.
 *
 * @param {number} difficulty   - Current difficulty level (1-13)
 * @param {object} engineState  - Current snapshot of the engine state
 * @returns {object|null} Event object { type, target, value, delay, severity } or null
 */
export function generateRandomEvent(difficulty, engineState) {
  // Base probability: 2% at difficulty 1, up to ~30% at difficulty 13
  // This is called each game tick (~1 second intervals typically)
  const baseProbability = 0.02;
  const difficultyScale = 0.022; // ~2.2% increase per difficulty level
  const eventProbability = baseProbability + (difficulty - 1) * difficultyScale;

  // Roll the dice
  if (Math.random() > eventProbability) {
    return null; // No event this tick
  }

  // Determine which generators are currently online
  const onlineGens = _getOnlineGenerators(engineState);

  // No events if no generators are online (nothing to affect)
  if (onlineGens.length === 0) {
    return null;
  }

  // Build weighted event pool based on difficulty
  const eventPool = _buildEventPool(difficulty, onlineGens, engineState);

  if (eventPool.length === 0) {
    return null;
  }

  // Select random event from weighted pool
  const totalWeight = eventPool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const candidate of eventPool) {
    roll -= candidate.weight;
    if (roll <= 0) {
      return candidate.event;
    }
  }

  // Fallback: return the last event in the pool
  return eventPool[eventPool.length - 1].event;
}

/**
 * Apply an event to the engine.
 *
 * @param {object} engine - The PMSEngine instance
 * @param {object} event  - The event object from generateRandomEvent
 */
export function applyEvent(engine, event) {
  if (!event || !event.type) return;

  const delay = (event.delay || 0) * 1000;

  const execute = () => {
    switch (event.type) {
      case EVENT_TYPES.LOAD_STEP_UP: {
        // Increase load demand by the specified value
        const currentLoad = engine.getLoadDemand();
        engine.setLoadDemand(currentLoad + event.value);
        break;
      }

      case EVENT_TYPES.LOAD_STEP_DOWN: {
        // Decrease load demand (floor at 0)
        const currentLoad = engine.getLoadDemand();
        engine.setLoadDemand(Math.max(0, currentLoad - event.value));
        break;
      }

      case EVENT_TYPES.LOAD_FLUCTUATION: {
        // Apply a temporary load fluctuation (oscillating load)
        // The value is the amplitude of fluctuation in kW
        const currentLoad = engine.getLoadDemand();
        const amplitude = event.value;
        const duration = event.duration || 10; // seconds
        const period = event.period || 3;      // seconds per cycle

        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 0.5;
          if (elapsed >= duration) {
            // Restore original load
            engine.setLoadDemand(currentLoad);
            clearInterval(interval);
            return;
          }
          const fluctuation = amplitude * Math.sin((2 * Math.PI * elapsed) / period);
          engine.setLoadDemand(Math.max(0, currentLoad + fluctuation));
        }, 500);
        break;
      }

      case EVENT_TYPES.GENERATOR_TRIP: {
        // Trip a specific generator
        if (event.target) {
          engine.tripGenerator(event.target, event.reason || 'trip.overcurrent');
        }
        break;
      }

      case EVENT_TYPES.GOVERNOR_FAULT: {
        // Simulate a governor fault: force speed setpoint to a bad value
        if (event.target) {
          engine.forceGovernorFault(event.target, {
            faultySetpoint: event.value,
            duration: event.duration || 15,
          });
        }
        break;
      }

      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  };

  if (delay > 0) {
    setTimeout(execute, delay);
  } else {
    execute();
  }
}

// ============================================================================
// Private helper functions
// ============================================================================

/**
 * Get list of generator IDs that are currently online (RUNNING + breaker CLOSED)
 * @private
 * @param {object} engineState
 * @returns {string[]} Array of generator IDs
 */
function _getOnlineGenerators(engineState) {
  const online = [];
  if (!engineState || !engineState.generators) return online;

  for (const [genId, gen] of Object.entries(engineState.generators)) {
    if (gen.state === 'RUNNING' && gen.breakerState === 'CLOSED') {
      online.push(genId);
    }
  }
  return online;
}

/**
 * Get total online capacity in kW
 * @private
 * @param {object} engineState
 * @returns {number}
 */
function _getTotalOnlineCapacity(engineState) {
  let total = 0;
  if (!engineState || !engineState.generators) return total;

  const capacities = {
    dg1: 1000, dg2: 1000, dg3: 1000,
    sg: 1500, emg: 500,
  };

  for (const [genId, gen] of Object.entries(engineState.generators)) {
    if (gen.state === 'RUNNING' && gen.breakerState === 'CLOSED') {
      total += capacities[genId] || 1000;
    }
  }
  return total;
}

/**
 * Build a weighted pool of possible events based on difficulty
 * @private
 * @param {number} difficulty
 * @param {string[]} onlineGens
 * @param {object} engineState
 * @returns {Array<{weight: number, event: object}>}
 */
function _buildEventPool(difficulty, onlineGens, engineState) {
  const pool = [];
  const totalCapacity = _getTotalOnlineCapacity(engineState);
  const currentLoad = engineState.loadDemand || 0;

  // ---- Load Step Up ----
  // Always possible, magnitude scales with difficulty
  {
    const minStep = 50;
    const maxStep = 50 + difficulty * 30; // 80 at d1, up to 440 at d13
    const stepValue = Math.round(minStep + Math.random() * (maxStep - minStep));

    // Don't step up beyond total capacity (would just cause overload/trip)
    if (currentLoad + stepValue <= totalCapacity * 1.1) {
      pool.push({
        weight: 10, // Most common event
        event: {
          type: EVENT_TYPES.LOAD_STEP_UP,
          target: null,
          value: stepValue,
          delay: 0,
          severity: stepValue > 300 ? SEVERITY.HIGH : stepValue > 150 ? SEVERITY.MEDIUM : SEVERITY.LOW,
        },
      });
    }
  }

  // ---- Load Step Down ----
  // Only if there's meaningful load
  if (currentLoad > 200) {
    const minStep = 50;
    const maxStep = 50 + difficulty * 20; // up to 310 at d13
    const stepValue = Math.round(minStep + Math.random() * (maxStep - minStep));

    pool.push({
      weight: 8,
      event: {
        type: EVENT_TYPES.LOAD_STEP_DOWN,
        target: null,
        value: Math.min(stepValue, currentLoad * 0.5), // Don't drop more than 50% at once
        delay: 0,
        severity: stepValue > 200 ? SEVERITY.MEDIUM : SEVERITY.LOW,
      },
    });
  }

  // ---- Load Fluctuation ----
  // Available from difficulty 3+
  if (difficulty >= 3) {
    const amplitude = 30 + difficulty * 15; // 75 at d3, up to 225 at d13
    const duration = 5 + Math.random() * 10; // 5-15 seconds

    pool.push({
      weight: 6,
      event: {
        type: EVENT_TYPES.LOAD_FLUCTUATION,
        target: null,
        value: amplitude,
        delay: 0,
        duration: Math.round(duration),
        period: 2 + Math.random() * 3,
        severity: amplitude > 150 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      },
    });
  }

  // ---- Generator Trip ----
  // Available from difficulty 5+, increasingly likely at higher difficulties
  // Only trip main generators (not EMG)
  if (difficulty >= 5 && onlineGens.length >= 2) {
    const trippableGens = onlineGens.filter(id => id !== 'emg');

    if (trippableGens.length > 0) {
      // Pick a random generator to trip
      const targetGen = trippableGens[Math.floor(Math.random() * trippableGens.length)];

      // Pick a random trip reason
      const tripReasons = [
        'trip.overcurrent',
        'trip.overload',
        'trip.under_freq',
        'trip.over_freq',
      ];
      const reason = tripReasons[Math.floor(Math.random() * tripReasons.length)];

      // Weight increases with difficulty, but generator trips are dangerous
      const weight = Math.max(1, difficulty - 6);

      pool.push({
        weight,
        event: {
          type: EVENT_TYPES.GENERATOR_TRIP,
          target: targetGen,
          value: 0,
          delay: Math.random() * 3, // 0-3 second delay
          reason,
          severity: SEVERITY.CRITICAL,
        },
      });
    }
  }

  // ---- Governor Fault ----
  // Available from difficulty 7+
  if (difficulty >= 7) {
    const trippableGens = onlineGens.filter(id => id !== 'emg');

    if (trippableGens.length > 0) {
      const targetGen = trippableGens[Math.floor(Math.random() * trippableGens.length)];

      // Faulty setpoint: push governor to a wrong speed
      // Offset from 1.0 (nominal), larger offset = worse fault
      const offset = 0.02 + (difficulty - 7) * 0.01; // 0.02 to 0.08
      const direction = Math.random() > 0.5 ? 1 : -1;
      const faultySetpoint = 1.0 + direction * offset;

      const weight = Math.max(1, difficulty - 8);

      pool.push({
        weight,
        event: {
          type: EVENT_TYPES.GOVERNOR_FAULT,
          target: targetGen,
          value: faultySetpoint,
          delay: 0,
          duration: 10 + Math.random() * 10, // 10-20 seconds
          severity: SEVERITY.HIGH,
        },
      });
    }
  }

  return pool;
}

/**
 * Create a deterministic event for testing purposes.
 * Useful for unit tests or scripted scenarios.
 *
 * @param {string} type     - EVENT_TYPES value
 * @param {object} options  - { target, value, delay, reason, duration, period }
 * @returns {object} Event object
 */
export function createEvent(type, options = {}) {
  return {
    type,
    target: options.target || null,
    value: options.value || 0,
    delay: options.delay || 0,
    reason: options.reason || null,
    duration: options.duration || null,
    period: options.period || null,
    severity: options.severity || SEVERITY.MEDIUM,
  };
}
