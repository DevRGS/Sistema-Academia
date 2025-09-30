import StudentDataForm from '@/components/student/StudentDataForm';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>
      <StudentDataForm />
    </div>
  );
};

export default SettingsPage;