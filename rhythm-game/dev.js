import { localEngine } from './model.js';
import { startGame } from './game.js';
await startGame(document.getElementById('app'), localEngine);
