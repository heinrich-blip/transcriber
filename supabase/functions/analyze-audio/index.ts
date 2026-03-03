import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// South African language detection hints for better context
const SA_LANGUAGES = [
  "Afrikaans", "Zulu", "Xhosa", "Sotho", "Tswana", "Venda",
  "Tsonga", "Swati", "Ndebele", "Pedi", "South African English"
];

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Function started`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] Parsing form data...`);
    const formData = await req.formData();
    console.log(`[${requestId}] Form data keys:`, [...formData.keys()]);

    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      console.error(`[${requestId}] No audio file provided`);
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Audio file details:`, {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // Get API keys from environment
    const OPENAI_API_KEY     = Deno.env.get("OPENAI_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    // Get optional parameters from form data
    const translateParam    = formData.get("translate") === "true";
    const requestedProvider = formData.get("provider") as string | null;
    const requestedModel    = formData.get("model") as string | null;
    // Dynamic language hint — client can pass e.g. "af", "zu", "xh", or omit for auto-detect
    const languageHint      = formData.get("language") as string | null;

    console.log(`[${requestId}] Request parameters:`, {
      translate: translateParam,
      provider: requestedProvider,
      model: requestedModel,
      language: languageHint,
    });

    console.log(`[${requestId}] API keys available:`, {
      openai: !!OPENAI_API_KEY,
      openrouter: !!OPENROUTER_API_KEY,
      elevenlabs: !!ELEVENLABS_API_KEY,
    });

    if (!OPENAI_API_KEY && !OPENROUTER_API_KEY && !ELEVENLABS_API_KEY) {
      console.error(`[${requestId}] No API keys configured`);
      return new Response(
        JSON.stringify({
          error: "No transcription service configured. Please set OPENAI_API_KEY, OPENROUTER_API_KEY, or ELEVENLABS_API_KEY.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 1: TRANSCRIPTION
    // ─────────────────────────────────────────────────────────────
    let transcriptText      = "";
    let transcriptionSource = "";

    const transcribeWithElevenLabs = async (): Promise<string> => {
      console.log(`[${requestId}] Attempting ElevenLabs transcription...`);
      const apiFormData = new FormData();
      apiFormData.append("file", audioFile);
      apiFormData.append("model_id", "scribe_v2");

      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY! },
        body: apiFormData,
      });

      console.log(`[${requestId}] ElevenLabs response status:`, res.status);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`ElevenLabs failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      return data.text || "";
    };

    const transcribeWithOpenAI = async (): Promise<string> => {
      // First, try the dedicated transcription endpoint (whisper models).
      // These return 403 on projects where the audio API is not enabled —
      // in that case we fall through to the gpt-4o-audio-preview fallback.
      const whisperModels = ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"];
      const whisperErrors: string[] = [];
      let allBlocked = true;

      for (const modelName of whisperModels) {
        console.log(`[${requestId}] Attempting OpenAI transcription with model: ${modelName}`);
        const whisperFormData = new FormData();
        whisperFormData.append("file", audioFile);
        whisperFormData.append("model", modelName);
        if (languageHint) {
          whisperFormData.append("language", languageHint);
        }

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY!}` },
          body: whisperFormData,
        });

        console.log(`[${requestId}] OpenAI ${modelName} response status:`, res.status);

        if (res.ok) {
          const data = await res.json();
          const text = data.text || "";
          if (text) {
            console.log(`[${requestId}] OpenAI transcription succeeded with ${modelName}`);
            return text;
          }
        } else if (res.status === 403 || res.status === 404) {
          const errText = await res.text();
          whisperErrors.push(`${modelName}:${res.status}`);
          console.warn(`[${requestId}] ${modelName} not available (${res.status}), trying next...`, errText.slice(0, 120));
          continue;
        } else {
          // Non-403/404 error (e.g. 429 rate limit, 500) — surface immediately
          allBlocked = false;
          const err = await res.text();
          throw new Error(`OpenAI transcription failed (${res.status}): ${err}`);
        }
      }

      // All whisper models blocked (403) — project-level restriction on the
      // /audio/transcriptions endpoint. Fall back to gpt-4o-audio-preview which
      // accepts base64 audio via the chat completions API.
      if (allBlocked) {
        console.log(`[${requestId}] All whisper models blocked (${whisperErrors.join(",")}). Falling back to gpt-4o-audio-preview...`);

        try {
          // Read audio as base64 — chunked to avoid call-stack overflow on large files
          const audioBytes = new Uint8Array(await audioFile.arrayBuffer());
          let binary = "";
          const CHUNK = 8192;
          for (let i = 0; i < audioBytes.length; i += CHUNK) {
            binary += String.fromCharCode(...audioBytes.slice(i, i + CHUNK));
          }
          const base64Audio = btoa(binary);

          // Map MIME type → format string expected by OpenAI
          const mimeToFormat: Record<string, string> = {
            "audio/ogg":       "ogg",
            "audio/mpeg":      "mp3",
            "audio/mp3":       "mp3",
            "audio/mp4":       "mp4",
            "audio/m4a":       "mp4",
            "audio/x-m4a":     "mp4",
            "audio/webm":      "webm",
            "audio/wav":       "wav",
            "audio/x-wav":     "wav",
            "audio/flac":      "flac",
            "video/mp4":       "mp4",
            "video/webm":      "webm",
          };
          const audioFormat = mimeToFormat[audioFile.type] ?? "mp3";

          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY!}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-audio-preview",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "input_audio",
                      input_audio: { data: base64Audio, format: audioFormat },
                    },
                    {
                      type: "text",
                      text: "Transcribe this audio verbatim, exactly as spoken. Return only the transcription — no labels, no commentary.",
                    },
                  ],
                },
              ],
              max_tokens: 4096,
            }),
          });

          console.log(`[${requestId}] gpt-4o-audio-preview response status:`, res.status);

          if (!res.ok) {
            const err = await res.text();
            throw new Error(`gpt-4o-audio-preview failed (${res.status}): ${err}`);
          }

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || "";
          if (text) {
            console.log(`[${requestId}] gpt-4o-audio-preview transcription succeeded, length:`, text.length);
            return text;
          }
          throw new Error("gpt-4o-audio-preview returned empty transcript");
        } catch (audioErr) {
          throw new Error(
            `OpenAI transcription: whisper endpoint blocked (${whisperErrors.join(",")}); ` +
            `gpt-4o-audio-preview fallback also failed: ${audioErr instanceof Error ? audioErr.message : String(audioErr)}`
          );
        }
      }

      throw new Error(`OpenAI transcription: no model succeeded (${whisperErrors.join(", ")})`);
    };

    // Note: OpenRouter does not support audio transcription (returns 405).
    // Only ElevenLabs and OpenAI are used for transcription.

    // Priority order: ElevenLabs → OpenAI
    const transcriptionPipeline: Array<[string, () => Promise<string>]> = [];
    if (ELEVENLABS_API_KEY) transcriptionPipeline.push(["ElevenLabs",  transcribeWithElevenLabs]);
    if (OPENAI_API_KEY)     transcriptionPipeline.push(["OpenAI",       transcribeWithOpenAI]);

    const serviceErrors: string[] = [];

    for (const [name, fn] of transcriptionPipeline) {
      try {
        transcriptText = await fn();
        if (transcriptText) {
          transcriptionSource = name;
          console.log(`[${requestId}] Transcription succeeded via ${name}, length:`, transcriptText.length);
          break;
        } else {
          const msg = `${name}: returned empty transcript`;
          serviceErrors.push(msg);
          console.error(`[${requestId}] ${msg}`);
        }
      } catch (err) {
        const msg = `${name}: ${err instanceof Error ? err.message : String(err)}`;
        serviceErrors.push(msg);
        console.error(`[${requestId}] ${msg}`);
      }
    }

    if (!transcriptText) {
      const detail = serviceErrors.length
        ? serviceErrors.join(" | ")
        : "No transcription services are configured";
      console.error(`[${requestId}] All transcription services failed:`, detail);
      return new Response(
        JSON.stringify({ error: `Transcription failed — ${detail}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: AI PROVIDER SETUP
    // ─────────────────────────────────────────────────────────────
    let aiProvider = "openai";
    let apiKey     = OPENAI_API_KEY;
    let aiModel    = requestedModel || "gpt-4o";

    if (requestedProvider === "openrouter" && OPENROUTER_API_KEY) {
      aiProvider = "openrouter";
      apiKey     = OPENROUTER_API_KEY;
      aiModel    = requestedModel
        ? requestedModel.includes("/") ? requestedModel : `openai/${requestedModel}`
        : "openai/gpt-4o";
    } else if (requestedProvider === "openai" && OPENAI_API_KEY) {
      aiProvider = "openai";
      apiKey     = OPENAI_API_KEY;
      aiModel    = requestedModel || "gpt-4o";
    } else if (OPENAI_API_KEY) {
      aiProvider = "openai";
      apiKey     = OPENAI_API_KEY;
      aiModel    = requestedModel || "gpt-4o";
    } else if (OPENROUTER_API_KEY) {
      aiProvider = "openrouter";
      apiKey     = OPENROUTER_API_KEY;
      aiModel    = requestedModel
        ? requestedModel.includes("/") ? requestedModel : `openai/${requestedModel}`
        : "openai/gpt-4o";
    }

    const aiEndpoint =
      aiProvider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions";

    console.log(`[${requestId}] Using AI provider:`, aiProvider, "model:", aiModel);

    const aiHeaders: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (aiProvider === "openrouter") {
      aiHeaders["HTTP-Referer"] = "https://localhost";
      aiHeaders["X-Title"]     = "Voice Transcriber";
    }

    // Helper: call the AI endpoint
    // Note: o1 / o3 reasoning models do not accept the `temperature` parameter.
    const callAI = async (
      messages: Array<{ role: string; content: string }>,
      maxTokens   = 1000,
      temperature = 0.2
    ): Promise<string> => {
      const isReasoningModel = /^o[13]/.test(aiModel) || aiModel.includes("/o1") || aiModel.includes("/o3");
      const body: Record<string, unknown> = {
        model: aiModel,
        messages,
        max_tokens: maxTokens,
      };
      if (!isReasoningModel) {
        body.temperature = temperature;
      }

      const res = await fetch(aiEndpoint, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`AI request failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    };

    // ─────────────────────────────────────────────────────────────
    // STEP 3: DISFLUENCY CLEANING & TRANSCRIPT CLARIFICATION
    // Pass A — Fast regex pre-filter (free, instant, catches obvious cases)
    // Pass B — AI deep clean with example-driven prompt (context-aware)
    // ─────────────────────────────────────────────────────────────

    // Store original before any modification
    const rawTranscription = transcriptText;

    // Pass A: Regex pre-filter
    const regexPreClean = (text: string): string => {
      return text
        // Mid-word false starts: "u-", "nee-", "to-" etc.
        .replace(/\b\w{1,3}-\s*/g, "")
        // Standalone filler words
        .replace(/\b(um+|uh+|er+|ah+|ehm|uhm+|hmm+|mm+)\b[,.]?\s*/gi, " ")
        // Afrikaans/SA filler sounds only when isolated (guard against removing meaningful words)
        .replace(/\b(um|uh)\b(?!\s+(nee|man|shame|tog|jinne|jirre|sies))/gi, " ")
        // Stutter repetitions — same word repeated 2–4 times
        .replace(/\b(\w+)(\s+\1){1,3}\b/gi, "$1")
        // Collapse multiple spaces
        .replace(/\s{2,}/g, " ")
        .trim();
    };

    transcriptText = regexPreClean(transcriptText);
    console.log(
      `[${requestId}] Regex pre-clean done. Before: ${rawTranscription.length} chars, After: ${transcriptText.length} chars`
    );

    // Pass B: AI deep clean with few-shot example
    const aiCleanTranscript = async (text: string): Promise<string> => {
      // For long transcripts (5-min audio ≈ 4500+ chars), process in chunks of 3500 chars
      // to stay well within token limits while preserving context at boundaries.
      const CHUNK_SIZE = 3500;
      if (text.length <= CHUNK_SIZE) {
        return await cleanChunk(text) || text;
      }

      // Split on sentence boundaries near the chunk limit
      const chunks: string[] = [];
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= CHUNK_SIZE) {
          chunks.push(remaining);
          break;
        }
        // Find last sentence-ending punctuation before CHUNK_SIZE
        const slice = remaining.slice(0, CHUNK_SIZE);
        const lastBreak = Math.max(
          slice.lastIndexOf(". "),
          slice.lastIndexOf("! "),
          slice.lastIndexOf("? "),
          slice.lastIndexOf("\n")
        );
        const cutAt = lastBreak > CHUNK_SIZE * 0.6 ? lastBreak + 2 : CHUNK_SIZE;
        chunks.push(remaining.slice(0, cutAt).trim());
        remaining = remaining.slice(cutAt).trim();
      }

      console.log(`[${requestId}] Cleaning transcript in ${chunks.length} chunk(s)`);
      const cleaned = await Promise.all(chunks.map(cleanChunk));
      return cleaned.join(" ") || text;
    };

    const cleanChunk = async (text: string): Promise<string> => {
      const cleaningPrompt = `You are a professional transcription editor. Your job is to clean and clarify the following spoken transcript into a clear, professional, readable message — as if a fluent speaker had said it without hesitation.

STEP 1 — REMOVE all of the following:
- Filler words and sounds: "um", "uh", "er", "ah", "eh", "hmm", "mm", "uhm", "uhh" and all variations
- Mid-word false starts and stutters: e.g. "u- nee- need" → "need", "to- to report" → "to report"
- Repeated phrases caused by restarts: e.g. "please let them, yeah, please let them, click on" → "please let them click on"
- Vague filler clauses that add no information: e.g. "or whatever situation may be", "and all other", "actually to", "or whatever"
- Hesitation words mid-sentence: "yeah", "so", "right", "okay" when used as fillers (not as meaningful responses)

STEP 2 — CLARIFY and REPHRASE where needed:
- Fix grammatical errors caused by the cleanup (e.g. subject-verb agreement, tense consistency)
- Rephrase awkward or incomplete sentences into clear, natural ones
- Preserve the original meaning and intent exactly — do not add or invent information
- Keep the tone professional but natural (this is likely a workplace or instructional message)
- Preserve South African English expressions where they are intentional and meaningful (e.g. "just now", "now now", "shame", "lekker")

STEP 3 — STRUCTURE the output:
- Break into logical sentences and paragraphs where appropriate
- If there are multiple instructions or points, present them clearly in flowing prose
- Do not use bullet points unless the original clearly listed items

EXAMPLE INPUT:
"We will have to start let the drivers use the mobile app. As from tomorrow, if the drivers enters the office to bring documentation and all other, they come there to actually to, to report or whatever situation may be, please let them install the app on the app or on their, on their mobile phones. Please let them, yeah, please let them, click on the link, and it will automatically prompt for them to be installed. If they u- nee- need usernames, you could just let me know, but I will send a list for them. Or Mike and I ask you to handle this one"

EXAMPLE OUTPUT:
"We will need to start having the drivers use the mobile app. From tomorrow, if a driver comes into the office for any reason — whether to drop off documentation or to report something — please have them install the app on their mobile phone. Let them click on the link and it will automatically prompt them to install it. If they need usernames, please let me know and I will send through a list. Mike and I would like you to handle this."

Now clean the following transcript using the same approach:
"${text}"

Return ONLY the cleaned and clarified transcript. No explanations, no labels, no JSON.`;

      try {
        const cleaned = await callAI(
          [
            {
              role: "system",
              content:
                "You are a professional transcription editor and business communication specialist. " +
                "You clean spoken transcripts into clear, professional written messages. " +
                "You remove all disfluencies, false starts, mid-word stutters, repeated phrase restarts, " +
                "and vague filler clauses. You fix grammar and rephrase unclear sentences while " +
                "preserving the original meaning exactly. You never add information that was not in " +
                "the original. Return only the cleaned and clarified text.",
            },
            { role: "user", content: cleaningPrompt },
          ],
          4000,  // increased for 5-min audio transcripts
          0.1  // very low temperature for consistent, deterministic cleanup
        );

        return cleaned.trim() || text;
      } catch (err) {
        console.error(`[${requestId}] AI transcript cleaning failed, using regex-cleaned text:`, err);
        return text; // non-fatal — continue with regex-cleaned text
      }
    };

    console.log(`[${requestId}] Running AI disfluency cleaning and clarification...`);
    const cleanedTranscript = await aiCleanTranscript(transcriptText);
    console.log(
      `[${requestId}] AI cleaning done. Before: ${transcriptText.length} chars, After: ${cleanedTranscript.length} chars`
    );

    // ─────────────────────────────────────────────────────────────
    // STEP 4: PRIMARY AI ANALYSIS
    // Uses cleanedTranscript for accurate analysis
    // ─────────────────────────────────────────────────────────────
    let translation: string | null = null;
    let detectedLanguage = "Unknown";
    let summary   = "";
    let intent    = "";
    let keyPoints: string[] = [];
    let sentiment = "";
    let brief: {
      subject: string;
      executiveSummary: string;
      mainPoints: string[];
      actionItems: string[];
      decisions: string[];
    } | null = null;

    // Use cleaned transcript for analysis, capped at 5000 chars (handles ~5 min of speech)
    const analysisText =
      cleanedTranscript.substring(0, 5000) +
      (cleanedTranscript.length > 5000 ? "..." : "");

    const systemPrompt = `You are an expert linguist specialising in South African languages, with deep knowledge of:
- Afrikaans (distinct from Dutch — do NOT conflate them)
- South African English dialects
- Bantu languages: Zulu, Xhosa, Sotho, Tswana, Venda, Tsonga, Swati, Ndebele, Pedi

TRANSLATION RULES (critical):
1. Translate MEANING and INTENT — never translate word-for-word
2. Afrikaans shares vocabulary with Dutch but has its own idioms, grammar, and expressions — translate as Afrikaans, not Dutch
3. Output must be fluent, natural English — no Dutch words, no Afrikaans words, no mixed-language output
4. Preserve the speaker's tone (formal/informal/urgent/casual)
5. Render Afrikaans idioms as equivalent English idioms (e.g. "nou-nou" → "in a little while", "lekker" in context → "great/nice/pleasant")
6. South African English expressions are acceptable in translation where they naturally fit

Always return valid JSON only, with no markdown formatting or extra text.`;

    const analysisPrompt = `Analyze this transcribed audio text and return a JSON object with exactly these fields:

{
  "detectedLanguage": "Specific language name from this list if applicable: ${SA_LANGUAGES.join(", ")} — otherwise name the language",
  "translation": "If the text is NOT in English: provide a natural, idiomatic English translation. IMPORTANT: Do not produce a literal or Dutch-influenced translation — translate meaning and idiom. If already in English, return null.",
  "summary": "Concise 1–2 sentence summary of what was said",
  "intent": "Speaker's primary intention (e.g. 'making a request', 'asking a question', 'sharing information', 'expressing concern', 'giving instructions', 'greeting')",
  "keyPoints": ["3 to 5 key points or main ideas as an array of strings"],
  "sentiment": "Overall sentiment: 'positive', 'negative', 'neutral', 'urgent', 'concerned', 'excited', or 'frustrated'",
  "brief": {
    "subject": "A concise 5–10 word subject line describing the message topic",
    "executiveSummary": "A 2–3 sentence professional executive summary suitable for a report or briefing document",
    "mainPoints": ["Each key topic, argument or piece of information as a distinct, fully-formed sentence — minimum 3, maximum 6"],
    "actionItems": ["Each concrete task, request or follow-up action extracted from the message, as an imperative sentence — e.g. 'Install the mobile app by end of day'. Leave empty array [] if none exist."],
    "decisions": ["Each decision, agreement or conclusion explicitly stated in the message. Leave empty array [] if none exist."]
  }
}

Text to analyze:
"${analysisText}"

Return ONLY the JSON object.`;

    console.log(`[${requestId}] Sending primary AI analysis request...`);

    try {
      const rawContent = await callAI(
        [
          { role: "system", content: systemPrompt },
          { role: "user",   content: analysisPrompt },
        ],
        3000,  // increased for longer briefs on 5-min audio
        0.2
      );

      console.log(`[${requestId}] Raw AI analysis response length:`, rawContent.length);

      const cleanedJson = rawContent
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const result = JSON.parse(cleanedJson);

      translation      = result.translation      || null;
      detectedLanguage = result.detectedLanguage || "Unknown";
      summary          = result.summary          || "";
      intent           = result.intent           || "";
      keyPoints        = Array.isArray(result.keyPoints) ? result.keyPoints : [];
      sentiment        = result.sentiment        || "";
      brief            = result.brief            || null;

      console.log(`[${requestId}] Primary analysis complete:`, {
        detectedLanguage,
        hasTranslation: !!translation,
        summaryLength: summary.length,
        intent,
        keyPointsCount: keyPoints.length,
        sentiment,
      });
    } catch (analysisError) {
      console.error(`[${requestId}] Primary AI analysis failed:`, analysisError);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 5: TRANSLATION REFINEMENT PASS
    // Runs only when translation exists and language is South African
    // Uses cleanedTranscript as the source for best results
    // ─────────────────────────────────────────────────────────────
    const isSouthAfricanLanguage = SA_LANGUAGES.some((lang) =>
      detectedLanguage.toLowerCase().includes(lang.toLowerCase())
    );
    const isAfrikaans = detectedLanguage.toLowerCase().includes("afrikaans");

    if (translation && isSouthAfricanLanguage) {
      console.log(`[${requestId}] Running translation refinement for ${detectedLanguage}...`);

      const refinementSystemPrompt = isAfrikaans
        ? `You are a professional Afrikaans-to-English translator with expertise in South African culture and idiom.
Your task is to review and improve an existing translation.

Rules:
- Output ONLY the improved English translation — no explanations, no labels, no JSON
- The translation must be completely natural English; no Afrikaans or Dutch words whatsoever
- Afrikaans is NOT Dutch — do not use Dutch equivalents of words
- Translate idioms and expressions into their English equivalents
- Preserve the original speaker's tone (formal, casual, urgent, etc.)
- If the existing translation is already excellent, return it unchanged`
        : `You are a professional translator specialising in South African languages.
Review and improve the provided translation into natural, idiomatic English.
Output ONLY the improved English translation — no explanations, no JSON, no labels.`;

      const refinementUserPrompt = `Original ${detectedLanguage} text (cleaned):
"${cleanedTranscript.substring(0, 800)}"

Current English translation (may need improvement):
"${translation}"

Provide the improved, natural English translation only:`;

      try {
        const refinedTranslation = await callAI(
          [
            { role: "system", content: refinementSystemPrompt },
            { role: "user",   content: refinementUserPrompt },
          ],
          600,
          0.15
        );

        if (refinedTranslation && refinedTranslation.trim().length > 0) {
          console.log(`[${requestId}] Translation refined successfully`);
          translation = refinedTranslation.trim();
        }
      } catch (refinementError) {
        console.error(`[${requestId}] Translation refinement failed (using original):`, refinementError);
        // Non-fatal — keep translation from Step 4
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 6: RETURN RESPONSE
    // Returns cleaned transcript, raw original, and all analysis fields
    // ─────────────────────────────────────────────────────────────
    console.log(`[${requestId}] Returning successful response`);

    return new Response(
      JSON.stringify({
        transcription:    cleanedTranscript,
        rawTranscription: rawTranscription,
        transcriptionSource,
        translation,
        detectedLanguage,
        summary,
        intent,
        keyPoints,
        sentiment,
        brief,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error(`[${requestId}] analyze-audio error:`, {
      message: err.message,
      stack:   err.stack,
      name:    err.name,
    });

    return new Response(
      JSON.stringify({
        error:               e instanceof Error ? e.message : "Unknown error",
        transcription:       "",
        rawTranscription:    "",
        transcriptionSource: "",
        translation:         null,
        detectedLanguage:    "Unknown",
        summary:             "",
        intent:              "",
        keyPoints:           [],
        sentiment:           "",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});