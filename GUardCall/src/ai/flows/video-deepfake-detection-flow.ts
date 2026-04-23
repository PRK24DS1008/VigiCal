'use server';
/**
 * @fileOverview Detects deepfake indicators in video frames.
 *
 * - detectVideoDeepfake - A function that analyzes a video frame for deepfake indicators.
 * - VideoDeepfakeDetectionInput - The input type for the detectVideoDeepfake function.
 * - VideoDeepfakeDetectionOutput - The return type for the detectVideoDeepfake function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VideoDeepfakeDetectionInputSchema = z.object({
  videoFrameDataUri: z
    .string()
    .describe(
      "A single video frame, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VideoDeepfakeDetectionInput = z.infer<typeof VideoDeepfakeDetectionInputSchema>;

const VideoDeepfakeDetectionOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if deepfake indicators are detected, false otherwise.'),
  riskScore: z.number().min(0).max(1).describe('A risk score from 0.0 to 1.0, where 1.0 indicates a high probability of deepfake.'),
  reasoning: z.string().describe('Detailed explanation of why the video frame is considered a deepfake or not, citing specific visual inconsistencies or lack thereof.'),
});
export type VideoDeepfakeDetectionOutput = z.infer<typeof VideoDeepfakeDetectionOutputSchema>;

export async function detectVideoDeepfake(input: VideoDeepfakeDetectionInput): Promise<VideoDeepfakeDetectionOutput> {
  return videoDeepfakeDetectionFlow(input);
}

const videoDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'videoDeepfakeDetectionPrompt',
  input: { schema: VideoDeepfakeDetectionInputSchema },
  output: { schema: VideoDeepfakeDetectionOutputSchema },
  prompt: `You are an expert deepfake detection AI. Analyze the provided video frame for any visual deepfake indicators, such as:
- Unnatural facial movements or expressions.
- Inconsistencies in lighting, shadows, or reflections.
- Abnormal skin texture or coloration.
- Pixelation, blurring, or other compression artifacts in specific areas.
- Unrealistic eye movements or blinking patterns.
- Irregularities around hair, clothing edges, or background elements.
- Any other visual anomalies typically associated with manipulated media.

Based on your analysis, determine if it is likely a deepfake, provide a risk score from 0.0 (very low risk) to 1.0 (very high risk), and explain your reasoning concisely but thoroughly.

Video Frame: {{media url=videoFrameDataUri}}`,
});

const videoDeepfakeDetectionFlow = ai.defineFlow(
  {
    name: 'videoDeepfakeDetectionFlow',
    inputSchema: VideoDeepfakeDetectionInputSchema,
    outputSchema: VideoDeepfakeDetectionOutputSchema,
  },
  async (input) => {
    const { output } = await videoDeepfakeDetectionPrompt(input);
    if (!output) {
      throw new Error('Failed to get deepfake detection output.');
    }
    return output;
  }
);
