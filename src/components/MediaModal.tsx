"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, fileUrl: string) => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (!name) setName(file.name.split('.')[0]);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (name.trim() && fileUrl) {
      onConfirm(name.trim(), fileUrl);
      setName('');
      setFileUrl('');
      setFileName('');
      onClose();
    }
  };

  const handleClose = () => {
    setName('');
    setFileUrl('');
    setFileName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#232326] border-white/5 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Import Media</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file" className="text-xs uppercase tracking-widest text-white/50">Media File (Image/SVG/GIF)</Label>
            <Input 
              id="file" 
              type="file"
              accept="image/*,.svg,.gif"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="bg-black/20 border-white/5 focus-visible:ring-primary text-white/80 file:text-primary file:font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-widest text-white/50">Asset Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Background Element" 
              className="bg-black/20 border-white/5 focus-visible:ring-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="hover:bg-white/5">Cancel</Button>
          <Button onClick={handleConfirm} disabled={!fileUrl} className="bg-primary hover:bg-primary/90 text-white">Import Asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};