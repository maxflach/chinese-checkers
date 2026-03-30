import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';

export function AppHeader() {
  const { data: user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="px-4 py-3 flex items-center justify-between bg-amber-900/90 backdrop-blur-sm border-b border-amber-800/50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <nav className="flex gap-1">
        <NavLink to="/lobby" active={isActive('/lobby')}>Games</NavLink>
        <NavLink to="/friends" active={isActive('/friends')}>Friends</NavLink>
      </nav>

      <div className="flex items-center gap-3">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-amber-100">
            {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="text-amber-400 text-sm hover:text-amber-200 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-amber-800 text-amber-100'
          : 'text-amber-400 hover:text-amber-200'
      }`}
    >
      {children}
    </Link>
  );
}
