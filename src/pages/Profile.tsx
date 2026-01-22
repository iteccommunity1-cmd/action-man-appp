import React from 'react';
import { ProfileForm } from '@/components/ProfileForm';

const Profile: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full p-4 sm:p-0"> {/* Added responsive padding */}
      <ProfileForm />
    </div>
  );
};

export default Profile;