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

const WorkoutList = ({ workouts }: { workouts: Workout[] }) => {
  if (!workouts || workouts.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">Nenhum treino encontrado.</p>
        <p className="text-sm text-muted-foreground">Adicione um novo treino para começar.</p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {workouts.map((workout) => (
        <AccordionItem value={`item-${workout.id}`} key={workout.id}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex justify-between items-center w-full pr-4">
              <span className="font-semibold text-lg">{workout.name}</span>
              <Badge variant="outline">{workout.muscle_group}</Badge>
            </div>
          </AccordionTrigger>
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
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default WorkoutList;