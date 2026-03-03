export interface SlideData {
  slideNumber: number;
  title: string;
  content: string[];
  speakerNotes?: string;
  type: "title" | "content" | "workflow" | "summary";
}

export interface PresentationData {
  title: string;
  slides: SlideData[];
  totalDuration?: string;
  overallNotes?: string;
}

export interface ProcessAudioResponse {
  transcript: string;
  presentation: PresentationData;
}
