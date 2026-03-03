import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallBanner() {
  const { canInstall, isInstalled, showIOSPrompt, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed, dismissed, or neither prompt available
  if (isInstalled || dismissed || (!canInstall && !showIOSPrompt)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div className="glass-surface rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-sm">Install VoiceDigest</h3>
              {showIOSPrompt ? (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Tap <Share className="inline w-3 h-3 -mt-0.5" /> then <strong>"Add to Home Screen"</strong> to install.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Add to your home screen for quick access and a native app experience.
                </p>
              )}
              {canInstall && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={install}
                    className="font-display text-xs h-8 px-4"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Install
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissed(true)}
                    className="font-display text-xs h-8 px-3 text-muted-foreground"
                  >
                    Not now
                  </Button>
                </div>
              )}
              {showIOSPrompt && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDismissed(true)}
                  className="font-display text-xs h-8 px-3 text-muted-foreground mt-2"
                >
                  Got it
                </Button>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
