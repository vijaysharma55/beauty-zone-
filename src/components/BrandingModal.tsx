import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Save, Image as ImageIcon } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

interface BrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandingModal: React.FC<BrandingModalProps> = ({ isOpen, onClose }) => {
  const { brand, updateBrand } = useBrand();
  const [imageUrl, setImageUrl] = useState(brand.founderImage || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImageUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateBrand({ founderImage: imageUrl });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-modal-enter">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-black">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4">Edit Founder/Branding</h2>
        
        {/* Preview */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Preview</label>
          <div className="w-full h-48 bg-neutral-100 rounded-lg overflow-hidden border">
            {imageUrl ? (
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">
                <ImageIcon className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

        {/* Upload/URL */}
        <div className="space-y-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 bg-neutral-100 rounded-lg hover:bg-neutral-200"
          >
            <Upload className="w-4 h-4" /> Upload Image
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or enter image URL" 
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full mt-6 bg-[#0F172A] text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Branding
        </button>
      </div>
    </div>
  );
};
