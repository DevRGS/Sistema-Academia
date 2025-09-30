import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '../ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import AddMealDialog from './AddMealDialog';
import { DietPlan } from '@/pages/Diet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { showError, showSuccess } from '@/utils/toast';

type StudentProfile = {
  id: string;
  first_name: string;
  last_name: string;
};

const DietManagement = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'student');
      if (data) setStudents(data);
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchDietPlan = async () => {
      if (!selectedStudentId) {
        setDietPlan([]);
        return;
      }
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', selectedStudentId);
      if (data) setDietPlan(data as DietPlan[]);
    };
    fetchDietPlan();
  }, [selectedStudentId]);

  const handleMealAdded = async () => {
     if (!selectedStudentId) return;
      const { data } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', selectedStudentId);
      if (data) setDietPlan(data as DietPlan[]);
  }

  const deleteMeal = async (mealId: number) => {
    const { error } = await supabase.from('diet_plans').delete().eq('id', mealId);
    if (error) {
      showError("Erro ao deletar refeição.");
    } else {
      showSuccess("Refeição deletada.");
      handleMealAdded();
    }
  }

  return (
    <div className="space-y-4">
      <Select onValueChange={setSelectedStudentId}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um aluno" />
        </SelectTrigger>
        <SelectContent>
          {students.map((student) => (
            <SelectItem key={student.id} value={student.id}>
              {student.first_name} {student.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedStudentId && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Refeição
            </Button>
          </div>
          <div className="space-y-2">
            {dietPlan.length > 0 ? dietPlan.map(meal => (
              <Card key={meal.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{meal.meal}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => deleteMeal(meal.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <CardDescription>{meal.scheduled_time}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{meal.description}</p>
                </CardContent>
              </Card>
            )) : <p className="text-center text-muted-foreground">Nenhuma refeição cadastrada para este aluno.</p>}
          </div>
          <AddMealDialog 
            isOpen={isDialogOpen} 
            setIsOpen={setIsDialogOpen} 
            studentId={selectedStudentId}
            onMealAdded={handleMealAdded}
          />
        </div>
      )}
    </div>
  );
};

export default DietManagement;