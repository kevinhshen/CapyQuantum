// Local preview: same game, JS simulator instead of Qiskit.
// Serve the folder (`npm run dev`) and open dev.html. Add ?speed=4 to playtest faster.
import { createLocalEngine } from './engine-local.js';
import { startGame } from './game.js';

const speed = Number(new URLSearchParams(location.search).get('speed')) || 1;
startGame(document.getElementById('app'), createLocalEngine(), { speed });
