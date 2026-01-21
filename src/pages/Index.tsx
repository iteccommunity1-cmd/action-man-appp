import { ProjectList } from "@/components/ProjectList";

const Index = () => {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col lg:flex-row items-start justify-center w-full max-w-7xl gap-8">
        <div className="w-full">
          <ProjectList />
        </div>
      </div>
    </div>
  );
};

export default Index;