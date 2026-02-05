// ============================================================================
// ScoreManager.js - PMS Simulator Score Tracking
// ============================================================================
// Manages scoring throughout the game including base points, time bonuses,
// accuracy bonuses, streak multipliers, and penalties.
// ============================================================================

export default class ScoreManager {
  constructor() {
    this.reset();
  }

  /**
   * Reset all score tracking to initial state
   */
  reset() {
    this.totalScore = 0;
    this.penalties = 0;
    this.taskScores = [];
    this.streak = 0;
    this.multiplier = 1;
  }

  /**
   * Calculate and record the score for a completed task
   *
   * @param {number} taskId    - The task ID
   * @param {number} basePoints - Base points for the task (from task definition)
   * @param {number} parTime    - Par time in seconds (from task definition)
   * @param {number} actualTime - Actual completion time in seconds
   * @returns {object} Score breakdown for the task
   */
  addTaskScore(taskId, basePoints, parTime, actualTime) {
    // Base points scaled by current multiplier
    const scaledBase = Math.round(basePoints * this.multiplier);

    // Time bonus: awarded if completed faster than par time
    // Bonus = basePoints * (1 - actualTime/parTime), scaled by multiplier
    let timeBonus = 0;
    if (actualTime < parTime) {
      const rawBonus = basePoints * (1 - actualTime / parTime);
      timeBonus = Math.round(rawBonus * this.multiplier);
    }

    const taskTotal = scaledBase + timeBonus;

    // Record this task's score
    const taskScore = {
      taskId,
      basePoints: scaledBase,
      timeBonus,
      accuracyBonus: 0,  // Added separately via addAccuracyBonus
      penalties: 0,       // Task-specific penalties tracked here
      total: taskTotal,
      actualTime,
      parTime,
      multiplier: this.multiplier,
      streak: this.streak,
    };

    this.taskScores.push(taskScore);
    this.totalScore += taskTotal;

    // Update streak and multiplier
    this.streak += 1;
    this._updateMultiplier();

    return taskScore;
  }

  /**
   * Add accuracy bonus for synchronization precision
   * Called after a successful breaker close during synchronization.
   *
   * @param {number} phaseDegrees - Phase angle difference at moment of sync (degrees)
   * @returns {number} Bonus points awarded
   */
  addAccuracyBonus(phaseDegrees) {
    const absDeg = Math.abs(phaseDegrees);
    let bonus = 0;

    if (absDeg < 2) {
      bonus = 50;   // Near-perfect sync
    } else if (absDeg < 5) {
      bonus = 30;   // Excellent sync
    } else if (absDeg < 10) {
      bonus = 10;   // Good sync
    }
    // >= 10 degrees: no bonus (acceptable but not great)

    if (bonus > 0) {
      this.totalScore += bonus;

      // Add to the most recent task score if available
      if (this.taskScores.length > 0) {
        const lastTask = this.taskScores[this.taskScores.length - 1];
        lastTask.accuracyBonus += bonus;
        lastTask.total += bonus;
      }
    }

    return bonus;
  }

  /**
   * Apply a penalty. Resets streak and multiplier.
   *
   * Penalty types:
   *   'bad_sync'      - Failed synchronization attempt
   *   'reverse_power' - Reverse power trip occurred
   *   'damage'        - Equipment damage (e.g., closing breaker out of phase)
   *   'blackout'      - Total bus power loss
   *
   * @param {string} type   - The penalty type identifier
   * @param {number} points - Number of points to deduct
   * @returns {object} Penalty details
   */
  addPenalty(type, points) {
    const penalty = {
      type,
      points,
      timestamp: Date.now(),
    };

    this.totalScore -= points;
    this.penalties += points;

    // Reset streak and multiplier on any penalty
    this.streak = 0;
    this.multiplier = 1;

    // Track penalty against current task if applicable
    if (this.taskScores.length > 0) {
      const lastTask = this.taskScores[this.taskScores.length - 1];
      lastTask.penalties += points;
      lastTask.total -= points;
    }

    return penalty;
  }

  /**
   * Get complete current scoring state
   *
   * @returns {object} Full score state
   */
  getState() {
    return {
      totalScore: this.totalScore,
      penalties: this.penalties,
      taskScores: [...this.taskScores],
      streak: this.streak,
      multiplier: this.multiplier,
    };
  }

  /**
   * Get summary suitable for display
   *
   * @returns {object} Display-friendly summary
   */
  getSummary() {
    const totalBase = this.taskScores.reduce((sum, t) => sum + t.basePoints, 0);
    const totalTimeBonus = this.taskScores.reduce((sum, t) => sum + t.timeBonus, 0);
    const totalAccuracy = this.taskScores.reduce((sum, t) => sum + t.accuracyBonus, 0);
    const totalPenalties = this.taskScores.reduce((sum, t) => sum + t.penalties, 0);

    return {
      totalScore: this.totalScore,
      tasksCompleted: this.taskScores.length,
      totalBase,
      totalTimeBonus,
      totalAccuracy,
      totalPenalties: totalPenalties,
      globalPenalties: this.penalties,
      streak: this.streak,
      multiplier: this.multiplier,
    };
  }

  /**
   * Get the score breakdown for a specific task
   *
   * @param {number} taskId - The task ID to look up
   * @returns {object|undefined} Task score details
   */
  getTaskScore(taskId) {
    return this.taskScores.find(t => t.taskId === taskId);
  }

  /**
   * Update the multiplier based on current streak
   * @private
   */
  _updateMultiplier() {
    if (this.streak >= 5) {
      this.multiplier = 3;
    } else if (this.streak >= 3) {
      this.multiplier = 2;
    } else if (this.streak >= 2) {
      this.multiplier = 1.5;
    } else {
      this.multiplier = 1;
    }
  }
}
