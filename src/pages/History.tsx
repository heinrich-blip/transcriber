import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AudioLines, ArrowLeft, Trash2, Languages, FileText, Clock, ChevronDown, ChevronUp, Brain, ListChecks, CheckSquare, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTranscriptionHistory } from "@/hooks/use-transcription-history";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const History = () => {
  const { history, isLoading, error, fetchHistory, deleteTranscription } =
    useTranscriptionHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    const { error } = await deleteTranscription(id);
    if (error) {
      toast.error("Failed to delete entry.");
    } else {
      toast.success("Entry deleted.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 bg-background/80">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <AudioLines className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg leading-tight">VoiceDigest</h1>
            <p className="text-xs text-muted-foreground">Transcription History</p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2 font-display">
              <ArrowLeft className="w-4 h-4" />
              New transcription
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-4">
        <h2 className="font-display text-xl font-bold">Previous Transcriptions</h2>

        {isLoading && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Loading history…
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-16 text-destructive text-sm">
            Failed to load history: {error}
          </div>
        )}

        {!isLoading && !error && history.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-3"
          >
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground text-sm">No transcriptions yet.</p>
            <Link to="/">
              <Button size="sm" className="font-display mt-2">
                Transcribe your first audio
              </Button>
            </Link>
          </motion.div>
        )}

        {!isLoading &&
          history.map((entry, i) => {
            const hasAnalysis = !!(entry.summary || entry.intent || entry.key_points || entry.sentiment || entry.processed_brief);
            const isExpanded = expandedId === entry.id;

            return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-surface rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm space-y-3"
            >
              {/* Meta row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-display font-semibold text-sm truncate">
                    {entry.file_name ?? "Recorded audio"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(entry.created_at)}</span>
                    {entry.detected_language && (
                      <>
                        <span className="opacity-40">·</span>
                        <Languages className="w-3 h-3" />
                        <span>{entry.detected_language}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(entry.id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Separator />

              {/* Transcription */}
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-display">
                  Transcription
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {entry.transcription}
                </p>
              </div>

              {/* Translation */}
              {entry.translation && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-display">
                    Translation
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {entry.translation}
                  </p>
                </div>
              )}

              {/* Expandable Analysis */}
              {hasAnalysis && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground font-display"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3 mr-1.5" /> : <ChevronDown className="w-3 h-3 mr-1.5" />}
                    {isExpanded ? "Hide analysis" : "Show full analysis"}
                  </Button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        {entry.summary && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Brain className="w-3 h-3 text-primary" />
                              <p className="text-xs uppercase tracking-widest text-muted-foreground font-display">Summary</p>
                            </div>
                            <p className="text-sm leading-relaxed">{entry.summary}</p>
                          </div>
                        )}

                        {entry.intent && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-display">Intent</p>
                            <p className="text-sm leading-relaxed">{entry.intent}</p>
                          </div>
                        )}

                        {entry.key_points && entry.key_points.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <ListChecks className="w-3 h-3 text-primary" />
                              <p className="text-xs uppercase tracking-widest text-muted-foreground font-display">Key Points</p>
                            </div>
                            <ol className="space-y-1 pl-1">
                              {entry.key_points.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-xs text-primary font-bold mt-0.5">{idx + 1}.</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {entry.sentiment && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-display">Sentiment</p>
                            <p className="text-sm leading-relaxed">{entry.sentiment}</p>
                          </div>
                        )}

                        {entry.processed_brief && (
                          <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-display font-bold">Processed Brief</p>
                            <p className="text-sm font-semibold">{entry.processed_brief.subject}</p>
                            <p className="text-sm leading-relaxed">{entry.processed_brief.executiveSummary}</p>

                            {entry.processed_brief.mainPoints.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-display">Main Points</p>
                                <ol className="space-y-1 pl-1">
                                  {entry.processed_brief.mainPoints.map((p, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                      <span className="text-xs text-primary font-bold mt-0.5">{idx + 1}.</span>
                                      <span>{p}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {entry.processed_brief.actionItems.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <CheckSquare className="w-3 h-3 text-primary" />
                                  <p className="text-xs text-muted-foreground font-display">Action Items</p>
                                </div>
                                <ul className="space-y-1 pl-1">
                                  {entry.processed_brief.actionItems.map((a, idx) => (
                                    <li key={idx} className="text-sm flex items-start gap-2">
                                      <span className="text-xs text-primary mt-0.5">•</span>
                                      <span>{a}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {entry.processed_brief.decisions.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Lightbulb className="w-3 h-3 text-primary" />
                                  <p className="text-xs text-muted-foreground font-display">Decisions</p>
                                </div>
                                <ul className="space-y-1 pl-1">
                                  {entry.processed_brief.decisions.map((d, idx) => (
                                    <li key={idx} className="text-sm flex items-start gap-2">
                                      <span className="text-xs text-primary mt-0.5">•</span>
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
            );
          })}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-4 text-center">
        <p className="text-xs text-muted-foreground/50">
          VoiceDigest • AI-powered audio analysis
        </p>
      </footer>
    </div>
  );
};

export default History;
