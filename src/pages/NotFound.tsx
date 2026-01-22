import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4"> {/* Updated background */}
      <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-border max-w-sm w-full text-card-foreground"> {/* Updated card styles */}
        <h1 className="text-5xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl mb-6 text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary hover:underline font-medium text-lg transition-colors duration-200">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;