import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AudioLines, Sparkles, History, RefreshCw, AlertCircle } from "lucide-react";
import { AudioDropZone } from "@/components/AudioDropZone";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioFileCard } from "@/components/AudioFileCard";
import { ProcessingIndicator } from "@/components/ProcessingIndicator";
import { ResultsDisplay, type TranscriptionResult } from "@/components/ResultsDisplay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranscriptionHistory } from "@/hooks/use-transcription-history";

// Analysis model map — these are the chat/LLM models used for
// transcript cleaning, translation, brief generation, and analysis.
// Transcription (speech-to-text) always uses OpenAI Whisper / gpt-4o-audio
// regardless of what model is selected here.
const providerModelMap = {
  openai: [
    "gpt-4o",              // Best quality — recommended
    "gpt-4o-mini",         // Faster & cheaper, great for most notes
    "gpt-4.5-preview",     // Latest generation, highest reasoning
    "o3-mini",             // Fast reasoning model
    "o1",                  // Deep reasoning, best for complex analysis
    "o1-mini",             // Reasoning, faster & cheaper
  ],
  openrouter: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-3.7-sonnet",       // Excellent for nuanced analysis
    "anthropic/claude-3.5-haiku",        // Fast & affordable Claude
    "anthropic/claude-3-opus",           // Highest Claude quality
    "google/gemini-2.0-flash-001",       // Fast & capable Google model
    "google/gemini-2.0-flash-thinking-exp:free", // Thinking mode, free
    "meta-llama/llama-3.3-70b-instruct", // Strong open-source option
    "deepseek/deepseek-chat",            // High quality, very affordable
    "mistralai/mistral-large-2411",      // Mistral flagship
  ],
} as const;

type Provider = keyof typeof providerModelMap;
type Model = (typeof providerModelMap)[Provider][number];

