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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4"> {/* Added responsive padding */}
      <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-200 max-w-sm w-full"> {/* Added responsive padding and max-width */}
        <h1 className="text-5xl font-bold mb-4 text-gray-800">404</h1> {/* Larger text for impact */}
        <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
        <a href="/" className="text-blue-600 hover:text-blue-800 underline font-medium text-lg transition-colors duration-200">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;