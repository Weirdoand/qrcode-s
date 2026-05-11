import { LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthContext';

export function AuthButton() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-8 text-xs font-bold uppercase tracking-wider border-white/20 text-white bg-transparent opacity-60"
      >
        ...
      </Button>
    );
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs font-bold uppercase tracking-wider border-white/20 hover:bg-white/10 text-white bg-transparent"
        onClick={login}
      >
        <LogIn className="h-3 w-3 mr-2" />
        Sign in with Google
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-white/10 bg-white/5">
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-full ring-1 ring-white/20"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-[10px] font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[11px] font-bold uppercase tracking-wider text-white max-w-[120px] truncate hidden sm:inline">
          {user.name}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white hover:bg-white/10"
        onClick={logout}
        title="Sign out"
      >
        <LogOut className="h-3 w-3" />
      </Button>
    </div>
  );
}
