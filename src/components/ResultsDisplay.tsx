import { motion } from "framer-motion";
import { Copy, Check, Languages, FileText, Volume2, Download, MessageSquareText, Brain, Users, ListChecks, AlertCircle, ClipboardList, CheckSquare, Lightbulb, NotebookPen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export interface ProcessedBrief {
  subject: string;
  executiveSummary: string;
  mainPoints: string[];
  actionItems: string[];
  decisions: string[];
}

export interface TranscriptionResult {
  transcription: string;
  translation: string | null;
  detectedLanguage: string;
  summary?: string;
  intent?: string;
  keyPoints?: string[];
  sentiment?: string;
  processedBrief?: ProcessedBrief;
}

interface ResultsDisplayProps {
  result: TranscriptionResult;
  downloadPDF?: () => void; // Add optional downloadPDF prop
}

export function ResultsDisplay({ result, downloadPDF }: ResultsDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const speakText = (text: string) => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = result.detectedLanguage === "Afrikaans" ? "af-ZA" : "en-US";
    utterance.rate = 0.9;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error("Text-to-speech failed");
    };
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Create full report text for copying
  const briefText = result.processedBrief
    ? [
        `\nProcessed Brief:`,
        `Subject: ${result.processedBrief.subject}`,
        `Executive Summary: ${result.processedBrief.executiveSummary}`,
        `Main Points:\n${result.processedBrief.mainPoints.map((p, i) => `${i+1}. ${p}`).join('\n')}`,
        ...(result.processedBrief.actionItems.length ? [`Action Items:\n${result.processedBrief.actionItems.map((a, i) => `${i+1}. ${a}`).join('\n')}`] : []),
        ...(result.processedBrief.decisions.length ? [`Decisions:\n${result.processedBrief.decisions.map((d, i) => `${i+1}. ${d}`).join('\n')}`] : []),
      ].join('\n')
    : '';

  const fullReport = `
Transcription: ${result.transcription}
${result.translation ? `Translation: ${result.translation}` : ''}
Detected Language: ${result.detectedLanguage}
${result.summary ? `Summary: ${result.summary}` : ''}
${result.intent ? `Intent: ${result.intent}` : ''}
${result.keyPoints ? `Key Points:\n${result.keyPoints.map((point, i) => `${i+1}. ${point}`).join('\n')}` : ''}
${result.sentiment ? `Sentiment: ${result.sentiment}` : ''}${briefText}
  `.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Report Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-display font-bold text-base tracking-tight">Analysis Report</h2>
        </div>
        <div className="flex items-center gap-2">
          {downloadPDF && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPDF}
              className="text-xs font-display h-8 px-3"
            >
              <Download className="w-3 h-3 mr-1.5" /> Download PDF
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(fullReport, "all")}
            className="text-xs font-display h-8 px-3"
          >
            {copiedField === "all" ? (
              <><Check className="w-3 h-3 mr-1.5" /> Copied</>
            ) : (
              <><Copy className="w-3 h-3 mr-1.5" /> Copy Report</>
            )}
          </Button>
        </div>
      </motion.div>

      <Separator className="opacity-50" />

      {/* Transcription */}
      <Section
        icon={<MessageSquareText className="w-4 h-4 text-primary" />}
        title="Full Transcription"
        delay={0}
        onCopy={() => copyToClipboard(result.transcription, "transcription")}
        copied={copiedField === "transcription"}
        onSpeak={() => speakText(result.transcription)}
        isSpeaking={isSpeaking}
      >
        <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-wrap">
          {result.transcription}
        </p>
      </Section>

      {/* Translation */}
      {result.translation && (
        <Section
          icon={<Languages className="w-4 h-4 text-primary" />}
          title="English Translation"
          badge={result.detectedLanguage ? `from ${result.detectedLanguage}` : undefined}
          delay={0.05}
          onCopy={() => copyToClipboard(result.translation!, "translation")}
          copied={copiedField === "translation"}
          onSpeak={() => speakText(result.translation!)}
          isSpeaking={isSpeaking}
        >
          <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-wrap">
            {result.translation}
          </p>
        </Section>
      )}

      {/* Summary & Intent - Only show if they exist */}
      {(result.summary || result.intent) && (
        <div className="grid gap-4 md:grid-cols-2">
          {result.summary && (
            <Section
              icon={<Brain className="w-4 h-4 text-primary" />}
              title="Summary"
              delay={0.1}
            >
              <p className="text-sm text-secondary-foreground leading-relaxed">{result.summary}</p>
            </Section>
          )}
          {result.intent && (
            <Section
              icon={<Users className="w-4 h-4 text-primary" />}
              title="Speaker Intent"
              delay={0.15}
            >
              <p className="text-sm text-secondary-foreground leading-relaxed">{result.intent}</p>
            </Section>
          )}
        </div>
      )}

      {/* Key Points - Only show if they exist */}
      {result.keyPoints && result.keyPoints.length > 0 && (
        <Section
          icon={<ListChecks className="w-4 h-4 text-primary" />}
          title="Key Points"
          delay={0.2}
        >
          <ol className="space-y-2.5">
            {result.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-secondary-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-display font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Sentiment - Only show if it exists */}
      {result.sentiment && (
        <Section
          icon={<AlertCircle className="w-4 h-4 text-primary" />}
          title="Tone & Sentiment"
          delay={0.25}
        >
          <p className="text-sm text-secondary-foreground leading-relaxed">{result.sentiment}</p>
        </Section>
      )}

      {/* Processed Brief */}
      {result.processedBrief && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-0"
        >
          <div className="flex items-center justify-between mb-4 mt-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-primary/10">
                <NotebookPen className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-display font-bold text-base tracking-tight">Processed Brief</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const brief = result.processedBrief!;
                const lines = [
                  `SUBJECT: ${brief.subject}`,
                  ``,
                  `EXECUTIVE SUMMARY`,
                  brief.executiveSummary,
                  ``,
                  `MAIN POINTS`,
                  ...brief.mainPoints.map((p, i) => `${i + 1}. ${p}`),
                  ...(brief.actionItems.length ? [``, `ACTION ITEMS`, ...brief.actionItems.map((a, i) => `${i + 1}. ${a}`)] : []),
                  ...(brief.decisions.length ? [``, `DECISIONS`, ...brief.decisions.map((d, i) => `${i + 1}. ${d}`)] : []),
                ].join("\n");
                copyToClipboard(lines, "brief");
              }}
              className="text-xs font-display h-8 px-3"
            >
              {copiedField === "brief" ? (
                <><Check className="w-3 h-3 mr-1.5" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3 mr-1.5" /> Copy Brief</>
              )}
            </Button>
          </div>

          {/* Subject */}
          <div className="glass-surface rounded-xl px-5 py-4 border-l-2 border-primary">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-display mb-1">Subject</p>
            <p className="font-display font-semibold text-base leading-snug">{result.processedBrief.subject}</p>
          </div>

          {/* Executive Summary */}
          <Section
            icon={<Brain className="w-4 h-4 text-primary" />}
            title="Executive Summary"
            delay={0.32}
          >
            <p className="text-sm text-secondary-foreground leading-relaxed">{result.processedBrief.executiveSummary}</p>
          </Section>

          {/* Main Points */}
          <Section
            icon={<ClipboardList className="w-4 h-4 text-primary" />}
            title="Main Points"
            delay={0.35}
          >
            <ol className="space-y-2.5">
              {result.processedBrief.mainPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-secondary-foreground">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-display font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ol>
          </Section>

          {/* Action Items */}
          {result.processedBrief.actionItems.length > 0 && (
            <Section
              icon={<CheckSquare className="w-4 h-4 text-primary" />}
              title="Action Items"
              delay={0.38}
            >
              <ul className="space-y-2">
                {result.processedBrief.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-secondary-foreground">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border border-primary/40 bg-primary/5 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-sm bg-primary/50" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Decisions */}
          {result.processedBrief.decisions.length > 0 && (
            <Section
              icon={<Lightbulb className="w-4 h-4 text-primary" />}
              title="Decisions & Conclusions"
              delay={0.41}
            >
              <ul className="space-y-2.5">
                {result.processedBrief.decisions.map((decision, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-secondary-foreground">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span className="leading-relaxed">{decision}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/* Reusable section block */
function Section({
  icon,
  title,
  badge,
  delay = 0,
  onCopy,
  copied,
  onSpeak,
  isSpeaking,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  delay?: number;
  onCopy?: () => void;
  copied?: boolean;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-surface rounded-xl p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display font-semibold text-sm tracking-tight">
            {title}
            {badge && (
              <span className="ml-2 text-[10px] font-normal text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
                {badge}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {onSpeak && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSpeak}
              className={`h-7 text-xs ${isSpeaking ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Volume2 className={`w-3 h-3 mr-1 ${isSpeaking ? "animate-pulse" : ""}`} />
              {isSpeaking ? "Stop" : "Listen"}
            </Button>
          )}
          {onCopy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <><Check className="w-3 h-3 mr-1" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3 mr-1" /> Copy</>
              )}
            </Button>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
}