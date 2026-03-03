import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Mic, FileAudio } from "lucide-react";

interface AudioDropZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function AudioDropZone({ onFileSelect, isProcessing }: AudioDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.[0]) onFileSelect(files[0]);
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) onFileSelect(files[0]);
  }, [onFileSelect]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <label
        htmlFor="audio-upload"
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-4
          w-full min-h-[220px] rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-300
          ${isDragging
            ? "border-primary bg-primary/5 glow-border"
            : "border-border/60 hover:border-primary/40 hover:bg-card/50"
          }
          ${isProcessing ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <div className={`
          p-4 rounded-full transition-colors duration-300
          ${isDragging ? "bg-primary/20" : "bg-secondary"}
        `}>
          {isDragging ? (
            <FileAudio className="w-8 h-8 text-primary" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        <div className="text-center space-y-1.5">
          <p className="font-display text-lg font-medium text-foreground">
            {isDragging ? "Drop your audio here" : "Upload WhatsApp Audio"}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag & drop or click to browse • MP3, OGG, M4A, WAV
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <Mic className="w-3.5 h-3.5" />
          <span>Voice messages up to 20MB</span>
        </div>

        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isProcessing}
        />
      </label>
    </motion.div>
  );
}
