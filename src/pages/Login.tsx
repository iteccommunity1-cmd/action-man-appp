import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect to home since auth is disabled
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="flex justify-center mb-8">
          <img src="/logo.svg" alt="Action Manager Logo" className="h-16 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Disabled</h1>
        <p className="text-muted-foreground mb-6">
          You are being redirected to the dashboard...
        </p>
        <Button onClick={() => navigate('/')} className="bg-primary text-primary-foreground">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Login;