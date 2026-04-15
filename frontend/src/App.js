import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LEDController from './pages/LEDController';
import './App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LEDController />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
