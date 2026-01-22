"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const WelcomeCard: React.FC = () => {
  const { currentUser } = useUser();
  const [greeting, setGreeting] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [bgColor, setBgColor] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let currentGreeting = '';
    let currentImage = '';
    let currentBgColor = '';

    if (hour < 12) {
      currentGreeting = 'Good Morning';
      currentImage = 'https://images.unsplash.com/photo-1501854140801-50d00698a7ee?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'; // Morning landscape
      currentBgColor = 'from-blue-200 to-blue-400';
    } else if (hour < 18) {
      currentGreeting = 'Good Afternoon';
      currentImage = 'https://images.unsplash.com/photo-1506744038136-462a42ee6ee4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'; // Afternoon city/nature
      currentBgColor = 'from-yellow-200 to-orange-400';
    } else {
      currentGreeting = 'Good Evening';
      currentImage = 'https://images.unsplash.com/photo-1532828399077-377272727272?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'; // Evening/night sky
      currentBgColor = 'from-indigo-400 to-purple-600';
    }

    setGreeting(currentGreeting);
    setBackgroundImage(currentImage);
    setBgColor(currentBgColor);
  }, []);

  return (
    <Card
      className={cn(
        "w-full rounded-xl shadow-lg border border-gray-200 overflow-hidden relative h-48 sm:h-56 flex items-center justify-center text-white",
        "bg-gradient-to-br", bgColor
      )}
      style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black opacity-40 rounded-xl"></div> {/* Overlay for text readability */}
      <CardContent className="relative z-10 text-center p-4">
        <h2 className="text-4xl sm:text-5xl font-extrabold mb-2 drop-shadow-lg">
          {greeting}, {currentUser?.name || 'User'}!
        </h2>
        <p className="text-lg sm:text-xl font-medium drop-shadow-md">
          Welcome to your dashboard.
        </p>
      </CardContent>
    </Card>
  );
};