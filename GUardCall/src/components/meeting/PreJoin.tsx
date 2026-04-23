
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, Camera, Loader2, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface PreJoinProps {
  onJoin: (name: string, devices: { video: boolean; audio: boolean }) => void;
}

export function PreJoin({ onJoin }: PreJoinProps) {
  const [name, setName] = useState('');
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const setupPreview = async () => {
      try {
        if (videoOn) {
          // Attempt to get video. We catch specific hardware missing errors.
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: false,
          });

          if (!active) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setHardwareError(null);
        } else {
          streamRef.current?.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      } catch (err: any) {
        if (active) {
          console.warn("Hardware access notice:", err.name);
          setVideoOn(false);
          if (err.name === 'NotFoundError') {
            setHardwareError("No camera detected on this device.");
          } else if (err.name === 'NotAllowedError') {
            setHardwareError("Camera access denied by browser.");
          } else {
            setHardwareError("Unable to access camera.");
          }
        }
      }
    };

    setupPreview();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [videoOn]);

  const handleJoin = () => {
    if (!name.trim()) return;
    setIsJoining(true);
    onJoin(name.trim(), { video: videoOn, audio: audioOn });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="aspect-video bg-card rounded-3xl overflow-hidden relative border border-border shadow-2xl flex items-center justify-center">
            {videoOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-4">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                  <Camera className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <div className="text-center space-y-2 px-6">
                   <p className="font-headline font-bold uppercase tracking-widest text-xs">
                    {hardwareError || "Camera is off"}
                  </p>
                  {hardwareError && (
                    <div className="flex items-center gap-2 text-[10px] text-destructive justify-center">
                      <AlertCircle className="w-3 h-3" />
                      <span>Joining without camera</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 p-2 rounded-2xl glass-morphism backdrop-blur-xl border border-white/5">
              <Button
                variant={audioOn ? "secondary" : "destructive"}
                size="icon"
                onClick={() => setAudioOn(!audioOn)}
                className="rounded-xl h-12 w-12"
              >
                {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              <Button
                variant={videoOn ? "secondary" : "destructive"}
                size="icon"
                onClick={() => setVideoOn(!videoOn)}
                className="rounded-xl h-12 w-12"
              >
                {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-bold font-headline tracking-tight">Meeting Setup</h2>
            <p className="text-muted-foreground">Configure your media and identity before entering the room.</p>
          </div>
        </div>

        <Card className="glass-morphism border-primary/20 shadow-2xl bg-card/40 backdrop-blur-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-headline flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              Identify Yourself
            </CardTitle>
            <p className="text-sm text-muted-foreground">Enter your display name to join the secure session.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="e.g., Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleJoin()}
                className="bg-background/50 border-primary/20 h-12 text-lg focus:ring-primary"
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              disabled={!name.trim() || isJoining}
              onClick={handleJoin}
              className="w-full h-12 text-lg font-headline font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  PREPARING...
                </>
              ) : (
                "JOIN MEETING"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
