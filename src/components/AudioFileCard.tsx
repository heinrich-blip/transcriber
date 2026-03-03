import { motion } from "framer-motion";
import { FileAudio, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioFileCardProps {
  file: File;
  onRemove: () => void;
  isProcessing: boolean;
}

export function AudioFileCard({ file, onRemove, isProcessing }: AudioFileCardProps) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-surface rounded-xl p-4 flex items-center gap-4"
    >
      <div className="p-3 rounded-lg bg-primary/10">
        <FileAudio className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{file.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{sizeMB} MB</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {file.type || "audio"}
          </span>
        </div>
      </div>
      {!isProcessing && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
}
