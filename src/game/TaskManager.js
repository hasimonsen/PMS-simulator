// ============================================================================
// TaskManager.js - PMS Simulator Task/Level Manager
// ============================================================================
// Manages the progression through tasks during gameplay. Handles task setup,
// completion checking, failure detection, timing, and advancement.
// ============================================================================

export default class TaskManager {
  /**
   * @param {Array} tasks      - Array of task definitions (from tasks.js)
   * @param {number} startLevel - Index into tasks array to start from (0-based)
   */
  constructor(tasks, startLevel = 0) {
    this.tasks = tasks;
    this.currentIndex = Math.max(0, Math.min(startLevel, tasks.length - 1));
    this.taskStartTime = null;
    this.completionHoldStart = null;
    this.scheduledTimeouts = [];
    this.taskActive = false;
  }

  /**
   * Get the current task definition
   * @returns {object} Current task object
   */
  getCurrentTask() {
    return this.tasks[this.currentIndex] || null;
  }

  /**
   * Set up the current task on the engine.
   * Configures generators, load, bus state, and schedules events.
   *
   * @param {object} engine - The PMSEngine instance
   */
  setupTask(engine) {
    this.resetTimer();
    this.completionHoldStart = null;
    this._clearScheduledEvents();

    const task = this.getCurrentTask();
    if (!task) return;

    const setup = task.setup;

    // ----- Configure generators -----
    if (setup.generators) {
      for (const [genId, genSetup] of Object.entries(setup.generators)) {
        // Force each generator into its initial state
        engine.forceGeneratorState(genId, {
          state: genSetup.state || 'OFF',
          breakerState: genSetup.breakerState || 'OPEN',
          governorMode: genSetup.governorMode || 'droop',
          speedSetpoint: genSetup.speedSetpoint !== undefined ? genSetup.speedSetpoint : 1.0,
          voltageSetpoint: genSetup.voltageSetpoint !== undefined ? genSetup.voltageSetpoint : 1.0,
          loadSharingComms: genSetup.loadSharingComms !== undefined ? genSetup.loadSharingComms : false,
          autoStart: genSetup.autoStart !== undefined ? genSetup.autoStart : false,
        });
      }
    }

    // ----- Configure bus state -----
    if (setup.busVoltage !== undefined) {
      engine.forceBusVoltage(setup.busVoltage);
    }
    if (setup.busFrequency !== undefined) {
      engine.forceBusFrequency(setup.busFrequency);
    }

    // ----- Configure load -----
    if (setup.loadDemand !== undefined) {
      engine.setLoadDemand(setup.loadDemand);
    }

    // ----- Configure blackout state -----
    if (setup.blackout) {
      engine.forceBlackout(true);
    }

    // ----- Configure EMG auto-start -----
    if (setup.emgAutoStart !== undefined) {
      engine.setEmgAutoStart(setup.emgAutoStart);
    }

    // ----- Configure battery timer -----
    if (setup.batteryTimer !== undefined) {
      engine.setBatteryTimer(setup.batteryTimer);
    }

    // ----- Configure sync mode for the task -----
    if (setup.syncMode) {
      engine.setSyncMode(setup.syncMode);
    }

    // ----- Schedule timed events -----
    if (setup.scheduledEvents && setup.scheduledEvents.length > 0) {
      for (const event of setup.scheduledEvents) {
        const timeoutId = setTimeout(() => {
          if (!this.taskActive) return;
          this._executeScheduledEvent(engine, event);
        }, (event.delay || 0) * 1000);

        this.scheduledTimeouts.push(timeoutId);
      }
    }

    // Start timing
    this.taskStartTime = Date.now();
    this.taskActive = true;
  }

  /**
   * Execute a scheduled event on the engine
   * @private
   * @param {object} engine - The PMSEngine instance
   * @param {object} event  - The event definition
   */
  _executeScheduledEvent(engine, event) {
    switch (event.type) {
      case 'generator_trip':
        engine.tripGenerator(event.target, event.reason || 'trip.overcurrent');
        break;

      case 'emg_auto_start':
        engine.startEmergencyGenerator();
        break;

      case 'load_step':
        engine.setLoadDemand(event.value);
        break;

      case 'breaker_trip':
        engine.tripBreaker(event.target, event.reason || 'trip.overcurrent');
        break;

      default:
        console.warn(`Unknown scheduled event type: ${event.type}`);
    }
  }

