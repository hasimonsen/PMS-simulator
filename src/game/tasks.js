// ============================================================================
// tasks.js - PMS Simulator Task/Level Definitions
// ============================================================================
// Defines all 13 levels (including 4a and 4b) for the PMS Simulator game.
// Each task contains setup instructions for the PMSEngine, completion
// conditions, and failure conditions.
// ============================================================================

/**
 * Generator IDs used throughout the engine:
 *   'DG1', 'DG2', 'DG3' - Main diesel generators (1000 kW each)
 *   'SG'                 - Shaft generator (1500 kW)
 *   'EMG'                - Emergency generator (500 kW)
 *
 * Generator states:
 *   'OFF', 'PRE_LUBE', 'CRANKING', 'IDLE', 'RUNNING', 'COOL_DOWN'
 *
 * Breaker states:
 *   'OPEN', 'CLOSED', 'TRIPPED'
 *
 * Speed modes:
 *   'droop', 'isochronous'
 */

export const TASKS = [
  // =========================================================================
  // Level 1 - "First Light"
  // Start DG1 on a dead bus
  // =========================================================================
  {
    id: 1,
    key: '1',
    level: 1,
    nameKey: 'level.1.name',
    descKey: 'level.1.desc',
    hintKey: 'level.1.hint',
    parTime: 30,
    basePoints: 100,
    difficulty: 1,

    setup: {
      generators: {
        DG1: { state: 'OFF', breakerState: 'OPEN' },
        DG2: { state: 'OFF', breakerState: 'OPEN' },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 0,
      busVoltage: 0,
      busFrequency: 0,
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      return (
        dg1 &&
        dg1.breakerState === 'CLOSED' &&
        state.mainBus.voltage > 400
      );
    },

    checkFail: (state) => {
      const dg1 = state.generators.DG1;
      if (dg1 && dg1.breakerState === 'TRIPPED') {
        return 'DG1 tripped! Reset and try again.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 2 - "Auto Pilot"
  // DG1 running on bus, start DG2 with auto sync
  // =========================================================================
  {
    id: 2,
    key: '2',
    level: 2,
    nameKey: 'level.2.name',
    descKey: 'level.2.desc',
    hintKey: 'level.2.hint',
    parTime: 45,
    basePoints: 150,
    difficulty: 2,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: { state: 'OFF', breakerState: 'OPEN' },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 400,
      busVoltage: 440,
      busFrequency: 60,
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg2 = state.generators.DG2;
      return (
        dg2 &&
        dg2.state === 'RUNNING' &&
        dg2.breakerState === 'CLOSED'
      );
    },

    checkFail: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;
      if (dg2 && dg2.breakerState === 'TRIPPED') {
        return 'DG2 breaker tripped during sync! Bad synchronization.';
      }
      if (dg1 && dg1.breakerState === 'TRIPPED') {
        return 'DG1 tripped! Bus lost.';
      }
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 3 - "Steady Hand"
  // Semi-auto sync: PMS matches freq, player closes breaker
  // =========================================================================
  {
    id: 3,
    key: '3',
    level: 3,
    nameKey: 'level.3.name',
    descKey: 'level.3.desc',
    hintKey: 'level.3.hint',
    parTime: 60,
    basePoints: 200,
    difficulty: 3,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: { state: 'OFF', breakerState: 'OPEN' },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 400,
      busVoltage: 440,
      busFrequency: 60,
      syncMode: 'semi_auto', // PMS adjusts freq, player closes breaker
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg2 = state.generators.DG2;
      return (
        dg2 &&
        dg2.state === 'RUNNING' &&
        dg2.breakerState === 'CLOSED'
      );
    },

    checkFail: (state) => {
      const dg2 = state.generators.DG2;
      if (dg2 && dg2.breakerState === 'TRIPPED') {
        return 'DG2 breaker tripped! You closed the breaker out of sync.';
      }
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 4a - "Full Manual"
  // Full manual sync: adjust governor, AVR, and close breaker
  // =========================================================================
  {
    id: 4,
    key: '4a',
    level: '4a',
    nameKey: 'level.4a.name',
    descKey: 'level.4a.desc',
    hintKey: 'level.4a.hint',
    parTime: 90,
    basePoints: 300,
    difficulty: 4,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: { state: 'OFF', breakerState: 'OPEN' },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 400,
      busVoltage: 440,
      busFrequency: 60,
      syncMode: 'manual', // Player must adjust everything
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg2 = state.generators.DG2;
      return (
        dg2 &&
        dg2.state === 'RUNNING' &&
        dg2.breakerState === 'CLOSED'
      );
    },

    checkFail: (state) => {
      const dg2 = state.generators.DG2;
      if (dg2 && dg2.breakerState === 'TRIPPED') {
        return 'DG2 breaker tripped! Sync conditions not met when breaker was closed.';
      }
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 4b - "Full Manual + Load Share"
  // Manual sync DG2 + balance load 45-55% each
  // =========================================================================
  {
    id: 5,
    key: '4b',
    level: '4b',
    nameKey: 'level.4b.name',
    descKey: 'level.4b.desc',
    hintKey: 'level.4b.hint',
    parTime: 120,
    basePoints: 400,
    difficulty: 5,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: { state: 'OFF', breakerState: 'OPEN' },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 600,
      busVoltage: 440,
      busFrequency: 60,
      syncMode: 'manual',
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;

      if (!dg1 || !dg2) return false;
      if (dg2.state !== 'RUNNING' || dg2.breakerState !== 'CLOSED') return false;
      if (dg1.breakerState !== 'CLOSED') return false;

      // Both generators must be between 45-55% load share
      const totalLoad = (dg1.activePower || 0) + (dg2.activePower || 0);
      if (totalLoad <= 0) return false;

      const dg1Share = (dg1.activePower / totalLoad) * 100;
      const dg2Share = (dg2.activePower / totalLoad) * 100;

      return (
        dg1Share >= 45 && dg1Share <= 55 &&
        dg2Share >= 45 && dg2Share <= 55
      );
    },

    checkFail: (state) => {
      const dg2 = state.generators.DG2;
      if (dg2 && dg2.breakerState === 'TRIPPED') {
        return 'DG2 breaker tripped! Sync conditions not met.';
      }
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      // Check for reverse power on either gen
      const dg1 = state.generators.DG1;
      if (dg1 && dg1.breakerState === 'TRIPPED') {
        return 'DG1 tripped! Reverse power or overload detected.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 5 - "Share the Load"
  // Two generators droop load sharing
  // =========================================================================
  {
    id: 6,
    key: '5',
    level: 5,
    nameKey: 'level.5.name',
    descKey: 'level.5.desc',
    hintKey: 'level.5.hint',
    parTime: 60,
    basePoints: 200,
    difficulty: 5,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 1200,
      busVoltage: 440,
      busFrequency: 60,
      // Condition requires stable share for 5 seconds
      completionHoldTime: 5,
      scheduledEvents: [],
    },

    // Track how long both gens have been within 40-60% share
    _holdTimer: 0,

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;

      if (!dg1 || !dg2) return false;
      if (dg1.breakerState !== 'CLOSED' || dg2.breakerState !== 'CLOSED') return false;

      const totalLoad = (dg1.activePower || 0) + (dg2.activePower || 0);
      if (totalLoad <= 0) return false;

      const dg1Share = (dg1.activePower / totalLoad) * 100;
      const dg2Share = (dg2.activePower / totalLoad) * 100;

      const balanced = (
        dg1Share >= 40 && dg1Share <= 60 &&
        dg2Share >= 40 && dg2Share <= 60
      );

      // The 5-second hold time is tracked by TaskManager using completionHoldTime
      return balanced;
    },

    checkFail: (state) => {
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;
      if (dg1 && dg1.breakerState === 'TRIPPED') {
        return 'DG1 tripped!';
      }
      if (dg2 && dg2.breakerState === 'TRIPPED') {
        return 'DG2 tripped!';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 6 - "Smooth Transfer"
  // Transfer load from DG1 to DG2, shut down DG1
  // =========================================================================
  {
    id: 7,
    key: '6',
    level: 6,
    nameKey: 'level.6.name',
    descKey: 'level.6.desc',
    hintKey: 'level.6.hint',
    parTime: 90,
    basePoints: 250,
    difficulty: 6,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 800,
      busVoltage: 440,
      busFrequency: 60,
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;

      if (!dg1 || !dg2) return false;

      // DG1 breaker must be open and DG1 stopped or cooling down
      const dg1Stopped = (
        dg1.breakerState === 'OPEN' &&
        (dg1.state === 'OFF' || dg1.state === 'COOL_DOWN')
      );

      // DG2 carrying all load, still online
      const dg2Online = (
        dg2.state === 'RUNNING' &&
        dg2.breakerState === 'CLOSED'
      );

      // Bus must still be live
      const busLive = state.mainBus.voltage > 400;

      return dg1Stopped && dg2Online && busLive;
    },

    checkFail: (state) => {
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;
      if (dg1 && dg1.breakerState === 'TRIPPED') {
        return 'DG1 breaker tripped! Reverse power detected.';
      }
      if (dg2 && dg2.breakerState === 'TRIPPED') {
        return 'DG2 tripped! Overloaded during transfer.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 7 - "The Communicator"
  // Isochronous mode with load sharing communications
  // =========================================================================
  {
    id: 8,
    key: '7',
    level: 7,
    nameKey: 'level.7.name',
    descKey: 'level.7.desc',
    hintKey: 'level.7.hint',
    parTime: 60,
    basePoints: 250,
    difficulty: 7,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
          isoCommsEnabled: false,
        },
        DG2: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
          isoCommsEnabled: false,
        },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 800,
      busVoltage: 440,
      busFrequency: 60,
      // Requires stable for 10 seconds
      completionHoldTime: 10,
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;

      if (!dg1 || !dg2) return false;

      // Both must be in isochronous mode with comms enabled
      const bothIso = (
        dg1.speedMode === 'isochronous' &&
        dg2.speedMode === 'isochronous'
      );

      const bothComms = (
        dg1.isoCommsEnabled === true &&
        dg2.isoCommsEnabled === true
      );

      // Frequency must be within 59.8 - 60.2 Hz
      const freqStable = (
        state.mainBus.frequency >= 59.8 &&
        state.mainBus.frequency <= 60.2
      );

      // Both breakers still closed
      const bothOnline = (
        dg1.breakerState === 'CLOSED' &&
        dg2.breakerState === 'CLOSED'
      );

      // The 10-second hold time is tracked by TaskManager
      return bothIso && bothComms && freqStable && bothOnline;
    },

    checkFail: (state) => {
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;
      if (dg1 && dg1.breakerState === 'TRIPPED') return 'DG1 tripped!';
      if (dg2 && dg2.breakerState === 'TRIPPED') return 'DG2 tripped!';
      return null;
    },
  },

  // =========================================================================
  // Level 8 - "The Chase"
  // Isochronous without comms - generators will hunt/chase
  // =========================================================================
  {
    id: 9,
    key: '8',
    level: 8,
    nameKey: 'level.8.name',
    descKey: 'level.8.desc',
    hintKey: 'level.8.hint',
    parTime: 90,
    basePoints: 350,
    difficulty: 8,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'isochronous',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
          isoCommsEnabled: false,
        },
        DG2: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'isochronous',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
          isoCommsEnabled: false,
        },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 800,
      busVoltage: 440,
      busFrequency: 60,
      // Requires stable for 5 seconds
      completionHoldTime: 5,
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;

      if (!dg1 || !dg2) return false;
      if (dg1.breakerState !== 'CLOSED' || dg2.breakerState !== 'CLOSED') return false;

      // Chasing stopped: either comms enabled or switched to droop
      const chasingFixed = (
        // Option A: comms enabled on both (isochronous + comms = stable)
        (dg1.isoCommsEnabled === true && dg2.isoCommsEnabled === true &&
         dg1.speedMode === 'isochronous' && dg2.speedMode === 'isochronous') ||
        // Option B: switched back to droop mode
        (dg1.speedMode === 'droop' && dg2.speedMode === 'droop')
      );

      // System must be stable (not chasing)
      const stable = !state.chasingDetected;

      // Frequency reasonable
      const freqOk = (
        state.mainBus.frequency >= 59.5 &&
        state.mainBus.frequency <= 60.5
      );

      // The 5-second hold time is tracked by TaskManager
      return chasingFixed && stable && freqOk;
    },

    checkFail: (state) => {
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;
      if (dg1 && dg1.breakerState === 'TRIPPED') return 'DG1 tripped! Load hunting caused instability.';
      if (dg2 && dg2.breakerState === 'TRIPPED') return 'DG2 tripped! Load hunting caused instability.';
      return null;
    },
  },

  // =========================================================================
  // Level 9 - "Full House"
  // All 4 main generators online and balanced
  // =========================================================================
  {
    id: 10,
    key: '9',
    level: 9,
    nameKey: 'level.9.name',
    descKey: 'level.9.desc',
    hintKey: 'level.9.hint',
    parTime: 180,
    basePoints: 400,
    difficulty: 9,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: { state: 'OFF', breakerState: 'OPEN' },
        DG3: { state: 'OFF', breakerState: 'OPEN' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 2500,
      busVoltage: 440,
      busFrequency: 60,
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      const mainGens = ['DG1', 'DG2', 'DG3', 'SG'];
      let allOnline = true;
      let totalPower = 0;
      const powers = [];

      for (const genId of mainGens) {
        const gen = state.generators[genId];
        if (!gen || gen.state !== 'RUNNING' || gen.breakerState !== 'CLOSED') {
          allOnline = false;
          break;
        }
        const power = gen.activePower || 0;
        totalPower += power;
        powers.push(power);
      }

      if (!allOnline || totalPower <= 0) return false;

      // Each generator must carry 20-40% of total load
      // (SG has higher capacity so range accommodates differences)
      for (const power of powers) {
        const share = (power / totalPower) * 100;
        if (share < 20 || share > 40) return false;
      }

      return true;
    },

    checkFail: (state) => {
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Bus voltage lost.';
      }
      // Check for any tripped generators while trying to start them
      const gens = ['DG1', 'DG2', 'DG3', 'SG'];
      for (const genId of gens) {
        const gen = state.generators[genId];
        if (gen && gen.breakerState === 'TRIPPED') {
          return `${genId} breaker tripped! Check sync conditions.`;
        }
      }
      return null;
    },
  },

  // =========================================================================
  // Level 10 - "Generator Trip"
  // One generator trips unexpectedly, recover
  // =========================================================================
  {
    id: 11,
    key: '10',
    level: 10,
    nameKey: 'level.10.name',
    descKey: 'level.10.desc',
    hintKey: 'level.10.hint',
    parTime: 120,
    basePoints: 350,
    difficulty: 10,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG3: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 2000,
      busVoltage: 440,
      busFrequency: 60,
      // DG2 trips after 5 seconds
      scheduledEvents: [
        {
          type: 'generator_trip',
          target: 'DG2',
          delay: 5,
          reason: 'trip.overcurrent',
        },
      ],
    },

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;
      const dg3 = state.generators.DG3;

      if (!dg1 || !dg2 || !dg3) return false;

      // All 3 must be running and closed
      const allOnline = (
        dg1.state === 'RUNNING' && dg1.breakerState === 'CLOSED' &&
        dg2.state === 'RUNNING' && dg2.breakerState === 'CLOSED' &&
        dg3.state === 'RUNNING' && dg3.breakerState === 'CLOSED'
      );

      if (!allOnline) return false;

      // Load must be reasonably balanced
      const totalPower = (dg1.activePower || 0) + (dg2.activePower || 0) + (dg3.activePower || 0);
      if (totalPower <= 0) return false;

      const shares = [
        ((dg1.activePower || 0) / totalPower) * 100,
        ((dg2.activePower || 0) / totalPower) * 100,
        ((dg3.activePower || 0) / totalPower) * 100,
      ];

      // Each should be within 20-50% range
      return shares.every(s => s >= 20 && s <= 50);
    },

    checkFail: (state) => {
      if (state.mainBus.voltage === 0) {
        return 'Blackout! Total power loss under overload.';
      }
      // Only fail if remaining generators also trip (cascading failure)
      const dg1 = state.generators.DG1;
      const dg3 = state.generators.DG3;
      if (dg1 && dg1.breakerState === 'TRIPPED' && dg3 && dg3.breakerState === 'TRIPPED') {
        return 'Cascading failure! All remaining generators tripped from overload.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 11 - "Blackout - Auto Recovery"
  // Full blackout, EMG auto-starts
  // =========================================================================
  {
    id: 12,
    key: '11',
    level: 11,
    nameKey: 'level.11.name',
    descKey: 'level.11.desc',
    hintKey: 'level.11.hint',
    parTime: 120,
    basePoints: 400,
    difficulty: 11,

    setup: {
      generators: {
        DG1: { state: 'OFF', breakerState: 'TRIPPED' },
        DG2: { state: 'OFF', breakerState: 'TRIPPED' },
        DG3: { state: 'OFF', breakerState: 'TRIPPED' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN', autoStart: true },
      },
      loadDemand: 1500,
      busVoltage: 0,
      busFrequency: 0,
      blackout: true,
      emgAutoStart: true,
      scheduledEvents: [
        // All main gen breakers trip at start (already in TRIPPED state)
        // EMG auto-starts after blackout detect delay (2s default)
        {
          type: 'emg_auto_start',
          delay: 2,
        },
      ],
    },

    checkComplete: (state) => {
      // Main bus restored with at least 1 main DG running and closed
      const mainGens = ['DG1', 'DG2', 'DG3'];
      const anyMainOnline = mainGens.some(id => {
        const gen = state.generators[id];
        return gen && gen.state === 'RUNNING' && gen.breakerState === 'CLOSED';
      });

      return anyMainOnline && state.mainBus.voltage > 400;
    },

    checkFail: (state) => {
      const emg = state.generators.EMG;
      if (emg && emg.breakerState === 'TRIPPED') {
        return 'Emergency generator tripped! No backup available.';
      }
      // Battery depleted (if tracked)
      if (state.batteryDepleted) {
        return 'Battery backup depleted! Emergency systems lost.';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 12 - "Blackout - Manual Recovery"
  // Full blackout, EMG auto-start disabled, battery timer
  // =========================================================================
  {
    id: 13,
    key: '12',
    level: 12,
    nameKey: 'level.12.name',
    descKey: 'level.12.desc',
    hintKey: 'level.12.hint',
    parTime: 150,
    basePoints: 500,
    difficulty: 12,

    setup: {
      generators: {
        DG1: { state: 'OFF', breakerState: 'TRIPPED' },
        DG2: { state: 'OFF', breakerState: 'TRIPPED' },
        DG3: { state: 'OFF', breakerState: 'TRIPPED' },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN', autoStart: false },
      },
      loadDemand: 1500,
      busVoltage: 0,
      busFrequency: 0,
      blackout: true,
      emgAutoStart: false,
      batteryTimer: 180, // 180 seconds of battery backup
      scheduledEvents: [],
    },

    checkComplete: (state) => {
      // Main bus restored AND EMG running (either on EM bus or main bus)
      const emg = state.generators.EMG;
      const emgRunning = emg && emg.state === 'RUNNING';

      // At least 1 main DG back online on main bus
      const mainGens = ['DG1', 'DG2', 'DG3'];
      const anyMainOnline = mainGens.some(id => {
        const gen = state.generators[id];
        return gen && gen.state === 'RUNNING' && gen.breakerState === 'CLOSED';
      });

      return emgRunning && anyMainOnline && state.mainBus.voltage > 400;
    },

    checkFail: (state) => {
      // Battery depleted before recovery
      if (state.batteryDepleted) {
        return 'Battery backup depleted! All emergency systems lost. Total darkness.';
      }
      const emg = state.generators.EMG;
      if (emg && emg.breakerState === 'TRIPPED') {
        return 'Emergency generator tripped!';
      }
      return null;
    },
  },

  // =========================================================================
  // Level 13 - "Breaker Chaos"
  // Multiple cascading breaker trips
  // =========================================================================
  {
    id: 14,
    key: '13',
    level: 13,
    nameKey: 'level.13.name',
    descKey: 'level.13.desc',
    hintKey: 'level.13.hint',
    parTime: 180,
    basePoints: 500,
    difficulty: 13,

    setup: {
      generators: {
        DG1: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG2: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        DG3: {
          state: 'RUNNING',
          breakerState: 'CLOSED',
          speedMode: 'droop',
          speedSetpoint: 1.0,
          voltageSetpoint: 1.0,
        },
        SG:  { state: 'OFF', breakerState: 'OPEN' },
        EMG: { state: 'OFF', breakerState: 'OPEN' },
      },
      loadDemand: 2500,
      busVoltage: 440,
      busFrequency: 60,
      // Cascading trips: DG1 trips first, overloading DG2+DG3,
      // then DG2 trips from overload, leaving DG3 alone
      scheduledEvents: [
        {
          type: 'generator_trip',
          target: 'DG1',
          delay: 3,
          reason: 'trip.overcurrent',
        },
        {
          type: 'generator_trip',
          target: 'DG2',
          delay: 8,
          reason: 'trip.overload',
        },
        {
          type: 'generator_trip',
          target: 'DG3',
          delay: 12,
          reason: 'trip.under_freq',
        },
      ],
    },

    checkComplete: (state) => {
      const dg1 = state.generators.DG1;
      const dg2 = state.generators.DG2;
      const dg3 = state.generators.DG3;

      if (!dg1 || !dg2 || !dg3) return false;

      // All 3 generators back online with breakers closed
      const allOnline = (
        dg1.state === 'RUNNING' && dg1.breakerState === 'CLOSED' &&
        dg2.state === 'RUNNING' && dg2.breakerState === 'CLOSED' &&
        dg3.state === 'RUNNING' && dg3.breakerState === 'CLOSED'
      );

      // Bus must be live
      return allOnline && state.mainBus.voltage > 400;
    },

    checkFail: (state) => {
      // Fail if blackout persists too long (bus dead for > 60 seconds)
      if (state.mainBus.voltage === 0 && state.blackoutDuration > 60) {
        return 'Blackout lasted too long! Emergency systems compromised.';
      }
      return null;
    },
  },
];

/**
 * Get a task by its display key (e.g., '1', '4a', '13')
 * @param {string} key - The task key
 * @returns {object|undefined} The task definition
 */
export function getTaskByKey(key) {
  return TASKS.find(t => t.key === key);
}

/**
 * Get a task by its sequential ID
 * @param {number} id - The task ID (1-14)
 * @returns {object|undefined} The task definition
 */
export function getTaskById(id) {
  return TASKS.find(t => t.id === id);
}

/**
 * Get total number of tasks
 * @returns {number}
 */
export function getTotalTasks() {
  return TASKS.length;
}