// Define a type for the API response
interface ApiResponse {
  transcription: string;
  translation?: string | null;
  detectedLanguage?: string;
  summary?: string;
  intent?: string;
  keyPoints?: string[];
  sentiment?: string;
  brief?: {
    subject: string;
    executiveSummary: string;
    mainPoints: string[];
    actionItems: string[];
    decisions: string[];
  };
}

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<Model>(providerModelMap[provider][0]);
  const [translate, setTranslate] = useState(true);
  const { saveTranscription } = useTranscriptionHistory();

  useEffect(() => {
    setModel(providerModelMap[provider][0]);
  }, [provider]);

  // Download PDF function
  const downloadPDF = useCallback(() => {
    if (!result) return;

    const esc = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    try {
      let content = "";

      content += `<h2>Transcription</h2><p>${esc(result.transcription || "")}</p>`;

      if (result.translation) {
        content += `<h2>Translation</h2><p>${esc(result.translation)}</p>`;
      }

      if (result.detectedLanguage) {
        content += `<h2>Detected Language</h2><p>${esc(result.detectedLanguage)}</p>`;
      }

      if (result.summary) {
        content += `<h2>Summary</h2><p>${esc(result.summary)}</p>`;
      }

      if (result.intent) {
        content += `<h2>Speaker Intent</h2><p>${esc(result.intent)}</p>`;
      }

      if (result.keyPoints && result.keyPoints.length > 0) {
        content += "<h2>Key Points</h2><ol>";
        result.keyPoints.forEach((point) => {
          content += `<li>${esc(point)}</li>`;
        });
        content += "</ol>";
      }

      if (result.sentiment) {
        content += `<h2>Tone &amp; Sentiment</h2><p>${esc(result.sentiment)}</p>`;
      }

      if (result.processedBrief) {
        const brief = result.processedBrief;
        content += `<h2>Processed Brief</h2>`;
        content += `<h3>Subject</h3><p><strong>${esc(brief.subject)}</strong></p>`;
        content += `<h3>Executive Summary</h3><p>${esc(brief.executiveSummary)}</p>`;
        if (brief.mainPoints.length) {
          content += `<h3>Main Points</h3><ol>`;
          brief.mainPoints.forEach((p) => { content += `<li>${esc(p)}</li>`; });
          content += `</ol>`;
        }
        if (brief.actionItems.length) {
          content += `<h3>Action Items</h3><ul>`;
          brief.actionItems.forEach((a) => { content += `<li>${esc(a)}</li>`; });
          content += `</ul>`;
        }
        if (brief.decisions.length) {
          content += `<h3>Decisions &amp; Conclusions</h3><ul>`;
          brief.decisions.forEach((d) => { content += `<li>${esc(d)}</li>`; });
          content += `</ul>`;
        }
      }

      const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>VoiceDigest Analysis</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 22px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; color: #6366f1; }
  h2 { font-size: 16px; margin-top: 24px; color: #374151; }
  h3 { font-size: 14px; margin-top: 16px; color: #4b5563; }
  p { margin: 6px 0; font-size: 14px; }
  ol, ul { padding-left: 24px; font-size: 14px; }
  li { margin: 4px 0; }
  .meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>VoiceDigest Analysis Report</h1>
<p class="meta">${new Date().toLocaleDateString()} • ${file?.name ? esc(file.name) : "Recorded audio"}</p>
${content}
</body></html>`;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      } else {
        toast.error("Please allow pop-ups to download PDF");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF");
    }
  }, [result, file]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 20MB.");
      return;
    }
    setFile(selectedFile);
    setResult(null);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessingStep(0);
    setResult(null);
    setLastError(null);

    try {
      setProcessingStep(0);
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("provider", provider);
      formData.append("model", model);
      formData.append("translate", translate ? "true" : "false");

      setProcessingStep(1);

      const { data, error } = await supabase.functions.invoke('analyze-audio', {
        body: formData,
      });

      if (error) {
        console.error('Supabase function error:', error);
        // Try to extract the real error message from the edge function response body
        let detail = error.message;
        try {
          // FunctionsHttpError exposes the raw Response on .context
          const ctx = (error as unknown as { context?: Response }).context;
          if (ctx) {
            const body = await ctx.json().catch(() => ctx.text());
            const msg = typeof body === 'string' ? body : (body as { error?: string })?.error;
            if (msg) detail = msg;
          }
        } catch { /* ignore, fall back to generic message */ }
        throw new Error(detail || 'Failed to analyze audio');
      }

      setProcessingStep(2);

      await new Promise((r) => setTimeout(r, 600));

      // Type the API response
      const apiData = data as ApiResponse;

      // Create result object with only the fields that exist in the API response
      const newResult: TranscriptionResult = {
        transcription: apiData.transcription || '',
        translation: apiData.translation || null,
        detectedLanguage: apiData.detectedLanguage || '',
      };

      // Create a properly typed extended result
      const extendedResult = newResult as TranscriptionResult & {
        summary?: string;
        intent?: string;
        keyPoints?: string[];
        sentiment?: string;
        processedBrief?: {
          subject: string;
          executiveSummary: string;
          mainPoints: string[];
          actionItems: string[];
          decisions: string[];
        };
      };

      // Add optional fields if they exist in the response
      if (apiData.summary) {
        extendedResult.summary = apiData.summary;
      }
      if (apiData.intent) {
        extendedResult.intent = apiData.intent;
      }
      if (apiData.keyPoints) {
        extendedResult.keyPoints = apiData.keyPoints;
      }
      if (apiData.sentiment) {
        extendedResult.sentiment = apiData.sentiment;
      }
      if (apiData.brief) {
        extendedResult.processedBrief = apiData.brief;
      }

      setResult(extendedResult);
      toast.success("Audio analyzed successfully!");

      // Persist to history
      saveTranscription({
        transcription: extendedResult.transcription,
        translation: extendedResult.translation,
        detectedLanguage: extendedResult.detectedLanguage,
        fileName: file?.name ?? null,
        summary: extendedResult.summary ?? null,
        intent: extendedResult.intent ?? null,
        keyPoints: extendedResult.keyPoints ?? null,
        sentiment: extendedResult.sentiment ?? null,
        processedBrief: extendedResult.processedBrief ?? null,
      });
    } catch (err) {
      console.error("Analysis failed:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to analyze audio";
      setLastError(errorMsg);
      
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          toast.error("Authentication failed. Please check your Supabase configuration.");
        } else if (err.message.includes('404')) {
          toast.error("Function not found. Please deploy the analyze-audio function.");
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error("Failed to analyze audio");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [file, provider, model, translate, saveTranscription]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setResult(null);
  }, []);

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
            <p className="text-xs text-muted-foreground">WhatsApp Audio Intelligence</p>
          </div>
          <Link to="/history">
            <Button variant="outline" size="sm" className="gap-2 font-display">
              <History className="w-4 h-4" />
              History
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 pb-2"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold">
            Turn voice messages into <span className="text-gradient">clear insights</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Upload your WhatsApp audio messages and get AI-powered transcriptions,
            summaries, and context analysis in seconds.
          </p>
        </motion.div>

        {/* Model Selection */}
        <div className="glass-surface rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm">
          <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-[0.2em]">
            AI Analysis Model
          </h3>
          <p className="text-xs text-muted-foreground/55 mt-1">
            Controls cleaning, translation &amp; brief generation. Speech-to-text always uses OpenAI Whisper.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Provider</Label>
              <Select value={provider} onValueChange={(value) => setProvider(value as Provider)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Model</Label>
              <Select 
                value={model} 
                onValueChange={(value) => {
                  // Fix: Type assertion to ensure the value is a valid Model
                  setModel(value as Model);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose model" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {providerModelMap[provider].map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-between space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Auto Translate
              </Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">Enabled</p>
                <Switch checked={translate} onCheckedChange={(value) => setTranslate(value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        {!result && (
          <div className="space-y-5">
            <AudioDropZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <VoiceRecorder onRecordingComplete={handleFileSelect} isProcessing={isProcessing} />
          </div>
        )}

        {/* File Card */}
        {file && !result && (
          <div className="space-y-4">
            <AudioFileCard file={file} onRemove={handleRemoveFile} isProcessing={isProcessing} />
            {!isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button onClick={handleProcess} className="w-full font-display font-semibold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Audio
                </Button>
              </motion.div>
            )}
          </div>
        )}

        {/* Processing */}
        {isProcessing && <ProcessingIndicator step={processingStep} />}

        {/* Error + Retry */}
        {lastError && !isProcessing && !result && file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-surface rounded-xl p-5 space-y-4 border border-destructive/30"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm text-destructive">Analysis Failed</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">{lastError}</p>
              </div>
            </div>
            <Button onClick={handleProcess} variant="outline" className="w-full font-display">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Analysis
            </Button>
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <>
            <ResultsDisplay result={result} downloadPDF={downloadPDF} />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-2"
            >
              <Button
                variant="outline"
                onClick={() => { setFile(null); setResult(null); }}
                className="w-full font-display"
              >
                Analyze Another Message
              </Button>
            </motion.div>
          </>
        )}
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

export default Index;