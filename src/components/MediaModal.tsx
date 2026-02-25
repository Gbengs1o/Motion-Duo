"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#232326] border-white/5 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Import Media</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
          <Button variant="ghost" onClick={onClose} className="hover:bg-white/5">Cancel</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-white">Import Asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};