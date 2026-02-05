import React, { useState } from 'react';
import {
  User,
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  Globe,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { selectUser } from '@/store/selectors/authSelectors';
import { selectIsDemoMode } from '@/store/slices/demoSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HeaderProps {
  sidebarWidth: number;
  topOffset?: number;
}

const Header: React.FC<HeaderProps> = ({ sidebarWidth, topOffset = 0 }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isDemoMode = useAppSelector(selectIsDemoMode);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const [language, setLanguage] = useState<'en' | 'zh'>(() => {
    if (typeof window !== 'undefined') {
      return (window.localStorage.getItem('language') as 'en' | 'zh') || 'en';
    }
    return 'en';
  });

  const handleLogout = async () => {
    try {
      dispatch(logout());
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    setLanguage(lang);
    window.localStorage.setItem('language', lang);
    toast.success(
      lang === 'en' ? 'Language set to English' : 'Language set to Chinese'
    );
  };

  const handleThemeChange = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
    window.localStorage.setItem('theme', checked ? 'dark' : 'light');
  };

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const notificationCount = 3;

  return (
    <TooltipProvider>
      <header
        role="banner"
        className={cn(
          'fixed right-0 z-30',
          'h-16 flex items-center justify-between px-6',
          'bg-background border-b border-border',
          'transition-all duration-300 ease-in-out'
        )}
        style={{
          top: topOffset,
          left: sidebarWidth,
          width: `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        {/* Left side - Search */}
        <div className="flex items-center gap-4" role="search">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search documents..."
              aria-label="Search documents"
              className="w-[300px] pl-9 bg-muted/40 border border-border/50 hover:border-border hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Language */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5" aria-label={`Language: ${language === 'en' ? 'English' : 'Chinese'}`}>
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">
                      {language.toUpperCase()}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Language</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLanguageChange('zh')}>
                Chinese
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}>
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center" aria-hidden="true">
                        {notificationCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-2 py-1.5 text-sm font-semibold">
                Notifications
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="py-1">
                  <div className="text-sm">New document processed</div>
                  <div className="text-xs text-muted-foreground">
                    2 minutes ago
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="py-1">
                  <div className="text-sm">Export completed</div>
                  <div className="text-xs text-muted-foreground">
                    5 minutes ago
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-primary cursor-pointer"
                onClick={() => navigate('/notifications')}
              >
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2" role="group" aria-label="Theme toggle">
                <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Switch
                  checked={darkMode}
                  onCheckedChange={handleThemeChange}
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                />
                <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {darkMode ? 'Light mode' : 'Dark mode'}
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-2" aria-hidden="true" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 relative" aria-label={`User menu for ${user?.full_name || 'User'}`}>
                {isDemoMode && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-yellow-400 text-gray-900 rounded" aria-label="Demo mode active">
                    DEMO
                  </span>
                )}
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground" aria-hidden="true">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium">
                    {user?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email || 'user@doctify.io'}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="h-4 w-4 mr-2" aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default Header;
