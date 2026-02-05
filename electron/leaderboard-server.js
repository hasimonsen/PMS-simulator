const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const SCORES_FILE = path.join(__dirname, '..', 'data', 'lan-scores.json');

app.use(cors());
app.use(express.json());

function ensureDataDir() {
  const dir = path.dirname(SCORES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadScores() {
  ensureDataDir();
  try {
    if (fs.existsSync(SCORES_FILE)) {
      return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load scores:', e);
  }
  return [];
}

function saveScores(scores) {
  ensureDataDir();
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
}

app.get('/api/scores', (_req, res) => {
  const scores = loadScores();
  res.json(scores.slice(0, 50));
});

app.post('/api/scores', (req, res) => {
  const { playerName, level, totalScore, taskScores, timestamp } = req.body;
  if (!playerName || totalScore === undefined) {
    return res.status(400).json({ error: 'playerName and totalScore required' });
  }
  const scores = loadScores();
  scores.push({
    playerName,
    level: level || 0,
    totalScore: totalScore || 0,
    taskScores: taskScores || [],
    timestamp: timestamp || new Date().toISOString(),
  });
  scores.sort((a, b) => b.totalScore - a.totalScore);
  const trimmed = scores.slice(0, 200);
  saveScores(trimmed);
  res.json({ rank: trimmed.findIndex(s => s.timestamp === (timestamp || '')) + 1, scores: trimmed.slice(0, 50) });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PMS Leaderboard server running on http://0.0.0.0:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/scores   - Get top 50 scores');
  console.log('  POST /api/scores   - Submit a score');
});
