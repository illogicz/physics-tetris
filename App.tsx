
import React from 'react';
import Game from './components/Game';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 font-mono">
      <header className="text-center mb-4">
        <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 tracking-wider">
          Physics Tetris Duels
        </h1>
        <p className="text-slate-400 mt-2">Challenge an AI opponent in a physics-based race to the top.</p>
      </header>
      <Game />
      <footer className="mt-4 text-center text-slate-500 text-sm">
        <p>Built by a world-class senior frontend React engineer.</p>
      </footer>
    </div>
  );
}

export default App;
