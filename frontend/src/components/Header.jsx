import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './theme-toggle';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, Settings, LogOut } from 'lucide-react';
import axios from '@/utils/axios';
import { toast } from 'sonner';

const roleBadge = { admin: 'bg-red-100 text-red-800', manager: 'bg-blue-100 text-blue-800', technician: 'bg-green-100 text-green-800' };

const sectionTitle = (path) => {
  if (path.startsWith('/app/dashboard')) return 'Dashboard';
  if (path.startsWith('/app/jobs')) return 'Jobs';
  if (path.startsWith('/app/assembly')) return 'Assembly';
  if (path.startsWith('/app/inventory')) return 'Inventory';
  if (path.startsWith('/app/software-keys')) return 'Software Keys';
  if (path.startsWith('/app/clients')) return 'Clients';
  if (path.startsWith('/app/repairs')) return 'Repairs';
  if (path.startsWith('/app/reports')) return 'Reports';
  if (path.startsWith('/app/settings')) return 'Settings';
  return 'Dashboard';
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ full_name: '', role: '' });

  useEffect(() => {
    axios.get(`${API_URL}/auth/me`)
      .then(({ data }) => { if (data.Status) setUser(data.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
      toast.success('Logged out');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const initials = user.full_name ? user.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '??';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold tracking-tight hidden sm:block">{sectionTitle(location.pathname)}</h1>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none">
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold">{user.full_name || 'Loading...'}</p>
                {user.role && (
                  <Badge className={`text-xs ${roleBadge[user.role] || ''}`}>{user.role}</Badge>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/app/settings/account')}>
                <User className="mr-2 h-4 w-4" /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings')}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
