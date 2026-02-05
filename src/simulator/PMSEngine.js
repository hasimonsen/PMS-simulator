// PMSEngine.js -- Power Management System Simulator Physics Engine
// Pure JavaScript, no framework dependencies.
//
// Simulates a marine power plant with 4 main generators (DG1, DG2, DG3, SG),
// 1 emergency generator (EMG), main busbar, emergency switchboard, protection
// relays, droop / isochronous speed control, synchronisation physics, and
// automatic emergency generator start on blackout.

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = Object.freeze({
  nominalVoltage: 440,
  nominalFrequency: 60,
  generatorPoles: 10,

  dg1Capacity: 1000,
  dg2Capacity: 1000,
  dg3Capacity: 1000,
  sgCapacity: 1500,
  emgCapacity: 500,

  defaultDroop: 4,
  governorTimeConstant: 0.8,
  avrTimeConstant: 0.3,

  preLubeTime: 3,
  crankingTime: 2,
  coolDownTime: 30,

  syncVoltageTolerance: 10,
  syncFreqTolerance: 0.2,
  syncPhaseTolerance: 10,

  underFreqTrip: 55,
  overFreqTrip: 65,
  underVoltTrip: 380,
  overVoltTrip: 480,
  reversePowerTrip: -5,

  overcurrentPercent: 120,
  overcurrentTime: 10,
  underFreqTime: 5,
  overFreqTime: 3,

  blackoutDetectDelay: 2,
  emgAutoStart: true,

  baseLoad: 1200,
  loadFluctuationPercent: 2,
  emergencyBaseLoad: 150,
});

// ---------------------------------------------------------------------------
// Generator state enum
// ---------------------------------------------------------------------------
const GenState = Object.freeze({
  OFF: 'OFF',
  PRE_LUBE: 'PRE_LUBE',
  CRANKING: 'CRANKING',
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  COOL_DOWN: 'COOL_DOWN',
});

// ---------------------------------------------------------------------------
// Breaker state enum
// ---------------------------------------------------------------------------
const BreakerState = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  TRIPPED: 'TRIPPED',
});

// ---------------------------------------------------------------------------
// Helper: wrap angle into [0, 2pi)
// ---------------------------------------------------------------------------
function wrapAngle(a) {
  a = a % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a;
}

