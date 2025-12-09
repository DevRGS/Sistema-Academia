import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
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
  const { select, delete: deleteRow, initialized, loading: dbLoading } = useGoogleSheetsDB();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!initialized) return;
      try {
        const data = await select<StudentProfile>('profiles', { eq: { column: 'role', value: 'student' } });
        // Remove duplicates by ID - keep only the first occurrence of each unique ID
        const uniqueStudents = data.filter((student, index, self) => 
          index === self.findIndex((s) => String(s.id) === String(student.id))
        );
        setStudents(uniqueStudents);
      } catch (error) {
        console.error(error);
      }
    };
    if (initialized && !dbLoading) {
      fetchStudents();
    }
  }, [initialized, dbLoading]);

  useEffect(() => {
    const fetchDietPlan = async () => {
      if (!selectedStudentId || !initialized) {
        setDietPlan([]);
        return;
      }
      try {
        const data = await select<DietPlan>('diet_plans', { eq: { column: 'user_id', value: selectedStudentId } });
        setDietPlan(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDietPlan();
  }, [selectedStudentId, initialized]);

  const handleMealAdded = async () => {
     if (!selectedStudentId || !initialized) return;
     try {
       const data = await select<DietPlan>('diet_plans', { eq: { column: 'user_id', value: selectedStudentId } });
       setDietPlan(data);
     } catch (error) {
       console.error(error);
     }
  }

  const deleteMeal = async (mealId: number) => {
    if (!initialized) return;
    try {
      await deleteRow('diet_plans', { column: 'id', value: mealId });
      showSuccess("Refeição deletada.");
      handleMealAdded();
    } catch (error) {
      showError("Erro ao deletar refeição.");
      console.error(error);
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