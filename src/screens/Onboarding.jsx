// src/screens/Onboarding.jsx
import React, { useState } from 'react';
import AvatarUpload from '../components/AvatarUpload';

const Onboarding = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [avatar, setAvatar] = useState(null);

  const handleComplete = (skip = false) => {
    onComplete({
      name: skip ? 'User' : (name || 'User'),
      regNumber: skip ? '' : regNumber,
      avatar: skip ? null : avatar,
      isSetup: true
    });
  };

  return (
    <div className="flex flex-col h-full bg-white p-8 justify-center animate-in fade-in duration-700">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome!</h1>
        <p className="text-slate-500">Let's set up your profile to personalize your experience.</p>
      </div>
      <div className="space-y-6">
        <AvatarUpload currentImage={avatar} onImageChange={setAvatar} />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. User Name"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Bike Registration Number</label>
            <input
              type="text"
              value={regNumber}
              onChange={e => setRegNumber(e.target.value.toUpperCase())}
              placeholder="e.g. TSXXFWXXXX"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
        <div className="pt-4 space-y-3">
          <button
            onClick={() => handleComplete(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all"
          >
            Get Started
          </button>
          <button
            onClick={() => handleComplete(true)}
            className="w-full py-4 text-slate-400 font-medium text-sm hover:text-slate-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;