// ---------------------------------------------------------------------------
// Helper: signed angular difference in [-pi, pi]
// ---------------------------------------------------------------------------
function angleDiff(a, b) {
  let d = (a - b) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

// ---------------------------------------------------------------------------
// Helper: first-order exponential chase (low pass)
// ---------------------------------------------------------------------------
function chase(current, target, tau, dt) {
  if (tau <= 0) return target;
  const alpha = 1 - Math.exp(-dt / tau);
  return current + (target - current) * alpha;
}

// ---------------------------------------------------------------------------
// Helper: clamp
// ---------------------------------------------------------------------------
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---------------------------------------------------------------------------
// Create a fresh generator state object
// ---------------------------------------------------------------------------
function createGenerator(id, capacity, isEmergency, settings) {
  const nominalRpm = (settings.nominalFrequency * 120) / settings.generatorPoles;
  // Each generator gets a slightly different governor time constant to model
  // realistic hunting behaviour in isochronous mode without comms.
  const tauOffset = { DG1: -0.15, DG2: 0.0, DG3: 0.1, SG: 0.2, EMG: -0.05 };
  const tau = settings.governorTimeConstant + (tauOffset[id] || 0);

  return {
    id,
    capacity,          // rated kW
    isEmergency,

    state: GenState.OFF,
    stateTimer: 0,     // seconds spent in current state

    rpm: 0,
    voltage: 0,
    frequency: 0,
    phaseAngle: Math.random() * TWO_PI,

    activePower: 0,
    reactivePower: 0,

    breakerState: BreakerState.OPEN,
    breakerTripped: false,
    tripReason: null,

    governorSetpoint: nominalRpm,
    avrSetpoint: settings.nominalVoltage,
    droopPercent: settings.defaultDroop,
    speedMode: 'droop',
    isoCommsEnabled: true,
    autoStart: isEmergency ? settings.emgAutoStart : false,

    governorTau: tau,
    avrTau: settings.avrTimeConstant,

    // Protection timers (accumulate time spent in fault condition)
    underFreqTimer: 0,
    overFreqTimer: 0,
    overcurrentTimer: 0,

    // Isochronous hunting state
    isoIntegral: 0,

    // Fuel command (0-1), internal governor signal
    fuelCommand: 0,

    // Damage flag
    damaged: false,
  };
}

// ---------------------------------------------------------------------------
// PMSEngine class
// ---------------------------------------------------------------------------
class PMSEngine {
  constructor(settings = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    const s = this.settings;

    // Nominal RPM derived from frequency and poles
    this.nominalRpm = (s.nominalFrequency * 120) / s.generatorPoles;

    // Create generators
    this.generators = {
      DG1: createGenerator('DG1', s.dg1Capacity, false, s),
      DG2: createGenerator('DG2', s.dg2Capacity, false, s),
      DG3: createGenerator('DG3', s.dg3Capacity, false, s),
      SG:  createGenerator('SG',  s.sgCapacity,  false, s),
      EMG: createGenerator('EMG', s.emgCapacity, true,  s),
    };

    // Main busbar
    this.mainBus = {
      voltage: 0,
      frequency: 0,
      phaseAngle: 0,
      totalLoad: s.baseLoad,
      totalGeneration: 0,
      live: false,
    };

    // Emergency switchboard
    this.emergencyBus = {
      voltage: 0,
      frequency: 0,
      live: false,
      totalLoad: s.emergencyBaseLoad,
      busTieClosed: true,   // Normally closed when main bus is live
    };

    // Alerts / events
    this.alerts = [];       // { time, severity, message }
    this.simTime = 0;       // cumulative simulation seconds

    // Blackout tracking
    this.blackout = false;
    this.blackoutTimer = 0;

    // EMG auto-start tracking
    this.emgAutoStartPending = false;
    this.emgAutoStartTimer = 0;

    // Game-over
    this.gameOverReason = null;

    // Damage counter
    this.damageCount = 0;

    // Load fluctuation state (smooth random walk)
    this._loadNoise = 0;
    this._loadNoiseTarget = 0;
    this._loadNoiseTimer = 0;
  }

  // -----------------------------------------------------------------------
  // PUBLIC: main simulation step
  // -----------------------------------------------------------------------
  tick(dt) {
    if (this.gameOverReason) return;

    this.simTime += dt;

    // 1. Update load noise
    this._updateLoadNoise(dt);

    // 2. Tick each generator (state machine, governor, AVR, phase)
    for (const id of Object.keys(this.generators)) {
      this._tickGenerator(this.generators[id], dt);
    }

    // 3. Compute main bus aggregates
    this._computeMainBus(dt);

    // 4. Compute emergency bus
    this._computeEmergencyBus(dt);

    // 5. Distribute load among online generators (main bus)
    this._distributeLoad(dt);

    // 6. Protection checks
    for (const id of Object.keys(this.generators)) {
      this._checkProtection(this.generators[id], dt);
    }

    // 7. Blackout detection and EMG auto-start
    this._checkBlackout(dt);
  }

  // -----------------------------------------------------------------------
  // Load noise (smooth random fluctuations +/- loadFluctuationPercent)
  // -----------------------------------------------------------------------
  _updateLoadNoise(dt) {
    this._loadNoiseTimer -= dt;
    if (this._loadNoiseTimer <= 0) {
      this._loadNoiseTarget =
        (Math.random() * 2 - 1) *
        this.settings.baseLoad *
        (this.settings.loadFluctuationPercent / 100);
      this._loadNoiseTimer = 0.5 + Math.random() * 1.5;
    }
    this._loadNoise = chase(this._loadNoise, this._loadNoiseTarget, 0.3, dt);
    this.mainBus.totalLoad = Math.max(0, this.settings.baseLoad + this._loadNoise);
  }

  // -----------------------------------------------------------------------
  // Generator state machine + physics
  // -----------------------------------------------------------------------
  _tickGenerator(gen, dt) {
    const s = this.settings;
    gen.stateTimer += dt;

    switch (gen.state) {
      // -- OFF --
      case GenState.OFF:
        gen.rpm = chase(gen.rpm, 0, 1.0, dt);
        gen.voltage = chase(gen.voltage, 0, 0.5, dt);
        gen.fuelCommand = 0;
        gen.activePower = 0;
        gen.reactivePower = 0;
        break;

      // -- PRE_LUBE --
      case GenState.PRE_LUBE:
        gen.rpm = 0;
        gen.voltage = 0;
        if (gen.stateTimer >= s.preLubeTime) {
          this._setGenState(gen, GenState.CRANKING);
        }
        break;

      // -- CRANKING --
      case GenState.CRANKING:
        // RPM ramps up slowly during cranking
        gen.rpm = chase(gen.rpm, this.nominalRpm * 0.3, 0.8, dt);
        gen.voltage = 0;
        if (gen.stateTimer >= s.crankingTime) {
          this._setGenState(gen, GenState.IDLE);
          this._addAlert('info', `${gen.id} ignition -- ramping to idle`);
        }
        break;

      // -- IDLE --
      case GenState.IDLE:
        // Ramp RPM to nominal, voltage builds
        gen.fuelCommand = chase(gen.fuelCommand, 0.15, gen.governorTau, dt);
        gen.rpm = chase(gen.rpm, this.nominalRpm, gen.governorTau * 1.2, dt);
        gen.voltage = chase(gen.voltage, gen.avrSetpoint, gen.avrTau * 2, dt);
        // Transition to RUNNING once voltage is above 90% nominal
        if (
          gen.rpm > this.nominalRpm * 0.95 &&
          gen.voltage > s.nominalVoltage * 0.9
        ) {
          this._setGenState(gen, GenState.RUNNING);
          this._addAlert('info', `${gen.id} running at rated speed and voltage`);
        }
        break;

      // -- RUNNING --
      case GenState.RUNNING:
        this._tickGovernor(gen, dt);
        this._tickAVR(gen, dt);
        break;

      // -- COOL_DOWN --
      case GenState.COOL_DOWN:
        gen.fuelCommand = chase(gen.fuelCommand, 0, 0.5, dt);
        gen.rpm = chase(gen.rpm, this.nominalRpm * 0.3, 2.0, dt);
        gen.voltage = chase(gen.voltage, 0, 1.0, dt);
        gen.activePower = 0;
        gen.reactivePower = 0;
        if (gen.stateTimer >= s.coolDownTime) {
          this._setGenState(gen, GenState.OFF);
          this._addAlert('info', `${gen.id} shutdown complete`);
        }
        break;
    }

    // Frequency derived from RPM
    gen.frequency = (gen.rpm * s.generatorPoles) / 120;

    // Phase angle advances
    gen.phaseAngle = wrapAngle(gen.phaseAngle + TWO_PI * gen.frequency * dt);

    // Clamp non-negative
    gen.rpm = Math.max(0, gen.rpm);
    gen.voltage = Math.max(0, gen.voltage);
  }

  // -----------------------------------------------------------------------
  // Governor control (RUNNING state only)
  // -----------------------------------------------------------------------
  _tickGovernor(gen, dt) {
    const s = this.settings;

    // If breaker is not closed, generator is running at no load.
    if (gen.breakerState !== BreakerState.CLOSED) {
      // No-load: RPM tracks governor setpoint
      const targetRpm = gen.governorSetpoint;
      gen.rpm = chase(gen.rpm, targetRpm, gen.governorTau, dt);
      gen.fuelCommand = chase(gen.fuelCommand, 0.15, gen.governorTau, dt);
      gen.activePower = 0;
      gen.reactivePower = 0;
      return;
    }

    // ---- Breaker is CLOSED: generator is on bus ----

    if (gen.speedMode === 'droop') {
      this._tickGovernorDroop(gen, dt);
    } else {
      // Isochronous
      this._tickGovernorIsochronous(gen, dt);
    }
  }

  // -----------------------------------------------------------------------
  // Droop governor
  //   f_actual = f_setpoint - (droop% * P/Pmax * f_setpoint)
  //   Rearranging for power share given bus frequency:
  //   P = Pmax * (f_setpoint - f_bus) / (droop% * f_setpoint) * 100
  // -----------------------------------------------------------------------
  _tickGovernorDroop(gen, dt) {
    const s = this.settings;
    const fSetpoint = (gen.governorSetpoint * s.generatorPoles) / 120;
    const droop = gen.droopPercent / 100;

    // In droop mode, the bus dictates the frequency. Generator power output
    // is determined by the droop characteristic:
    //   P = Pmax * (fSetpoint - fBus) / (droop * fSetpoint)
    // We compute the power the droop curve dictates, then let the governor
    // track towards it, which in turn affects the bus frequency via the
    // weighted average recalculation.

    const fBus = this.mainBus.frequency || fSetpoint;

    let targetPower = 0;
    if (droop > 0) {
      targetPower = gen.capacity * ((fSetpoint - fBus) / (droop * fSetpoint));
    }
    targetPower = clamp(targetPower, 0, gen.capacity);

    gen.activePower = chase(gen.activePower, targetPower, gen.governorTau, dt);

    // RPM follows droop curve
    const pFrac = gen.activePower / gen.capacity;
    const targetFreq = fSetpoint * (1 - droop * pFrac);
    const targetRpm = (targetFreq * 120) / s.generatorPoles;
    gen.rpm = chase(gen.rpm, targetRpm, gen.governorTau * 0.5, dt);

    // Fuel command proportional to load
    gen.fuelCommand = clamp(0.15 + 0.85 * pFrac, 0, 1);
  }

  // -----------------------------------------------------------------------
  // Isochronous governor
  // -----------------------------------------------------------------------
  _tickGovernorIsochronous(gen, dt) {
    const s = this.settings;
    const fSetpoint = (gen.governorSetpoint * s.generatorPoles) / 120;

    if (gen.isoCommsEnabled) {
      // With load sharing comms: equal percentage sharing, rock-solid 60Hz
      const onlineGens = this._getOnlineMainGens();
      const totalCapacity = onlineGens.reduce((sum, g) => sum + g.capacity, 0);
      const loadShare = totalCapacity > 0
        ? (this.mainBus.totalLoad / totalCapacity) * gen.capacity
        : 0;
      const targetPower = clamp(loadShare, 0, gen.capacity);

      gen.activePower = chase(gen.activePower, targetPower, gen.governorTau, dt);

      // Frequency stays at setpoint
      const targetRpm = gen.governorSetpoint;
      gen.rpm = chase(gen.rpm, targetRpm, gen.governorTau * 0.3, dt);
    } else {
      // WITHOUT comms: hunting / chasing behaviour
      // Each generator independently tries to maintain frequency, leading
      // to oscillation when multiple generators are online.

      const fBus = this.mainBus.frequency || fSetpoint;
      const freqError = fSetpoint - fBus;

      // Integral windup with clamping -- this is what causes the hunting
      gen.isoIntegral += freqError * dt;
      gen.isoIntegral = clamp(gen.isoIntegral, -5, 5);

      // PI controller output (intentionally aggressive to produce hunting)
      const Kp = gen.capacity * 0.8;
      const Ki = gen.capacity * 0.3;
      const pCommand = Kp * freqError + Ki * gen.isoIntegral;
      const targetPower = clamp(pCommand, 0, gen.capacity);

      gen.activePower = chase(gen.activePower, targetPower, gen.governorTau, dt);

      // RPM tracks setpoint (the integrator delays create oscillation)
      gen.rpm = chase(gen.rpm, gen.governorSetpoint, gen.governorTau, dt);
    }

    const pFrac = gen.activePower / gen.capacity;
    gen.fuelCommand = clamp(0.15 + 0.85 * pFrac, 0, 1);
  }

  // -----------------------------------------------------------------------
  // AVR (Automatic Voltage Regulator)
  // -----------------------------------------------------------------------
  _tickAVR(gen, dt) {
    // When online (breaker closed), voltage is dominated by bus; when not on
    // bus, voltage tracks the AVR setpoint.
    if (gen.breakerState === BreakerState.CLOSED) {
      // Voltage held close to AVR setpoint; reactive power absorbs mismatch
      gen.voltage = chase(gen.voltage, gen.avrSetpoint, gen.avrTau, dt);
      // Simplified reactive power model
      const vError = gen.avrSetpoint - (this.mainBus.voltage || gen.avrSetpoint);
      gen.reactivePower = clamp(vError * 5, -gen.capacity * 0.5, gen.capacity * 0.5);
    } else {
      gen.voltage = chase(gen.voltage, gen.avrSetpoint, gen.avrTau, dt);
      gen.reactivePower = 0;
    }
  }

  // -----------------------------------------------------------------------
  // Main busbar aggregate computation
  // -----------------------------------------------------------------------
  _computeMainBus(dt) {
    const onlineGens = this._getOnlineMainGens();

    if (onlineGens.length === 0) {
      // No online generators: bus collapses
      this.mainBus.voltage = chase(this.mainBus.voltage, 0, 0.3, dt);
      this.mainBus.frequency = chase(this.mainBus.frequency, 0, 0.5, dt);
      this.mainBus.totalGeneration = 0;
      this.mainBus.live = this.mainBus.voltage > 50;
      return;
    }

    // Weighted average frequency (weighted by capacity / inertia)
    let totalCap = 0;
    let weightedFreq = 0;
    let weightedVolt = 0;
    let totalPower = 0;

    for (const g of onlineGens) {
      totalCap += g.capacity;
      weightedFreq += g.frequency * g.capacity;
      weightedVolt += g.voltage * g.capacity;
      totalPower += g.activePower;
    }

    this.mainBus.frequency = weightedFreq / totalCap;
    this.mainBus.voltage = weightedVolt / totalCap;
    this.mainBus.totalGeneration = totalPower;
    this.mainBus.live = this.mainBus.voltage > 50;

    // Bus phase angle tracks frequency
    this.mainBus.phaseAngle = wrapAngle(
      this.mainBus.phaseAngle + TWO_PI * this.mainBus.frequency * dt
    );
  }

  // -----------------------------------------------------------------------
  // Emergency bus computation
  // -----------------------------------------------------------------------
  _computeEmergencyBus(dt) {
    const emg = this.generators.EMG;
    const emgOnline =
      emg.state === GenState.RUNNING &&
      emg.breakerState === BreakerState.CLOSED;

    if (this.emergencyBus.busTieClosed && this.mainBus.live) {
      // Emergency bus fed from main bus via bus-tie
      this.emergencyBus.voltage = this.mainBus.voltage;
      this.emergencyBus.frequency = this.mainBus.frequency;
      this.emergencyBus.live = true;
    } else if (emgOnline) {
      // Emergency bus fed from EMG
      this.emergencyBus.voltage = emg.voltage;
      this.emergencyBus.frequency = emg.frequency;
      this.emergencyBus.live = emg.voltage > 50;
    } else {
      // Emergency bus dead
      this.emergencyBus.voltage = chase(this.emergencyBus.voltage, 0, 0.3, dt);
      this.emergencyBus.frequency = chase(this.emergencyBus.frequency, 0, 0.5, dt);
      this.emergencyBus.live = this.emergencyBus.voltage > 50;
    }
  }

  // -----------------------------------------------------------------------
  // Load distribution among online main bus generators
  // -----------------------------------------------------------------------
  _distributeLoad(dt) {
    const onlineGens = this._getOnlineMainGens();
    if (onlineGens.length === 0) return;

    // In droop mode, load distribution is implicit via the droop equations.
    // In isochronous mode with comms, load is explicitly shared equally.
    // The governor tick already computes activePower per gen.

    // Constrain total generation to match total load (energy balance).
    // Generators that are in droop mode have already computed their share;
    // we scale to match actual demand (simplified).
    const totalCapacity = onlineGens.reduce((sum, g) => sum + g.capacity, 0);
    const totalLoad = this.mainBus.totalLoad;

    // Check if all generators are in droop mode
    const allDroop = onlineGens.every((g) => g.speedMode === 'droop');
    const allIsoComms = onlineGens.every(
      (g) => g.speedMode === 'isochronous' && g.isoCommsEnabled
    );

    if (allDroop) {
      // In pure droop: power share was computed in governor tick.
      // However, total generation must match total load for a stable bus.
      // We let the droop equations handle it naturally -- the bus frequency
      // will shift to balance generation and load.
      // No additional redistribution needed; the governor already handles it.
    } else if (allIsoComms) {
      // Already handled in governor tick -- equal percentage sharing.
    }
    // Mixed modes or iso-without-comms: the governor ticks handle each
    // generator independently, which is correct (they fight each other).

    // Handle EMG load if EMG is online and not on main bus
    const emg = this.generators.EMG;
    if (
      emg.state === GenState.RUNNING &&
      emg.breakerState === BreakerState.CLOSED &&
      !this.mainBus.live
    ) {
      // EMG supplies emergency loads
      emg.activePower = chase(
        emg.activePower,
        this.emergencyBus.totalLoad,
        emg.governorTau,
        dt
      );
      const pFrac = emg.activePower / emg.capacity;
      emg.fuelCommand = clamp(0.15 + 0.85 * pFrac, 0, 1);

      // Droop effect on EMG
      if (emg.speedMode === 'droop' && emg.droopPercent > 0) {
        const droop = emg.droopPercent / 100;
        const fSetpoint =
          (emg.governorSetpoint * this.settings.generatorPoles) / 120;
        const targetFreq = fSetpoint * (1 - droop * pFrac);
        const targetRpm = (targetFreq * 120) / this.settings.generatorPoles;
        emg.rpm = chase(emg.rpm, targetRpm, emg.governorTau * 0.5, dt);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Protection relay checks
  // -----------------------------------------------------------------------
  _checkProtection(gen, dt) {
    const s = this.settings;

    // Only check protection on running generators with closed breakers
    if (gen.state !== GenState.RUNNING) {
      gen.underFreqTimer = 0;
      gen.overFreqTimer = 0;
      gen.overcurrentTimer = 0;
      return;
    }
    if (gen.breakerState !== BreakerState.CLOSED) {
      gen.underFreqTimer = 0;
      gen.overFreqTimer = 0;
      gen.overcurrentTimer = 0;
      return;
    }

    // --- Under frequency ---
    if (gen.frequency < s.underFreqTrip && gen.frequency > 0) {
      gen.underFreqTimer += dt;
      if (gen.underFreqTimer >= s.underFreqTime) {
        this._tripBreaker(gen, 'under_frequency');
      }
    } else {
      gen.underFreqTimer = Math.max(0, gen.underFreqTimer - dt);
    }

    // --- Over frequency ---
    if (gen.frequency > s.overFreqTrip) {
      gen.overFreqTimer += dt;
      if (gen.overFreqTimer >= s.overFreqTime) {
        this._tripBreaker(gen, 'over_frequency');
      }
    } else {
      gen.overFreqTimer = Math.max(0, gen.overFreqTimer - dt);
    }

    // --- Under voltage ---
    if (gen.voltage < s.underVoltTrip && gen.voltage > 0) {
      this._tripBreaker(gen, 'under_voltage');
    }

    // --- Over voltage ---
    if (gen.voltage > s.overVoltTrip) {
      this._tripBreaker(gen, 'over_voltage');
    }

    // --- Reverse power ---
    if (gen.activePower < s.reversePowerTrip) {
      this._tripBreaker(gen, 'reverse_power');
    }

    // --- Overcurrent (> 120% rated for > 10s) ---
    const currentPercent = (gen.activePower / gen.capacity) * 100;
    if (currentPercent > s.overcurrentPercent) {
      gen.overcurrentTimer += dt;
      if (gen.overcurrentTimer >= s.overcurrentTime) {
        this._tripBreaker(gen, 'overcurrent');
      }
    } else {
      gen.overcurrentTimer = Math.max(0, gen.overcurrentTimer - dt);
    }
  }

  // -----------------------------------------------------------------------
  // Blackout detection and EMG auto-start
  // -----------------------------------------------------------------------
  _checkBlackout(dt) {
    const s = this.settings;
    const wasBlackout = this.blackout;

    this.blackout = !this.mainBus.live;

    if (this.blackout) {
      this.blackoutTimer += dt;

      // Open bus-tie on blackout (dead bus cannot back-feed)
      if (this.emergencyBus.busTieClosed) {
        this.emergencyBus.busTieClosed = false;
        this._addAlert('warning', 'Bus-tie opened due to main bus blackout');
      }

      // Auto-start EMG after delay
      const emg = this.generators.EMG;
      if (
        emg.autoStart &&
        emg.state === GenState.OFF &&
        !this.emgAutoStartPending &&
        this.blackoutTimer >= s.blackoutDetectDelay
      ) {
        this.emgAutoStartPending = true;
        this._addAlert('warning', 'BLACKOUT detected -- EMG auto-starting');
        this.startGenerator('EMG');
      }

      // Once EMG is running, auto-close its breaker
      if (
        this.emgAutoStartPending &&
        emg.state === GenState.RUNNING &&
        emg.breakerState === BreakerState.OPEN
      ) {
        emg.breakerState = BreakerState.CLOSED;
        this.emgAutoStartPending = false;
        this._addAlert('info', 'EMG breaker auto-closed -- emergency bus energized');
      }
    } else {
      this.blackoutTimer = 0;

      // If main bus restored and EMG is running, we don't auto-parallelize.
      // Operator must manually restore bus-tie and handle EMG.

      // Re-close bus-tie automatically when main bus restores, if EMG is
      // not feeding the emergency bus (or if it is, operator should handle it).
      // For simplicity: auto-close bus-tie when main bus is live and EMG
      // breaker is open.
      const emg = this.generators.EMG;
      if (
        !this.emergencyBus.busTieClosed &&
        this.mainBus.live &&
        emg.breakerState !== BreakerState.CLOSED
      ) {
        this.emergencyBus.busTieClosed = true;
        this._addAlert('info', 'Bus-tie reclosed -- emergency bus fed from main bus');
      }
    }

    // First-time blackout alert
    if (this.blackout && !wasBlackout) {
      this._addAlert('critical', 'MAIN BUS BLACKOUT');
    }
  }

  // -----------------------------------------------------------------------
  // OPERATOR ACTIONS
  // -----------------------------------------------------------------------

  startGenerator(id) {
    const gen = this.generators[id];
    if (!gen) return;
    if (gen.state !== GenState.OFF) return;
    if (gen.damaged) {
      this._addAlert('warning', `${id} is damaged and cannot be started`);
      return;
    }
    this._setGenState(gen, GenState.PRE_LUBE);
    this._addAlert('info', `${id} start sequence initiated (pre-lube)`);
  }

  stopGenerator(id) {
    const gen = this.generators[id];
    if (!gen) return;
    if (gen.state === GenState.OFF || gen.state === GenState.COOL_DOWN) return;

    // Open breaker first if closed
    if (gen.breakerState === BreakerState.CLOSED) {
      this.openBreaker(id);
    }

    this._setGenState(gen, GenState.COOL_DOWN);
    this._addAlert('info', `${id} stopping -- cool-down initiated`);
  }

  closeBreaker(id) {
    const gen = this.generators[id];
    if (!gen) return;

    // Cannot close if tripped (must reset first)
    if (gen.breakerState === BreakerState.TRIPPED) {
      this._addAlert('warning', `${id} breaker is TRIPPED -- reset before closing`);
      return;
    }
    if (gen.breakerState === BreakerState.CLOSED) return;
    if (gen.state !== GenState.RUNNING) {
      this._addAlert('warning', `${id} is not running -- cannot close breaker`);
      return;
    }

    // If bus is live, check synchronisation conditions
    const bus = gen.isEmergency ? this.emergencyBus : this.mainBus;
    if (bus.live && !gen.isEmergency) {
      const syncResult = this._checkSync(gen);
      if (syncResult.severity === 'block') {
        this._addAlert(
          'warning',
          `${id} sync BLOCKED: ${syncResult.reason}`
        );
        return;
      }
      if (syncResult.severity === 'damage') {
        this._addAlert(
          'critical',
          `${id} FORCED SYNC -- ${syncResult.reason}`
        );
        this._applySyncDamage(gen, syncResult);
      } else if (syncResult.severity === 'warning') {
        this._addAlert(
          'warning',
          `${id} sync marginal: ${syncResult.reason}`
        );
      }
    }

    gen.breakerState = BreakerState.CLOSED;
    gen.breakerTripped = false;
    gen.tripReason = null;
    this._addAlert('info', `${id} breaker CLOSED`);
  }

  openBreaker(id) {
    const gen = this.generators[id];
    if (!gen) return;
    if (gen.breakerState === BreakerState.TRIPPED) {
      this._addAlert('warning', `${id} breaker is TRIPPED -- use reset instead`);
      return;
    }
    if (gen.breakerState === BreakerState.OPEN) return;

    gen.breakerState = BreakerState.OPEN;
    gen.activePower = 0;
    gen.reactivePower = 0;
    gen.isoIntegral = 0;
    this._addAlert('info', `${id} breaker OPENED`);

    // Check if this causes blackout (last gen disconnected)
    const remaining = this._getOnlineMainGens();
    if (remaining.length === 0 && !gen.isEmergency) {
      // This will be caught by _checkBlackout on next tick
    }
  }

  resetBreaker(id) {
    const gen = this.generators[id];
    if (!gen) return;
    if (gen.breakerState !== BreakerState.TRIPPED) {
      this._addAlert('info', `${id} breaker is not tripped`);
      return;
    }
    gen.breakerState = BreakerState.OPEN;
    gen.breakerTripped = false;
    gen.tripReason = null;
    this._addAlert('info', `${id} breaker RESET to OPEN`);
  }

  setGovernorSetpoint(id, rpm) {
    const gen = this.generators[id];
    if (!gen) return;
    gen.governorSetpoint = clamp(rpm, 0, this.nominalRpm * 1.15);
  }

  setAvrSetpoint(id, voltage) {
    const gen = this.generators[id];
    if (!gen) return;
    gen.avrSetpoint = clamp(voltage, 0, this.settings.nominalVoltage * 1.2);
  }

  setSpeedMode(id, mode) {
    const gen = this.generators[id];
    if (!gen) return;
    if (mode !== 'droop' && mode !== 'isochronous') return;
    gen.speedMode = mode;
    gen.isoIntegral = 0;
    this._addAlert('info', `${id} speed mode set to ${mode}`);
  }

  setDroopPercent(id, percent) {
    const gen = this.generators[id];
    if (!gen) return;
    gen.droopPercent = clamp(percent, 0, 8);
  }

  setIsoComms(id, enabled) {
    const gen = this.generators[id];
    if (!gen) return;
    gen.isoCommsEnabled = !!enabled;
    gen.isoIntegral = 0;
    this._addAlert(
      'info',
      `${id} isochronous comms ${enabled ? 'ENABLED' : 'DISABLED'}`
    );
  }

  // -----------------------------------------------------------------------
  // SETUP / INIT METHODS (used by TaskManager to configure levels)
  // -----------------------------------------------------------------------

  /**
   * Initialize/reset engine state for a new level.
   * @param {object} config - Optional initial configuration
   */
  init(config = {}) {
    // Reset all generators to OFF
    for (const gen of Object.values(this.generators)) {
      this._setGenState(gen, GenState.OFF);
      gen.rpm = 0;
      gen.voltage = 0;
      gen.frequency = 0;
      gen.activePower = 0;
      gen.reactivePower = 0;
      gen.breakerState = BreakerState.OPEN;
      gen.breakerTripped = false;
      gen.tripReason = null;
      gen.phaseAngle = Math.random() * TWO_PI;
      gen.underFreqTimer = 0;
      gen.overFreqTimer = 0;
      gen.overcurrentTimer = 0;
      gen.isoIntegral = 0;
      gen.fuelCommand = 0;
      gen.damaged = false;
    }

    // Reset bus
    this.mainBus.voltage = 0;
    this.mainBus.frequency = 0;
    this.mainBus.phaseAngle = 0;
    this.mainBus.totalGeneration = 0;
    this.mainBus.live = false;

    this.emergencyBus.voltage = 0;
    this.emergencyBus.frequency = 0;
    this.emergencyBus.live = false;
    this.emergencyBus.busTieClosed = true;

    // Reset tracking
    this.alerts = [];
    this.simTime = 0;
    this.blackout = false;
    this.blackoutTimer = 0;
    this.emgAutoStartPending = false;
    this.emgAutoStartTimer = 0;
    this.gameOverReason = null;
    this.damageCount = 0;
    this._loadNoise = 0;
    this._loadNoiseTarget = 0;
    this._loadNoiseTimer = 0;

    // Apply config overrides
    if (config.baseLoad !== undefined) {
      this.settings.baseLoad = config.baseLoad;
      this.mainBus.totalLoad = config.baseLoad;
    }
  }

  /**
   * Force a generator into a specific state (for level setup).
   * @param {string} id - Generator ID (DG1, DG2, etc.)
   * @param {object} setup - State configuration
   */
  forceGeneratorState(id, setup) {
    const gen = this.generators[id];
    if (!gen) return;

    const s = this.settings;
    const nomRpm = this.nominalRpm;

    // Set generator state
    if (setup.state) {
      gen.state = setup.state;
      gen.stateTimer = 0;

      if (setup.state === GenState.RUNNING) {
        gen.rpm = nomRpm;
        gen.voltage = gen.avrSetpoint;
        gen.frequency = s.nominalFrequency;
        gen.fuelCommand = 0.3;
      } else if (setup.state === GenState.OFF) {
        gen.rpm = 0;
        gen.voltage = 0;
        gen.frequency = 0;
        gen.fuelCommand = 0;
      }
    }

    // Set breaker state
    if (setup.breakerState) {
      gen.breakerState = setup.breakerState;
      gen.breakerTripped = setup.breakerState === BreakerState.TRIPPED;
      if (setup.breakerState === BreakerState.TRIPPED) {
        gen.tripReason = setup.tripReason || 'overcurrent';
      }
    }

    // Set speed mode
    if (setup.speedMode) {
      gen.speedMode = setup.speedMode;
    }

    // Set governor setpoint (1.0 = nominal)
    if (setup.speedSetpoint !== undefined) {
      gen.governorSetpoint = nomRpm * setup.speedSetpoint;
    }

    // Set AVR setpoint (1.0 = nominal)
    if (setup.voltageSetpoint !== undefined) {
      gen.avrSetpoint = s.nominalVoltage * setup.voltageSetpoint;
    }

    // Set droop
    if (setup.droopPercent !== undefined) {
      gen.droopPercent = setup.droopPercent;
    }

    // Set isochronous comms
    if (setup.isoCommsEnabled !== undefined) {
      gen.isoCommsEnabled = setup.isoCommsEnabled;
    }

    // Set auto-start
    if (setup.autoStart !== undefined) {
      gen.autoStart = setup.autoStart;
    }
  }

  /**
   * Set the load demand on the main bus.
   */
  setLoadDemand(kw) {
    this.settings.baseLoad = Math.max(0, kw);
    this.mainBus.totalLoad = this.settings.baseLoad;
  }

  /**
   * Force blackout state (for level setup).
   */
  forceBlackout(isBlackout) {
    this.blackout = isBlackout;
    if (isBlackout) {
      this.mainBus.voltage = 0;
      this.mainBus.frequency = 0;
      this.mainBus.live = false;
      this.mainBus.totalGeneration = 0;
    }
  }

  /**
   * Set EMG auto-start enable/disable.
   */
  setEmgAutoStart(enabled) {
    this.generators.EMG.autoStart = !!enabled;
  }

  /**
   * Trip a generator's breaker (for scheduled events).
   */
  tripGenerator(id, reason) {
    const gen = this.generators[id];
    if (!gen) return;
    if (gen.breakerState === BreakerState.CLOSED) {
      this._tripBreaker(gen, reason || 'overcurrent');
    }
  }

  /**
   * Set battery timer (for blackout recovery levels).
   */
  setBatteryTimer(seconds) {
    this._batteryTimer = seconds;
    this._batteryTimerActive = true;
  }

  /**
   * Force main bus voltage (for level setup, e.g., dead bus = 0).
   */
  forceBusVoltage(v) {
    this.mainBus.voltage = v;
    this.mainBus.live = v > 50;
  }

  /**
   * Force main bus frequency (for level setup, e.g., dead bus = 0).
   */
  forceBusFrequency(f) {
    this.mainBus.frequency = f;
  }

  /**
   * Set sync mode hint (unused by engine, for UI hints).
   */
  setSyncMode(mode) {
    this._syncMode = mode;
  }

  setBusTie(closed) {
    if (closed && !this.mainBus.live) {
      this._addAlert('warning', 'Cannot close bus-tie: main bus is dead');
      return;
    }
    const emg = this.generators.EMG;
    if (closed && emg.breakerState === BreakerState.CLOSED && this.mainBus.live) {
      // Closing bus-tie while EMG is on and main bus is live requires sync
      this._addAlert(
        'warning',
        'Close bus-tie with EMG online requires manual EMG shutdown first'
      );
      return;
    }
    this.emergencyBus.busTieClosed = !!closed;
    this._addAlert(
      'info',
      `Bus-tie ${closed ? 'CLOSED' : 'OPENED'}`
    );
  }

  /**
   * Auto-synchronise helper: attempts to close the breaker at the optimal
   * moment. Returns true if successful, false if conditions are too far off.
   */
  autoSync(id) {
    const gen = this.generators[id];
    if (!gen) return false;
    if (gen.state !== GenState.RUNNING) {
      this._addAlert('warning', `${id} is not running -- cannot auto-sync`);
      return false;
    }
    if (gen.breakerState !== BreakerState.OPEN) {
      this._addAlert('warning', `${id} breaker is not open`);
      return false;
    }

    const bus = gen.isEmergency ? this.emergencyBus : this.mainBus;
    if (!bus.live) {
      // First generator on bus -- just close
      this.closeBreaker(id);
      return true;
    }

    const s = this.settings;
    const dV = Math.abs(gen.voltage - bus.voltage);
    const dF = Math.abs(gen.frequency - bus.frequency);

    if (dV > s.syncVoltageTolerance * 2 || dF > s.syncFreqTolerance * 2) {
      this._addAlert(
        'warning',
        `${id} auto-sync: voltage or frequency too far off (dV=${dV.toFixed(1)}V, dF=${dF.toFixed(2)}Hz)`
      );
      return false;
    }

    // Wait for phase angle window
    const dTheta = Math.abs(angleDiff(gen.phaseAngle, bus.phaseAngle)) * RAD_TO_DEG;
    if (dTheta <= s.syncPhaseTolerance) {
      this.closeBreaker(id);
      return true;
    }

    this._addAlert(
      'info',
      `${id} auto-sync: waiting for phase window (current: ${dTheta.toFixed(1)} deg)`
    );
    return false;
  }

  // -----------------------------------------------------------------------
  // STATE SNAPSHOT (for UI rendering)
  // -----------------------------------------------------------------------
  getState() {
    const genSnapshot = {};
    for (const [id, gen] of Object.entries(this.generators)) {
      genSnapshot[id] = {
        id: gen.id,
        state: gen.state,
        stateTimer: gen.stateTimer,
        rpm: gen.rpm,
        voltage: gen.voltage,
        frequency: gen.frequency,
        phaseAngle: gen.phaseAngle,
        activePower: gen.activePower,
        reactivePower: gen.reactivePower,
        breakerState: gen.breakerState,
        breakerTripped: gen.breakerTripped,
        tripReason: gen.tripReason,
        governorSetpoint: gen.governorSetpoint,
        avrSetpoint: gen.avrSetpoint,
        droopPercent: gen.droopPercent,
        speedMode: gen.speedMode,
        isoCommsEnabled: gen.isoCommsEnabled,
        autoStart: gen.autoStart,
        fuelCommand: gen.fuelCommand,
        capacity: gen.capacity,
        isEmergency: gen.isEmergency,
        damaged: gen.damaged,
        loadPercent: gen.capacity > 0
          ? (gen.activePower / gen.capacity) * 100
          : 0,
      };
    }

    // Synchroscope data for each generator vs bus
    const synchroscopes = {};
    for (const [id, gen] of Object.entries(this.generators)) {
      if (gen.state === GenState.RUNNING && gen.breakerState === BreakerState.OPEN) {
        const bus = gen.isEmergency ? this.emergencyBus : this.mainBus;
        if (bus.live) {
          const dTheta = angleDiff(gen.phaseAngle, bus.phaseAngle);
          const dFreq = gen.frequency - bus.frequency;
          synchroscopes[id] = {
            needleAngle: dTheta,
            needleAngleDeg: dTheta * RAD_TO_DEG,
            rotationSpeed: dFreq,
            voltageDiff: gen.voltage - bus.voltage,
            freqDiff: dFreq,
            inWindow:
              Math.abs(dTheta * RAD_TO_DEG) < this.settings.syncPhaseTolerance &&
              Math.abs(dFreq) < this.settings.syncFreqTolerance &&
              Math.abs(gen.voltage - bus.voltage) < this.settings.syncVoltageTolerance,
          };
        }
      }
    }

    return {
      simTime: this.simTime,
      generators: genSnapshot,
      mainBus: { ...this.mainBus },
      emergencyBus: { ...this.emergencyBus },
      synchroscopes,
      alerts: this.alerts.slice(-50),
      blackout: this.blackout,
      gameOverReason: this.gameOverReason,
      damageCount: this.damageCount,
    };
  }

  // -----------------------------------------------------------------------
  // INTERNAL HELPERS
  // -----------------------------------------------------------------------

  _setGenState(gen, newState) {
    gen.state = newState;
    gen.stateTimer = 0;
  }

  _getOnlineMainGens() {
    return Object.values(this.generators).filter(
      (g) =>
        !g.isEmergency &&
        g.state === GenState.RUNNING &&
        g.breakerState === BreakerState.CLOSED
    );
  }

  _tripBreaker(gen, reason) {
    if (gen.breakerState === BreakerState.TRIPPED) return; // already tripped
    gen.breakerState = BreakerState.TRIPPED;
    gen.breakerTripped = true;
    gen.tripReason = reason;
    gen.activePower = 0;
    gen.reactivePower = 0;
    gen.isoIntegral = 0;

    // Reset protection timers
    gen.underFreqTimer = 0;
    gen.overFreqTimer = 0;
    gen.overcurrentTimer = 0;

    this._addAlert('critical', `${gen.id} breaker TRIPPED: ${reason}`);
  }

  _checkSync(gen) {
    const s = this.settings;
    const bus = this.mainBus;

    const dV = Math.abs(gen.voltage - bus.voltage);
    const dF = Math.abs(gen.frequency - bus.frequency);
    const dThetaDeg =
      Math.abs(angleDiff(gen.phaseAngle, bus.phaseAngle)) * RAD_TO_DEG;

    const reasons = [];

    // Phase angle severity
    if (dThetaDeg > 90) {
      return {
        severity: 'damage',
        reason: `Phase angle ${dThetaDeg.toFixed(1)} deg > 90 deg -- BLACKOUT risk`,
        dV,
        dF,
        dThetaDeg,
        blackout: true,
      };
    }
    if (dThetaDeg > 30) {
      return {
        severity: 'damage',
        reason: `Phase angle ${dThetaDeg.toFixed(1)} deg > 30 deg -- breaker will trip, damage`,
        dV,
        dF,
        dThetaDeg,
        blackout: false,
      };
    }
    if (dThetaDeg > s.syncPhaseTolerance) {
      reasons.push(`Phase ${dThetaDeg.toFixed(1)} deg`);
    }

    // Frequency
    if (dF > 0.5) {
      return {
        severity: 'damage',
        reason: `Freq diff ${dF.toFixed(2)} Hz > 0.5 Hz -- power swing, trip`,
        dV,
        dF,
        dThetaDeg,
        blackout: false,
      };
    }
    if (dF > s.syncFreqTolerance) {
      reasons.push(`Freq diff ${dF.toFixed(2)} Hz`);
    }

    // Voltage
    if (dV > s.syncVoltageTolerance * 3) {
      return {
        severity: 'damage',
        reason: `Voltage diff ${dV.toFixed(1)} V -- excessive`,
        dV,
        dF,
        dThetaDeg,
        blackout: false,
      };
    }
    if (dV > s.syncVoltageTolerance) {
      reasons.push(`Voltage diff ${dV.toFixed(1)} V`);
    }

    if (reasons.length > 0) {
      return {
        severity: 'warning',
        reason: reasons.join(', '),
        dV,
        dF,
        dThetaDeg,
        blackout: false,
      };
    }

    return { severity: 'ok', reason: 'Within tolerance', dV, dF, dThetaDeg, blackout: false };
  }

  _applySyncDamage(gen, syncResult) {
    this.damageCount++;

    if (syncResult.blackout) {
      // Phase angle > 90 deg: trip all breakers on bus (blackout)
      this._addAlert('critical', `BLACKOUT caused by bad synchronisation of ${gen.id}`);
      for (const g of Object.values(this.generators)) {
        if (g.breakerState === BreakerState.CLOSED && !g.isEmergency) {
          this._tripBreaker(g, 'sync_blackout');
        }
      }
      return;
    }

    if (syncResult.dThetaDeg > 30) {
      // Severe damage: trip the generator, mark as damaged
      this._tripBreaker(gen, 'sync_damage');
      gen.damaged = true;
      this._addAlert(
        'critical',
        `${gen.id} DAMAGED by out-of-phase sync (${syncResult.dThetaDeg.toFixed(1)} deg)`
      );

      if (this.damageCount >= 3) {
        this.gameOverReason = `Excessive equipment damage (${this.damageCount} incidents)`;
        this._addAlert('critical', `GAME OVER: ${this.gameOverReason}`);
      }
      return;
    }

    // Moderate: trip the breaker but no permanent damage
    this._tripBreaker(gen, 'sync_surge');
  }

  _addAlert(severity, message) {
    this.alerts.push({
      time: this.simTime,
      severity,
      message,
    });
    // Keep only last 200 alerts
    if (this.alerts.length > 200) {
      this.alerts = this.alerts.slice(-200);
    }
  }
}

export default PMSEngine;
