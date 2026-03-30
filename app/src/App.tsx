import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AuthGuard } from './components/AuthGuard';
import { LobbyPage } from './pages/LobbyPage';
import { FriendsPage } from './pages/FriendsPage';
import { GamePage } from './pages/GamePage';
import { useAuth } from './hooks/useAuth';
import { useFcmToken } from './hooks/useFcmToken';

function FcmProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useAuth();
  useFcmToken(user?.uid);
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <FcmProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lobby" element={<AuthGuard><LobbyPage /></AuthGuard>} />
          <Route path="/friends" element={<AuthGuard><FriendsPage /></AuthGuard>} />
          <Route path="/game/:gameId" element={<AuthGuard><GamePage /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
      </FcmProvider>
    </BrowserRouter>
  );
}
