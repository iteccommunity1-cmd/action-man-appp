import { MadeWithDyad } from "@/components/made-with-dyad";
import { ProjectForm } from "@/components/ProjectForm";
import { Link } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell"; // Import NotificationBell

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="absolute top-4 right-4">
        <NotificationBell />
      </div>
      <div className="flex-grow flex items-center justify-center w-full">
        <ProjectForm />
      </div>
      <Link to="/chat" className="mt-8 text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors duration-200">
        Go to Chat
      </Link>
      <MadeWithDyad />
    </div>
  );
};

export default Index;