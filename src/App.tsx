import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WeekPage    from './pages/WeekPage';
import RoutinePage from './pages/RoutinePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<WeekPage />}    />
        <Route path="/routine/:day"   element={<RoutinePage />} />
      </Routes>
    </BrowserRouter>
  );
}
