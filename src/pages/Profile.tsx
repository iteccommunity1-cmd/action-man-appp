import React from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { MadeWithDyad } from '@/components/made-with-dyad';

const Profile: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full">
      <ProfileForm />
      <MadeWithDyad />
    </div>
  );
};

export default Profile;