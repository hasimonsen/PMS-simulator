import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import PMSEngine from '../simulator/PMSEngine';
import TaskManager from '../game/TaskManager';
import ScoreManager from '../game/ScoreManager';
import { TASKS } from '../game/tasks';

const TICK_INTERVAL_MS = 50;
const TICK_DT = 0.05;
const ALERT_DURATION_MS = 5000;

const GameContext = createContext();

// ---------------------------------------------------------------------------
// Persistence helpers – prefer Electron IPC, fall back to localStorage
// ---------------------------------------------------------------------------

async function loadProgress() {
  try {
    if (window.electronAPI) {
      const data = await window.electronAPI.loadProgress();
      if (data && Array.isArray(data.unlockedLevels)) {
        return data.unlockedLevels;
      }
    }
  } catch (e) {
    console.error('Failed to load progress via electronAPI:', e);
  }
  try {
    const raw = localStorage.getItem('pms-unlocked-levels');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load progress from localStorage:', e);
  }
  return [1];
}

async function saveProgress(unlockedLevels) {
  try {
    if (window.electronAPI) {
      await window.electronAPI.saveProgress({ unlockedLevels });
    }
  } catch (e) {
    console.error('Failed to save progress via electronAPI:', e);
  }
  try {
    localStorage.setItem('pms-unlocked-levels', JSON.stringify(unlockedLevels));
  } catch (e) {
    console.error('Failed to save progress to localStorage:', e);
  }
}

// ---------------------------------------------------------------------------
// Helper: find task by level number
// ---------------------------------------------------------------------------
function findTaskByLevel(level) {
  // Tasks have an `id` field (1-14 sequential) and a `level` field matching
  // user-facing level number. Find by level first, fall back to id.
  return TASKS.find((t) => t.level === level) || TASKS.find((t) => t.id === level);
}