  /**
   * Check if the current task's completion conditions are met.
   * Handles hold-time requirements (e.g., "stable for 5 seconds").
   *
   * @param {object} engineState - Current engine state snapshot
   * @returns {boolean} True if task is complete
   */
  checkCompletion(engineState) {
    const task = this.getCurrentTask();
    if (!task || !task.checkComplete) return false;

    const conditionMet = task.checkComplete(engineState);

    // If the task has a completion hold time requirement
    if (task.setup.completionHoldTime && task.setup.completionHoldTime > 0) {
      if (conditionMet) {
        if (this.completionHoldStart === null) {
          // Start tracking hold time
          this.completionHoldStart = Date.now();
        }
        // Check if we've held long enough
        const heldSeconds = (Date.now() - this.completionHoldStart) / 1000;
        return heldSeconds >= task.setup.completionHoldTime;
      } else {
        // Condition broke - reset hold timer
        this.completionHoldStart = null;
        return false;
      }
    }

    return conditionMet;
  }

  /**
   * Check if any failure condition is met for the current task
   *
   * @param {object} engineState - Current engine state snapshot
   * @returns {string|null} Failure reason string, or null if no failure
   */
  checkFailure(engineState) {
    const task = this.getCurrentTask();
    if (!task || !task.checkFail) return null;

    return task.checkFail(engineState);
  }

  /**
   * Advance to the next task
   *
   * @returns {boolean} True if there are more tasks, false if game is complete
   */
  advanceTask() {
    this.taskActive = false;
    this._clearScheduledEvents();
    this.completionHoldStart = null;

    if (this.currentIndex < this.tasks.length - 1) {
      this.currentIndex += 1;
      return true;
    }
    return false; // No more tasks - game complete
  }

  /**
   * Get current progress information
   *
   * @returns {object} Progress state
   */
  getProgress() {
    return {
      currentIndex: this.currentIndex,
      totalTasks: this.tasks.length,
      currentTask: this.getCurrentTask(),
      isLastTask: this.currentIndex === this.tasks.length - 1,
      percentComplete: Math.round((this.currentIndex / this.tasks.length) * 100),
    };
  }

  /**
   * Get elapsed time in seconds since the current task started
   *
   * @returns {number} Elapsed seconds, or 0 if timer not started
   */
  getElapsedTime() {
    if (!this.taskStartTime) return 0;
    return (Date.now() - this.taskStartTime) / 1000;
  }

  /**
   * Reset the task timer (e.g., on retry)
   */
  resetTimer() {
    this.taskStartTime = Date.now();
    this.completionHoldStart = null;
  }

  /**
   * Stop the current task (deactivate without advancing)
   */
  stopTask() {
    this.taskActive = false;
    this._clearScheduledEvents();
  }

  /**
   * Jump to a specific task by index
   *
   * @param {number} index - Task index (0-based)
   * @returns {boolean} True if the index is valid
   */
  jumpToTask(index) {
    if (index >= 0 && index < this.tasks.length) {
      this.taskActive = false;
      this._clearScheduledEvents();
      this.completionHoldStart = null;
      this.currentIndex = index;
      return true;
    }
    return false;
  }

  /**
   * Jump to a specific task by its key (e.g., '4a', '11')
   *
   * @param {string} key - Task key
   * @returns {boolean} True if found and jumped to
   */
  jumpToTaskByKey(key) {
    const index = this.tasks.findIndex(t => t.key === key);
    if (index >= 0) {
      return this.jumpToTask(index);
    }
    return false;
  }

  /**
   * Check if the task timer has exceeded a given time limit
   *
   * @param {number} timeLimitSeconds - Time limit in seconds
   * @returns {boolean} True if time limit exceeded
   */
  isTimeExpired(timeLimitSeconds) {
    return this.getElapsedTime() > timeLimitSeconds;
  }

  /**
   * Clear all scheduled event timeouts
   * @private
   */
  _clearScheduledEvents() {
    for (const timeoutId of this.scheduledTimeouts) {
      clearTimeout(timeoutId);
    }
    this.scheduledTimeouts = [];
  }

  /**
   * Clean up resources (call on destroy)
   */
  destroy() {
    this.taskActive = false;
    this._clearScheduledEvents();
  }
}
