import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Workout } from '@/pages/Workouts';
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { NavLink } from "react-router-dom";
import { PlayCircle, Edit } from "lucide-react";
import { useState } from "react";
import EditWorkoutDialog from "./EditWorkoutDialog";

const WorkoutList = ({ workouts, onWorkoutUpdated }: { workouts: Workout[], onWorkoutUpdated: () => void }) => {
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (!workouts || workouts.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">Nenhum treino encontrado.</p>
        <p className="text-sm text-muted-foreground">Adicione um novo treino para começar.</p>
      </div>
    );
  }

  const handleEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        {workouts.map((workout) => (
          <AccordionItem value={`item-${workout.id}`} key={workout.id}>
            <div className="flex items-center gap-2 pr-4">
              <AccordionTrigger className="hover:no-underline flex-1">
                <div className="flex justify-between items-center w-full">
                  <span className="font-semibold text-lg">{workout.name}</span>
                  <Badge variant="outline">{workout.muscle_group}</Badge>
                </div>
              </AccordionTrigger>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleEditWorkout(workout)}
                className="shrink-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercício</TableHead>
                    <TableHead className="text-center">Séries</TableHead>
                    <TableHead className="text-center">Repetições</TableHead>
                    <TableHead className="text-right">Descanso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workout.exercises.map((exercise, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{exercise.name}</TableCell>
                      <TableCell className="text-center">{exercise.sets}</TableCell>
                      <TableCell className="text-center">{exercise.reps}</TableCell>
                      <TableCell className="text-right">{exercise.rest}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <Button asChild>
                  <NavLink to={`/workout-session/${workout.id}`}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Iniciar Treino
                  </NavLink>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      <EditWorkoutDialog 
        workout={editingWorkout} 
        isOpen={isEditDialogOpen} 
        setIsOpen={setIsEditDialogOpen}
        onWorkoutUpdated={onWorkoutUpdated}
      />
    </>
  );
};

export default WorkoutList;