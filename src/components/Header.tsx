import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CircleUser, Menu, Package, Search, Dumbbell, Home, LineChart, Utensils, Users, Scale, BarChart3, UserCheck, ChevronDown } from 'lucide-react'; // Import BarChart3 icon
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
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from './ui/skeleton';

type StudentSpreadsheet = {
  id: string;
  name: string;
  ownerEmail?: string;
  ownerName?: string;
};

const Header = () => {
  const { profile, signOut, user } = useSession();
  const navigate = useNavigate();
  const { listStudents, switchToSpreadsheet, spreadsheetId, initialized, originalSpreadsheetId } = useGoogleSheetsDB();
  const [sharedStudents, setSharedStudents] = useState<StudentSpreadsheet[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [currentStudentName, setCurrentStudentName] = useState<string | null>(null);

  const navItems = [
    { to: "/dashboard", icon: <Home className="h-5 w-5" />, label: "Dashboard", adminOnly: false },
    { to: "/diet", icon: <Utensils className="h-5 w-5" />, label: "Dieta", adminOnly: false },
    { to: "/workouts", icon: <Dumbbell className="h-5 w-5" />, label: "Treinos", adminOnly: false },
    { to: "/weight-tracking", icon: <Scale className="h-5 w-5" />, label: "Peso", adminOnly: false },
    { to: "/bioimpedance", icon: <LineChart className="h-5 w-5" />, label: "Bioimpedância", adminOnly: false },
    { to: "/reports", icon: <BarChart3 className="h-5 w-5" />, label: "Relatórios", adminOnly: false }, // New nav item
    { to: "/students", icon: <Users className="h-5 w-5" />, label: "Alunos", adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.adminOnly || profile?.role === 'admin');

  const getInitials = (firstName = '', lastName = '') => {
    const firstInitial = firstName ? firstName.charAt(0) : '';
    const lastInitial = lastName ? lastName.charAt(0) : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  // Fetch shared spreadsheets for any user
  useEffect(() => {
    const fetchSharedStudents = async () => {
      if (!initialized) {
        console.log('Header: Skipping fetch - not initialized');
        return;
      }
      console.log('Header: Fetching shared spreadsheets...');
      setLoadingStudents(true);
      try {
        const students = await listStudents();
        console.log('Header: Shared spreadsheets received:', students);
        setSharedStudents(students);
        
        // Find current student name if viewing a shared spreadsheet
        if (spreadsheetId && students.length > 0) {
          const currentStudent = students.find(s => s.id === spreadsheetId);
          if (currentStudent) {
            setCurrentStudentName(currentStudent.ownerName || currentStudent.ownerEmail || null);
          } else {
            setCurrentStudentName(null);
          }
        } else {
          setCurrentStudentName(null);
        }
      } catch (error: any) {
        console.error('Header: Error fetching shared spreadsheets:', error);
        // Don't show error if it's just that there are no shared spreadsheets
        if (!error.message?.includes('Nenhum aluno')) {
          showError(error.message || 'Erro ao carregar lista de planilhas compartilhadas.');
        }
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchSharedStudents();
  }, [initialized, spreadsheetId, listStudents]);

  const handleSwitchToStudent = async (studentSpreadsheetId: string | null) => {
    if (studentSpreadsheetId === spreadsheetId) {
      return;
    }

    try {
      setLoadingStudents(true);
      const targetSpreadsheetId = studentSpreadsheetId || originalSpreadsheetId;
      console.log('Header: Switching to spreadsheet:', targetSpreadsheetId);
      
      await switchToSpreadsheet(studentSpreadsheetId);
      
      // Wait a bit for the spreadsheetId state to update in useGoogleSheetsDB
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (studentSpreadsheetId) {
        const student = sharedStudents.find(s => s.id === studentSpreadsheetId);
        setCurrentStudentName(student?.ownerName || student?.ownerEmail || null);
        showSuccess('Planilha carregada com sucesso!');
      } else {
        setCurrentStudentName(null);
        showSuccess('Voltou para sua própria planilha!');
      }
      
      // Dispatch event to reload profile - no need to reload page
      // Pass the target spreadsheetId so the event handler can verify it was updated
      window.dispatchEvent(new CustomEvent('spreadsheetSwitched', { 
        detail: { 
          spreadsheetId: targetSpreadsheetId,
          studentEmail: studentSpreadsheetId ? sharedStudents.find(s => s.id === studentSpreadsheetId)?.ownerEmail : null,
          studentName: studentSpreadsheetId ? sharedStudents.find(s => s.id === studentSpreadsheetId)?.ownerName : null
        } 
      }));
    } catch (error: any) {
      showError(error.message || 'Erro ao alternar para planilha. Tente novamente.');
      console.error(error);
    } finally {
      setLoadingStudents(false);
    }
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
              <span className="sr-only">Black Academy</span>
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
      <div className="flex items-center gap-2">
        {/* Shared Spreadsheets Dropdown - shown for any user with shared spreadsheets */}
        {initialized && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {loadingStudents ? (
                  <Skeleton className="h-4 w-24" />
                ) : sharedStudents.length > 0 ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {currentStudentName ? currentStudentName : 'Minha Planilha'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    <span className="hidden md:inline">Minha Planilha</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Planilhas Compartilhadas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {loadingStudents ? (
                <div className="p-2">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : sharedStudents.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Nenhuma planilha compartilhada com você ainda.
                </div>
              ) : (
                <>
                  {/* Option to go back to own spreadsheet */}
                  {spreadsheetId !== originalSpreadsheetId && originalSpreadsheetId && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleSwitchToStudent(null)}
                      >
                        <div className="flex flex-col w-full">
                          <span className="font-medium">Minha Planilha</span>
                          <span className="text-xs text-muted-foreground">
                            Voltar para minha planilha
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {sharedStudents.map((student) => (
                    <DropdownMenuItem
                      key={student.id}
                      onClick={() => handleSwitchToStudent(student.id)}
                      className={student.id === spreadsheetId ? 'bg-muted' : ''}
                    >
                      <div className="flex flex-col w-full">
                        <span className="font-medium">{student.ownerName || student.ownerEmail || 'Usuário'}</span>
                        <span className="text-xs text-muted-foreground">
                          {student.id === spreadsheetId ? 'Visualizando' : 'Clique para visualizar'}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
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
      </div>
    </header>
  );
};

export default Header;