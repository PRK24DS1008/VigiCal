"use client";

import { useState, useEffect, useCallback } from 'react';
import { realtimeDeepfakeAlerts, RealtimeDeepfakeAlertsOutput } from '@/ai/flows/realtime-deepfake-alerts';

interface UseDeepfakeDetectionProps {
  enabled: boolean;
  localStream: MediaStream | null;
  participantId: string;
  intervalMs?: number;
}

export function useDeepfakeDetection({ 
  enabled, 
  localStream, 
  participantId, 
  intervalMs = 15000 
}: UseDeepfakeDetectionProps) {
  const [results, setResults] = useState<RealtimeDeepfakeAlertsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const captureFrame = useCallback((): string | null => {
    const video = document.querySelector('video');
    if (!video) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flip horizontally for mirroring if needed, here we just take the raw
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // We mock audio capture as it's complex for a simple dataURI
  // In real implementation, you'd use MediaRecorder to get a small blob
  const performAnalysis = useCallback(async () => {
    if (!enabled || !localStream) return;
    
    setIsAnalyzing(true);
    try {
      const frameData = captureFrame();
      
      // Call the AI flow
      const output = await realtimeDeepfakeAlerts({
        participantId,
        videoFrameDataUri: frameData || undefined,
        audioDataUri: undefined // Mocking audio as optional
      });
      
      setResults(output);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [enabled, localStream, participantId, captureFrame]);

  useEffect(() => {
    if (!enabled || !localStream) return;

    const interval = setInterval(performAnalysis, intervalMs);
    // Perform initial analysis
    performAnalysis();

    return () => clearInterval(interval);
  }, [enabled, localStream, performAnalysis, intervalMs]);

  return { results, isAnalyzing };
}