import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AddContainer from './pages/AddContainer';
import ImportShipment from './pages/ImportShipment';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddContainer />} />
        <Route path="/import" element={<ImportShipment />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
