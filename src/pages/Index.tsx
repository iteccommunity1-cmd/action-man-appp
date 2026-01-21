import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList";

const Index = () => {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col lg:flex-row items-start justify-center w-full max-w-7xl gap-8 mt-8">
        <div className="w-full lg:w-1/2 flex-shrink-0">
          <ProjectForm />
        </div>
        <div className="w-full lg:w-1/2">
          <ProjectList />
        </div>
      </div>
    </div>
  );
};

export default Index;