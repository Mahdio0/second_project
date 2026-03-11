const express = require('express');
const { YoutubeTranscript } = require('youtube-transcript');
const OpenAI = require('openai');
const axios = require('axios');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract a YouTube video ID from a URL.
 * Supports youtube.com/watch?v=, youtu.be/, and youtube.com/embed/ formats.
 */
function extractVideoId(url) {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch transcript text for a given YouTube video ID.
 */
async function getTranscript(videoId) {
  const items = await YoutubeTranscript.fetchTranscript(videoId);
  return items.map((item) => item.text).join(' ');
}

/**
 * Call OpenAI to produce a structured summary + Mermaid mindmap.
 * Returns { summary: string, mindmap: string }.
 */
async function generateSummaryAndMindmap(transcript) {
  const systemPrompt = `You are an expert content analyst. When given a YouTube video transcript you will:
1. Write a clear, well-structured summary in 3–5 paragraphs.
2. Produce a Mermaid.js mindmap diagram that captures the key topics and subtopics.

Respond ONLY with valid JSON in this exact format (no markdown fences):
{
  "summary": "<plain-text summary here>",
  "mindmap": "<complete Mermaid mindmap code starting with 'mindmap' keyword>"
}`;

  const userMessage = `Transcript:\n\n${transcript.slice(0, 12000)}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const raw = completion.choices[0].message.content;
  return JSON.parse(raw);
}

/**
 * Call ElevenLabs TTS API to convert text into an MP3 audio buffer.
 * Returns a Buffer containing the audio data.
 */
async function generateVoiceover(text) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // default: "Sarah"
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text: text.slice(0, 2500), // ElevenLabs free tier limit
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    },
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
    }
  );
  return Buffer.from(response.data);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/summary
 * Body: { url: string, options: { summary?: bool, mindmap?: bool, voiceover?: bool } }
 * Returns the requested outputs.
 */
router.post('/', async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A YouTube URL is required.' });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Could not extract a video ID from the provided URL.' });
  }

  // At least one output must be requested
  const wantSummary = options.summary !== false; // default true
  const wantMindmap = options.mindmap === true;
  const wantVoiceover = options.voiceover === true;

  try {
    // Step 1 — Transcript
    let transcript;
    try {
      transcript = await getTranscript(videoId);
    } catch (err) {
      return res.status(422).json({
        error:
          'Could not fetch a transcript for this video. The video may have no captions, be private, or be age-restricted.',
      });
    }

    const result = { videoId };

    // Step 2 — AI summary + mindmap (single OpenAI call for efficiency)
    if (wantSummary || wantMindmap) {
      const { summary, mindmap } = await generateSummaryAndMindmap(transcript);
      if (wantSummary) result.summary = summary;
      if (wantMindmap) result.mindmap = mindmap;

      // Step 3 — Voiceover (based on summary text)
      if (wantVoiceover && summary) {
        if (!process.env.ELEVENLABS_API_KEY) {
          result.voiceoverError = 'ElevenLabs API key not configured.';
        } else {
          try {
            const audioBuffer = await generateVoiceover(summary);
            result.voiceover = audioBuffer.toString('base64');
          } catch (err) {
            result.voiceoverError = 'Voiceover generation failed: ' + err.message;
          }
        }
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Summary route error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;
