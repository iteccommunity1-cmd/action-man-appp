import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js'; // Import AuthChangeEvent and Session

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        navigate('/'); // Redirect to home page after successful login
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4"> {/* Updated background */}
      <div className="w-full max-w-md bg-card p-8 rounded-xl shadow-lg border border-border text-card-foreground"> {/* Updated card styles */}
        <h2 className="text-3xl font-bold text-center mb-8 text-foreground">Welcome Back!</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))', // Use our primary color
                  brandAccent: 'hsl(var(--primary-foreground))', // Use primary-foreground for accent
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--primary))',
                  inputBorderFocus: 'hsl(var(--primary))',
                  inputText: 'hsl(var(--foreground))',
                  defaultButtonBackground: 'hsl(var(--secondary))',
                  defaultButtonBackgroundHover: 'hsl(var(--secondary)/80%)',
                  defaultButtonBorder: 'hsl(var(--border))',
                  defaultButtonText: 'hsl(var(--secondary-foreground))',
                  anchorTextColor: 'hsl(var(--primary))', // Corrected property name
                  anchorTextHoverColor: 'hsl(var(--primary)/80%)', // Corrected property name
                },
                radii: {
                  borderRadiusButton: 'var(--radius)', // Use our global radius
                  inputBorderRadius: 'var(--radius)', // Use our global radius
                },
              },
            },
          }}
          theme="dark" // Set theme to dark to match the new background
          redirectTo={window.location.origin + '/'}
        />
      </div>
    </div>
  );
};

export default Login;