import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const steps = [
  "Uploading audio...",
  "Transcribing & cleaning...",
  "Analyzing & generating brief...",
];

interface ProcessingIndicatorProps {
  step: number;
}

export function ProcessingIndicator({ step }: ProcessingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface rounded-xl p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="font-display font-medium text-foreground">Processing</span>
      </div>
      <div className="space-y-2">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`
              w-2 h-2 rounded-full transition-colors duration-300
              ${i < step ? "bg-primary" : i === step ? "bg-primary animate-pulse" : "bg-border"}
            `} />
            <span className={`text-sm transition-colors duration-300 ${
              i <= step ? "text-foreground" : "text-muted-foreground/50"
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}
