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
        className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-white/20 shadow-xl overflow-hidden group cursor-pointer ring-4 ring-cyan-500/20 hover:ring-cyan-500/40 transition-all"
        onClick={() => fileInputRef.current?.click()}
      >
        {currentImage ? (
          <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
            <User size={36} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
          <Camera className="text-white dark:text-cyan-300" size={24} />
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full hover:bg-cyan-500/20 transition-colors shadow-sm"
        >
          <ImageIcon size={12} />
          {currentImage ? 'Change Photo' : 'Upload Avatar'}
        </button>
        {currentImage && (
          <button
            type="button"
            onClick={() => onImageChange(null)}
            className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-full hover:bg-rose-500/20 transition-colors shadow-sm"
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