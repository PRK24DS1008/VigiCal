'use server';
/**
 * @fileOverview A Genkit flow for real-time deepfake detection of audio and video streams.
 * It processes audio chunks and video frames to assess deepfake risk for individual participants.
 *
 * - realtimeDeepfakeAlerts - A function that handles real-time deepfake analysis.
 * - RealtimeDeepfakeAlertsInput - The input type for the realtimeDeepfakeAlerts function.
 * - RealtimeDeepfakeAlertsOutput - The return type for the realtimeDeepfakeAlerts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RealtimeDeepfakeAlertsInputSchema = z.object({
  participantId: z.string().describe('The ID of the participant being analyzed.'),
  audioDataUri:
    z.string()
      .optional()
      .describe(
        "Optional audio chunk as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
  videoFrameDataUri:
    z.string()
      .optional()
      .describe(
        "Optional video frame as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
});
export type RealtimeDeepfakeAlertsInput = z.infer<typeof RealtimeDeepfakeAlertsInputSchema>;

const RealtimeDeepfakeAlertsOutputSchema = z.object({
  participantId: z.string().describe('The ID of the participant analyzed.'),
  audioRiskScore: z.number().min(0).max(1).describe('Deepfake risk score for audio (0 = no risk, 1 = high risk).'),
  audioExplanation: z.string().describe('Explanation for the audio deepfake risk score.'),
  videoRiskScore: z.number().min(0).max(1).describe('Deepfake risk score for video (0 = no risk, 1 = high risk).'),
  videoExplanation: z.string().describe('Explanation for the video deepfake risk score.'),
  totalRiskScore: z.number().min(0).max(1).describe('Combined deepfake risk score for audio and video.'),
  status: z.enum(['Human', 'AI', 'Suspicious']).describe("Overall status based on deepfake risk."),
});
export type RealtimeDeepfakeAlertsOutput = z.infer<typeof RealtimeDeepfakeAlertsOutputSchema>;

const audioDeepfakePrompt = ai.definePrompt({
  name: 'audioDeepfakeDetectionPrompt',
  input: { schema: z.object({ audioDataUri: z.string().describe('Audio data for analysis.') }) },
  output: {
    schema: z.object({
      riskScore: z.number().min(0).max(1).describe('Detected risk score.'),
      explanation: z.string().describe('Explanation for the detected risk.'),
    }),
  },
  prompt: `You are an expert audio forensics analyst specialized in detecting deepfake audio.
Analyze the provided audio for signs of synthetic generation or manipulation, such as unnatural speech patterns, robotic tones, or inconsistencies in voice modulation.
Provide a deepfake risk score between 0 and 1 (where 0 is no risk and 1 is high risk of being a deepfake), and a concise explanation for your assessment.
Output MUST be in JSON format matching the schema.

Audio: {{media url=audioDataUri}}`,
});

const videoDeepfakePrompt = ai.definePrompt({
  name: 'videoDeepfakeDetectionPrompt',
  input: { schema: z.object({ videoFrameDataUri: z.string().describe('Video frame data for analysis.') }) },
  output: {
    schema: z.object({
      riskScore: z.number().min(0).max(1).describe('Detected risk score.'),
      explanation: z.string().describe('Explanation for the detected risk.'),
    }),
  },
  prompt: `You are an expert video forensics analyst specialized in detecting deepfake video.
Analyze the provided video frame for visual anomalies, inconsistencies, or other indicators of synthetic generation or manipulation, such as unnatural facial movements, artifacts, inconsistent lighting, or strange eye blinks.
Provide a deepfake risk score between 0 and 1 (where 0 is no risk and 1 is high risk of being a deepfake), and a concise explanation for your assessment.
Output MUST be in JSON format matching the schema.

Image: {{media url=videoFrameDataUri}}`,
});

const realtimeDeepfakeAlertsFlow = ai.defineFlow(
  {
    name: 'realtimeDeepfakeAlertsFlow',
    inputSchema: RealtimeDeepfakeAlertsInputSchema,
    outputSchema: RealtimeDeepfakeAlertsOutputSchema,
  },
  async (input) => {
    let audioRiskScore = 0;
    let audioExplanation = 'No audio provided for analysis.';
    let videoRiskScore = 0;
    let videoExplanation = 'No video frame provided for analysis.';

    // Run audio analysis if audio data is provided
    if (input.audioDataUri) {
      try {
        const { output } = await audioDeepfakePrompt({ audioDataUri: input.audioDataUri });
        audioRiskScore = output?.riskScore ?? 0;
        audioExplanation = output?.explanation ?? 'Analysis inconclusive.';
      } catch (error) {
        console.error(`Audio deepfake detection failed for participant ${input.participantId}:`, error);
        audioExplanation = `Audio analysis failed: ${error instanceof Error ? error.message : String(error)}. Defaulting to moderate risk.`;
        audioRiskScore = 0.5; // Assign a moderate risk score on failure to be cautious
      }
    }

    // Run video analysis if video frame data is provided
    if (input.videoFrameDataUri) {
      try {
        const { output } = await videoDeepfakePrompt({ videoFrameDataUri: input.videoFrameDataUri });
        videoRiskScore = output?.riskScore ?? 0;
        videoExplanation = output?.explanation ?? 'Analysis inconclusive.';
      } catch (error) {
        console.error(`Video deepfake detection failed for participant ${input.participantId}:`, error);
        videoExplanation = `Video analysis failed: ${error instanceof Error ? error.message : String(error)}. Defaulting to moderate risk.`;
        videoRiskScore = 0.5; // Assign a moderate risk score on failure to be cautious
      }
    }

    // Calculate total risk score (e.g., average of available scores)
    let totalRiskScore: number;
    if (input.audioDataUri && input.videoFrameDataUri) {
      totalRiskScore = (audioRiskScore + videoRiskScore) / 2;
    } else if (input.audioDataUri) {
      totalRiskScore = audioRiskScore;
    } else if (input.videoFrameDataUri) {
      totalRiskScore = videoRiskScore;
    } else {
      totalRiskScore = 0; // No data provided, assume no risk
    }

    // Determine overall status based on total risk score thresholds
    let status: 'Human' | 'AI' | 'Suspicious';
    if (totalRiskScore > 0.8) {
      status = 'AI';
    } else if (totalRiskScore > 0.4) {
      status = 'Suspicious';
    } else {
      status = 'Human';
    }

    return {
      participantId: input.participantId,
      audioRiskScore,
      audioExplanation,
      videoRiskScore,
      videoExplanation,
      totalRiskScore,
      status,
    };
  }
);

export async function realtimeDeepfakeAlerts(
  input: RealtimeDeepfakeAlertsInput
): Promise<RealtimeDeepfakeAlertsOutput> {
  return realtimeDeepfakeAlertsFlow(input);
}
