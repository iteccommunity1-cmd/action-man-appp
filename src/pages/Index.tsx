import { MadeWithDyad } from "@/components/made-with-dyad";
import { ProjectForm } from "@/components/ProjectForm";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="flex-grow flex items-center justify-center w-full">
        <ProjectForm />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;