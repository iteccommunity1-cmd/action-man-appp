import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProfileForm } from '@/components/ProfileForm';

const Profile: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full p-4 sm:p-0 bg-background">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <Link to="/" className="flex items-center text-primary hover:text-primary/80 font-medium transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
          </Link>
        </div>
        
        <div className="flex justify-center">
          <ProfileForm />
        </div>
      </div>
    </div>
  );
};

export default Profile;