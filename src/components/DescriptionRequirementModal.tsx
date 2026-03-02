import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Edit3, MessageSquareText, Activity, ArrowRight } from "lucide-react";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface DescriptionRequirementModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export const DescriptionRequirementModal: React.FC<DescriptionRequirementModalProps> = ({
    isOpen,
    onOpenChange,
    onConfirm,
}) => {
    const [step, setStep] = useState(0);

    // Simple animation loop for the icons
    useEffect(() => {
        if (!isOpen) {
            setStep(0);
            return;
        }

        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % 4);
        }, 1500);

        return () => clearInterval(interval);
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-[#121214] border-white/10 p-0 overflow-hidden shadow-2xl backdrop-blur-xl gap-0">

                <VisuallyHidden>
                    <DialogTitle>Motion Description Required</DialogTitle>
                </VisuallyHidden>
                {/* Animated Header Section */}
                <div className="relative h-48 bg-gradient-to-b from-primary/20 to-transparent flex items-center justify-center border-b border-white/5 overflow-hidden">
                    {/* Decorative background blur */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/30 rounded-full blur-3xl" />

                    {/* Animated Icons Sequence */}
                    <div className="relative z-10 flex items-center gap-6 text-white/40">
                        {/* Step 1: Sketch */}
                        <div className={`p-4 rounded-full transition-all duration-700 ${step === 0 ? 'bg-white/10 text-white scale-110 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-white/5'}`}>
                            <Edit3 className="w-8 h-8" />
                        </div>

                        {/* Plus */}
                        <div className="text-white/20 font-light text-2xl">+</div>

                        {/* Step 2: Describe */}
                        <div className={`p-4 rounded-full transition-all duration-700 ${step === 1 ? 'bg-primary/20 text-primary scale-110 shadow-[0_0_30px_rgba(128,108,224,0.3)]' : 'bg-white/5'}`}>
                            <MessageSquareText className="w-8 h-8" />
                        </div>

                        {/* Equals */}
                        <div className="text-white/20 font-light text-2xl">=</div>

                        {/* Step 3: Motion! */}
                        <div className={`relative p-4 rounded-full transition-all duration-700 ${step === 2 || step === 3 ? 'bg-white text-black scale-110 shadow-[0_0_40px_rgba(255,255,255,0.4)]' : 'bg-white/5'}`}>
                            <Activity className="w-8 h-8" />
                            {(step === 2 || step === 3) && (
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-primary animate-pulse" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-6">
                    <div className="space-y-3 text-center">
                        <h2 className="text-xl font-semibold tracking-tight text-white">
                            Bring Your Sketch to Life
                        </h2>
                        <p className="text-sm text-white/50 leading-relaxed max-w-[280px] mx-auto">
                            Motion Duo needs to know <span className="text-white/80 font-medium">how</span> you want things to move. Add a quick description to generate your animation.
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onConfirm}
                        className="w-full relative group overflow-hidden rounded-lg p-[1px]"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-primary/80 via-white/50 to-primary/80 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative bg-[#232326] px-6 py-3 rounded-[7px] flex items-center justify-center gap-2 text-sm font-medium text-white transition-all duration-300 group-hover:bg-[#232326]/80 backdrop-blur-sm">
                            Write Description
                            <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
