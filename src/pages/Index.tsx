import { MadeWithDyad } from "@/components/made-with-dyad";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList";
import { NotificationBell } from "@/components/NotificationBell";

const Index = () => {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="absolute top-4 right-4">
        <NotificationBell />
      </div>
      <div className="flex flex-col lg:flex-row items-start justify-center w-full max-w-7xl gap-8 mt-8">
        <div className="w-full lg:w-1/2 flex-shrink-0">
          <ProjectForm />
        </div>
        <div className="w-full lg:w-1/2">
          <ProjectList />
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;