import { MadeWithDyad } from "@/components/made-with-dyad";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList"; // Import ProjectList
import { Link } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";

const Index = () => {
  const { signOut } = useUser();

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <NotificationBell />
        <Button
          onClick={signOut}
          variant="outline"
          className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Logout
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row items-start justify-center w-full max-w-7xl gap-8 mt-16">
        <div className="w-full lg:w-1/2 flex-shrink-0">
          <ProjectForm />
        </div>
        <div className="w-full lg:w-1/2">
          <ProjectList />
        </div>
      </div>
      <Link to="/chat" className="mt-12 text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors duration-200">
        Go to Chat
      </Link>
      <MadeWithDyad />
    </div>
  );
};

export default Index;