import { NavLink, useNavigate } from 'react-router-dom';
import { CircleUser, Menu, Package, Search, Dumbbell, Home, LineChart, Utensils, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSession } from '@/contexts/SessionContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const Header = () => {
  const { profile, signOut } = useSession();
  const navigate = useNavigate();

  const navItems = [
    { to: "/dashboard", icon: <Home className="h-5 w-5" />, label: "Dashboard", adminOnly: false },
    { to: "/diet", icon: <Utensils className="h-5 w-5" />, label: "Dieta", adminOnly: false },
    { to: "/workouts", icon: <Dumbbell className="h-5 w-5" />, label: "Treinos", adminOnly: false },
    { to: "/bioimpedance", icon: <LineChart className="h-5 w-5" />, label: "Bioimpedância", adminOnly: false },
    { to: "/students", icon: <Users className="h-5 w-5" />, label: "Alunos", adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.adminOnly || profile?.role === 'admin');

  const getInitials = (firstName = '', lastName = '') => {
    const firstInitial = firstName ? firstName.charAt(0) : '';
    const lastInitial = lastName ? lastName.charAt(0) : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-2 text-lg font-medium">
            <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Package className="h-6 w-6" />
              <span className="sr-only">FitTrack</span>
            </NavLink>
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground ${
                    isActive ? 'bg-muted text-foreground' : ''
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="#" alt="User avatar" />
              <AvatarFallback>{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{profile?.first_name} {profile?.last_name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>Configurações</DropdownMenuItem>
          <DropdownMenuItem>Suporte</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Header;