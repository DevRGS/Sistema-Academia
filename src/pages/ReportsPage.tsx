import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import ReportsDashboard from '@/components/reports/ReportsDashboard';

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios e Análises</h1>
        <Button variant="outline" asChild>
          <NavLink to="/dashboard">
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </NavLink>
        </Button>
      </div>
      <ReportsDashboard />
    </div>
  );
};

export default ReportsPage;