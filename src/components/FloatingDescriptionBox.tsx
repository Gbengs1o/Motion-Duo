import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { GripHorizontal, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppMode } from '@/app/lib/motion-duo-types';

interface FloatingDescriptionBoxProps {
    description: string;
    setDescription: (val: string) => void;
    onClose: () => void;
    onRefine?: (refinement: string) => void;
    appMode: AppMode;
    className?: string;
    defaultPosition?: { x: number; y: number };
}

export const FloatingDescriptionBox: React.FC<FloatingDescriptionBoxProps> = ({
    description,
    setDescription,
    onClose,
    onRefine,
    appMode,
    className,
    defaultPosition = { x: 16, y: 70 } // Default top-left somewhat below header, better clamped for mobile
}) => {
    const [position, setPosition] = useState(defaultPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [localDescription, setLocalDescription] = useState(description);

    useEffect(() => {
        setLocalDescription(description);
    }, [description]);

    const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        // Capture the pointer so that dragging continues even if the mouse leaves the element slightly
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: position.x,
            initialY: position.y
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !dragRef.current || !boxRef.current) return;

        // Prevent default selection behavior while dragging
        e.preventDefault();

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        let newX = dragRef.current.initialX + dx;
        let newY = dragRef.current.initialY + dy;

        // Boundary constraints
        const boxRect = boxRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - boxRect.width;
        const maxY = window.innerHeight - boxRect.height;

        // Account for potential header overlapping UI
        const minY = 60; // Approximate height of the top app bar

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        dragRef.current = null;
    };

    return (
        <div
            ref={boxRef}
            className={cn(
                "absolute z-50 flex flex-col w-[260px] sm:w-[320px] max-w-[calc(100vw-32px)] bg-[#232326] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md transition-opacity duration-200",
                isDragging ? "opacity-90 select-none shadow-primary/20" : "opacity-100",
                className
            )}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            <div
                className="flex items-center justify-between p-2 bg-white/5 border-b border-white/5 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="flex items-center absolute left-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
                        title="Close Description"
                    />
                </div>
                <div className="flex-1 flex justify-center">
                    <GripHorizontal className="w-5 h-5 text-white/40" />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent drag initiation
                        setIsMinimized(!isMinimized);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors absolute right-2"
                    title={isMinimized ? "Expand" : "Minimize"}
                >
                    {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
            </div>

            {!isMinimized && (
                <div className="p-4 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">
                            {appMode === 'motion' ? 'Refine Animation' : 'Motion Description'}
                        </h3>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                            {appMode === 'motion'
                                ? 'Chat with AI to edit, correct or add to your animation results.'
                                : 'Describe the motion, physics, and interactions of your sketch.'}
                        </p>
                    </div>
                    <div className="relative group/input">
                        <Textarea
                            placeholder={appMode === 'motion'
                                ? "e.g. Make the bounce more subtle and change color to neon blue..."
                                : "e.g. The circle bounces against the walls like a bubble, changing colors as it hits..."}
                            className={cn(
                                "w-full bg-black/20 border-white/5 focus-visible:ring-primary pro-scrollbar resize-none text-sm transition-all",
                                appMode === 'motion' ? "h-[100px] pr-10" : "h-[120px]"
                            )}
                            value={localDescription}
                            onChange={(e) => setLocalDescription(e.target.value)}
                            onBlur={() => setDescription(localDescription)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && appMode === 'motion') {
                                    e.preventDefault();
                                    if (localDescription.trim() && onRefine) {
                                        setDescription(localDescription);
                                        onRefine(localDescription);
                                    }
                                }
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                        {appMode === 'motion' && (
                            <button
                                onClick={() => {
                                    if (localDescription.trim() && onRefine) {
                                        setDescription(localDescription);
                                        onRefine(localDescription);
                                    }
                                }}
                                disabled={!localDescription.trim()}
                                className="absolute bottom-3 right-3 p-1.5 rounded-md bg-primary text-white shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-all active:scale-95 z-10"
                                title="Send Refinement"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
