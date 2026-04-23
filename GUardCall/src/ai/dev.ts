import { config } from 'dotenv';
config();

import '@/ai/flows/video-deepfake-detection-flow.ts';
import '@/ai/flows/audio-deepfake-detection.ts';
import '@/ai/flows/realtime-deepfake-alerts.ts';