function getTaskIndex(level) {
  const idx = TASKS.findIndex((t) => t.level === level);
  return idx >= 0 ? idx : TASKS.findIndex((t) => t.id === level);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GameProvider({ children }) {
  // ---- Refs for non-reactive singletons ----
  const engineRef = useRef(null);
  const taskManagerRef = useRef(null);
  const scoreManagerRef = useRef(null);
  const loopRef = useRef(null);
  const taskStartTimeRef = useRef(null);
  const alertTimersRef = useRef([]);
  const busHasBeenLiveRef = useRef(false);

  // ---- Reactive state ----
  const [screen, setScreen] = useState('menu');
  const [playerName, setPlayerName] = useState('');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [engineState, setEngineState] = useState({});
  const [scoreState, setScoreState] = useState({ totalScore: 0, penalties: 0, taskScores: [], streak: 0, multiplier: 1 });
  const [taskProgress, setTaskProgress] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [gameOverReason, setGameOverReason] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [unlockedLevels, setUnlockedLevels] = useState([1]);
  const [taskElapsed, setTaskElapsed] = useState(0);

  // ---- Load persisted progress on mount ----
  useEffect(() => {
    loadProgress().then((levels) => setUnlockedLevels(levels));
  }, []);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
      alertTimersRef.current.forEach((id) => clearTimeout(id));
      alertTimersRef.current = [];
    };
  }, []);

  // -----------------------------------------------------------------------
  // Alerts
  // -----------------------------------------------------------------------

  const addAlert = useCallback((message, type = 'info') => {
    const alert = { message, type, timestamp: Date.now() };
    setAlerts((prev) => [...prev, alert]);

    const timerId = setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a !== alert));
    }, ALERT_DURATION_MS);

    alertTimersRef.current.push(timerId);
  }, []);

  // -----------------------------------------------------------------------
  // Game loop
  // -----------------------------------------------------------------------

  const stopLoop = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const triggerGameOver = useCallback((reason) => {
    stopLoop();
    setGameOverReason(reason);
    setScreen('gameover');
  }, [stopLoop]);

  const completeTaskRef = useRef(null);

  const startLoop = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current);

    setIsRunning(true);
    setIsPaused(false);

    loopRef.current = setInterval(() => {
      const engine = engineRef.current;
      const taskManager = taskManagerRef.current;
      const scoreManager = scoreManagerRef.current;

      if (!engine || !taskManager) return;

      // Advance simulation
      engine.tick(TICK_DT);

      // Snapshot engine state for React
      const snap = engine.getState();
      setEngineState(snap);

      // Update elapsed time
      if (taskStartTimeRef.current !== null) {
        setTaskElapsed((Date.now() - taskStartTimeRef.current) / 1000);
      }

      // Check task completion
      const progress = taskManager.getProgress();
      setTaskProgress(progress);

      if (scoreManager) {
        setScoreState(scoreManager.getState());
      }

      // Check for task completion
      if (taskManager.checkCompletion(snap)) {
        if (completeTaskRef.current) {
          completeTaskRef.current();
        }
        return;
      }

      // Check for task failure
      const failReason = taskManager.checkFailure(snap);
      if (failReason) {
        if (scoreManager) {
          scoreManager.addPenalty('task_fail', 100);
          setScoreState(scoreManager.getState());
        }
        addAlert(failReason, 'danger');
      }

      // Check for game-over from engine
      if (snap.gameOverReason) {
        stopLoop();
        setGameOverReason(snap.gameOverReason);
        setScreen('gameover');
        return;
      }

      // Track if bus has ever been live (so dead-bus start levels don't
      // immediately trigger the blackout game-over timer)
      if (snap.mainBus && snap.mainBus.live) {
        busHasBeenLiveRef.current = true;
      }

      // Check for blackout game-over (only if not a blackout recovery level
      // and bus was previously live -- i.e. power was *lost*, not never established)
      const currentTask = taskManager.getCurrentTask();
      const isBlackoutLevel = currentTask && (currentTask.key === '11' || currentTask.key === '12');
      if (snap.blackout && !isBlackoutLevel && busHasBeenLiveRef.current) {
        // Give a grace period, then game over
        if (engine.blackoutTimer > 10) {
          stopLoop();
          setGameOverReason('Prolonged blackout - all power lost');
          setScreen('gameover');
        }
      }
    }, TICK_INTERVAL_MS);
  }, [stopLoop, addAlert]);

  // -----------------------------------------------------------------------
  // Task completion & level progression
  // -----------------------------------------------------------------------

  const completeTask = useCallback(() => {
    const scoreManager = scoreManagerRef.current;
    const taskManager = taskManagerRef.current;
    const currentTask = taskManager?.getCurrentTask();

    if (scoreManager && currentTask) {
      const elapsed = taskStartTimeRef.current !== null
        ? (Date.now() - taskStartTimeRef.current) / 1000
        : 0;
      scoreManager.addTaskScore(
        currentTask.id,
        currentTask.basePoints,
        currentTask.parTime,
        elapsed
      );
      setScoreState(scoreManager.getState());
    }

    addAlert('Task Complete!', 'success');

    // Find current and next task by index in TASKS array
    const currentIdx = getTaskIndex(currentLevel);
    const nextIdx = currentIdx + 1;
    const nextTask = nextIdx < TASKS.length ? TASKS[nextIdx] : null;
    const nextLevel = nextTask ? (nextTask.level || nextTask.id) : null;

    // Unlock the next level
    if (nextLevel !== null) {
      setUnlockedLevels((prev) => {
        const updated = prev.includes(nextLevel) ? prev : [...prev, nextLevel];
        saveProgress(updated);
        return updated;
      });
    }

    // Check if there is a next task in the TASKS array
    if (nextTask) {
      setCurrentLevel(nextLevel);

      // Reset engine and set up next task
      const engine = engineRef.current;
      if (engine && taskManager) {
        engine.init();
        taskManager.jumpToTask(nextIdx);
        taskManager.setupTask(engine);
      }

      taskStartTimeRef.current = Date.now();
      setTaskElapsed(0);
      addAlert(`Level ${nextTask.level || nextTask.id} started!`, 'success');
    } else {
      // No more tasks – game complete
      stopLoop();
      setGameOverReason('complete');
      setScreen('gameover');
    }
  }, [currentLevel, addAlert, stopLoop]);

  // Keep completeTaskRef in sync
  completeTaskRef.current = completeTask;

  // -----------------------------------------------------------------------
  // Start / pause / resume / quit
  // -----------------------------------------------------------------------

  const startGame = useCallback((level) => {
    // Create fresh instances
    const engine = new PMSEngine();
    const scoreManager = new ScoreManager();

    // Find the task index for the chosen level
    const taskIdx = getTaskIndex(level);
    const taskList = taskIdx >= 0 ? TASKS : [TASKS[0]];
    const startIdx = taskIdx >= 0 ? taskIdx : 0;

    const taskManager = new TaskManager(taskList, startIdx);

    engineRef.current = engine;
    taskManagerRef.current = taskManager;
    scoreManagerRef.current = scoreManager;

    // Initialize engine and set up the task
    engine.init();
    taskManager.setupTask(engine);

    setCurrentLevel(level);
    setGameOverReason(null);
    setAlerts([]);
    setTaskElapsed(0);
    taskStartTimeRef.current = Date.now();
    busHasBeenLiveRef.current = false;

    // Take initial snapshot
    setEngineState(engine.getState());
    setScoreState(scoreManager.getState());
    setTaskProgress(taskManager.getProgress());

    setScreen('game');
    startLoop();
  }, [startLoop]);

  const pauseGame = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    setIsPaused(true);
    setIsRunning(false);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
    startLoop();
  }, [startLoop]);

  const quitGame = useCallback(() => {
    stopLoop();
    if (taskManagerRef.current) {
      taskManagerRef.current.destroy();
    }
    setIsPaused(false);
    setGameOverReason(null);
    setAlerts([]);
    setScreen('menu');
  }, [stopLoop]);

  // -----------------------------------------------------------------------
  // Engine pass-through actions
  // -----------------------------------------------------------------------

  const startGenerator = useCallback((id) => {
    engineRef.current?.startGenerator(id);
  }, []);

  const stopGenerator = useCallback((id) => {
    engineRef.current?.stopGenerator(id);
  }, []);

  const closeBreaker = useCallback((id) => {
    engineRef.current?.closeBreaker(id);
  }, []);

  const openBreaker = useCallback((id) => {
    engineRef.current?.openBreaker(id);
  }, []);

  const resetBreaker = useCallback((id) => {
    engineRef.current?.resetBreaker(id);
  }, []);

  const setGovernorSetpoint = useCallback((id, value) => {
    engineRef.current?.setGovernorSetpoint(id, value);
  }, []);

  const setAvrSetpoint = useCallback((id, value) => {
    engineRef.current?.setAvrSetpoint(id, value);
  }, []);

  const setSpeedMode = useCallback((id, mode) => {
    engineRef.current?.setSpeedMode(id, mode);
  }, []);

  const setDroopPercent = useCallback((id, value) => {
    engineRef.current?.setDroopPercent(id, value);
  }, []);

  const setIsoComms = useCallback((id, enabled) => {
    engineRef.current?.setIsoComms(id, enabled);
  }, []);

  const autoSync = useCallback((id) => {
    engineRef.current?.autoSync(id);
  }, []);

  const setBusTie = useCallback((closed) => {
    engineRef.current?.setBusTie(closed);
  }, []);

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------

  const value = {
    // State
    screen,
    playerName,
    currentLevel,
    engineState,
    scoreState,
    taskProgress,
    isPaused,
    isRunning,
    gameOverReason,
    alerts,
    unlockedLevels,
    taskElapsed,

    // Navigation & identity
    setScreen,
    setPlayerName,

    // Game lifecycle
    startGame,
    pauseGame,
    resumeGame,
    quitGame,
    completeTask,
    triggerGameOver,
    addAlert,

    // Engine pass-through
    startGenerator,
    stopGenerator,
    closeBreaker,
    openBreaker,
    resetBreaker,
    setGovernorSetpoint,
    setAvrSetpoint,
    setSpeedMode,
    setDroopPercent,
    setIsoComms,
    autoSync,
    setBusTie,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}

export default GameContext;
