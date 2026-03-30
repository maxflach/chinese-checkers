import { AppHeader } from './AppHeader';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-amber-950">
      <AppHeader />
      <main className="flex-1 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {children}
      </main>
    </div>
  );
}
