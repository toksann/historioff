import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import reportWebVitals from './reportWebVitals.js';
import { effectMonitor } from './gameLogic/EffectMonitor.js'; // Import the singleton instance
import { setEffectLogger } from './gameLogic/effectHandler.js'; // Import the setter function

// Set the global effect logger as early as possible
setEffectLogger(effectMonitor);
console.log('🎬ANIM [index.js] Global EffectLogger set.');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
