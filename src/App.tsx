/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CitizenApp from './pages/CitizenApp';
import ControlRoom from './pages/ControlRoom';
import Landing from './pages/Landing';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/citizen/*" element={<CitizenApp />} />
        <Route path="/control/*" element={<ControlRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
