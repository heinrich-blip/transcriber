import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProcessedBrief } from "@/components/ResultsDisplay";
import type { Database } from "@/integrations/supabase/types";

type TranscriptionInsert = Database["public"]["Tables"]["transcriptions"]["Insert"];

export interface HistoryEntry {
  id: string;
  created_at: string;
  file_name: string | null;
  transcription: string;
  translation: string | null;
  detected_language: string;
  summary: string | null;
  intent: string | null;
  key_points: string[] | null;
  sentiment: string | null;
  processed_brief: ProcessedBrief | null;
}

export function useTranscriptionHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTranscription = useCallback(
    async (params: {
      transcription: string;
      translation: string | null;
      detectedLanguage: string;
      fileName?: string | null;
      summary?: string | null;
      intent?: string | null;
      keyPoints?: string[] | null;
      sentiment?: string | null;
      processedBrief?: ProcessedBrief | null;
    }) => {
      const row: TranscriptionInsert = {
        transcription: params.transcription,
        translation: params.translation,
        detected_language: params.detectedLanguage,
        file_name: params.fileName ?? null,
        summary: params.summary ?? null,
        intent: params.intent ?? null,
        key_points: params.keyPoints ? JSON.parse(JSON.stringify(params.keyPoints)) : null,
        sentiment: params.sentiment ?? null,
        processed_brief: params.processedBrief ? JSON.parse(JSON.stringify(params.processedBrief)) : null,
      };
      const { data, error } = await supabase.from("transcriptions").insert(row);

      if (error) {
        console.error("Failed to save transcription:", error);
      }

      return { data, error };
    },
    []
  );

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      // Map raw DB rows into typed HistoryEntry objects
      const mapped: HistoryEntry[] = (data ?? []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        file_name: row.file_name,
        transcription: row.transcription,
        translation: row.translation,
        detected_language: row.detected_language,
        summary: row.summary ?? null,
        intent: row.intent ?? null,
        key_points: Array.isArray(row.key_points) ? (row.key_points as string[]) : null,
        sentiment: row.sentiment ?? null,
        processed_brief: row.processed_brief ? (row.processed_brief as unknown as ProcessedBrief) : null,
      }));
      setHistory(mapped);
    }

    setIsLoading(false);
    return { data, error };
  }, []);

  const deleteTranscription = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("transcriptions")
      .delete()
      .eq("id", id);

    if (!error) {
      setHistory((prev) => prev.filter((entry) => entry.id !== id));
    }

    return { error };
  }, []);

  return { history, isLoading, error, saveTranscription, fetchHistory, deleteTranscription };
}
