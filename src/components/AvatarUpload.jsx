// src/components/AvatarUpload.jsx
import React, { useRef } from 'react';
import { User, Camera, Image as ImageIcon, Trash } from 'lucide-react';
import { processImage } from '../utils/helpers';

const AvatarUpload = ({ currentImage, onImageChange }) => {
  const fileInputRef = useRef(null);
  
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const processed = await processImage(file);
      onImageChange(processed);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-28 h-28 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {currentImage ? (
          <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <User size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="text-white" size={24} />
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />

      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors"
        >
          <ImageIcon size={12} />
          {currentImage ? 'Change' : 'Upload Photo'}
        </button>
        {currentImage && (
          <button
            onClick={() => onImageChange(null)}
            className="text-xs font-bold text-red-600 flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
          >
            <Trash size={12} />
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;