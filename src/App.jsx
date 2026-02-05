import React from 'react';
import { LangProvider } from './context/LangContext';
import { SettingsProvider } from './context/SettingsContext';
import { GameProvider, useGame } from './context/GameContext';
import MainMenu from './screens/MainMenu';
import GameScreen from './screens/GameScreen';
import GameOver from './screens/GameOver';
import Leaderboard from './screens/Leaderboard';
import SettingsPage from './screens/SettingsPage';

function AppRouter() {
  const { screen } = useGame();

  switch (screen) {
    case 'game':
      return <GameScreen />;
    case 'gameover':
      return <GameOver />;
    case 'leaderboard':
      return <Leaderboard />;
    case 'settings':
      return <SettingsPage />;
    case 'menu':
    default:
      return <MainMenu />;
  }
}

export default function App() {
  return (
    <LangProvider>
      <SettingsProvider>
        <GameProvider>
          <div className="app">
            <AppRouter />
          </div>
        </GameProvider>
      </SettingsProvider>
    </LangProvider>
  );
}
