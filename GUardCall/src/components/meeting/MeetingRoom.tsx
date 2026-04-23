"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  ShieldCheck, BarChart3, Loader2, UserCheck, UserX, Bell
} from 'lucide-react';
import { HostDashboard } from './HostDashboard';
import { useToast } from '@/hooks/use-toast';
import { VideoGrid } from './VideoGrid';
import { useWebRTC } from '@/hooks/useWebRTC';

interface MeetingRoomProps {
  meetingId: string;
  userName: string;
  participantId: string;
  isHost: boolean;
  initialDevices: { video: boolean; audio: boolean };
}

export function MeetingRoom({ meetingId, userName, participantId, isHost, initialDevices }: MeetingRoomProps) {
  const router = useRouter();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState(initialDevices);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  // ── Media init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const initMedia = async () => {
      try {
        let stream = new MediaStream();
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
        } catch (err: any) {
          console.warn("Trying devices individually...", err);
          try {
            const v = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
            v.getVideoTracks().forEach(t => stream.addTrack(t));
          } catch (_) {}
          try {
            const a = await navigator.mediaDevices.getUserMedia({ audio: true });
            a.getAudioTracks().forEach(t => stream.addTrack(t));
          } catch (_) {}
        }

        // Always enable tracks on entry
        stream.getVideoTracks().forEach(t => { t.enabled = true; });
        stream.getAudioTracks().forEach(t => { t.enabled = true; });

        setLocalStream(stream);
        setDevices({ video: stream.getVideoTracks().length > 0, audio: stream.getAudioTracks().length > 0 });
      } catch (err: any) {
        console.error("Hardware error:", err);
        setLocalStream(new MediaStream());
        setDevices({ video: false, audio: false });
        toast({ 
          variant: "destructive", 
          title: "Hardware Notice", 
          description: "Could not access media devices. Joining in view-only mode." 
        });
      } finally {
        setIsInitializing(false);
      }
    };

    if (!localStream) initMedia();
    return () => { localStream?.getTracks().forEach(t => t.stop()); };
  }, [toast]);

  // ── WebRTC & Signaling ──────────────────────────────────────────────────
  const { 
    participants, 
    remoteStreams, 
    knockRequests, 
    admitParticipant, 
    denyParticipant,
    updateStatus
  } = useWebRTC({
    meetingId, 
    participantId, 
    userName, 
    localStream, 
    isHost
  });

  // Sync initial and updated device state to others via SSE
  useEffect(() => {
    if (localStream) {
      updateStatus({ videoOn: devices.video, audioOn: devices.audio });
    }
  }, [devices.video, devices.audio, localStream, updateStatus]);

  // ── Notify host when new knock arrives ──────────────────────────────────
  const prevKnockCount = useRef(0);
  useEffect(() => {
    if (!isHost) return;
    if (knockRequests.length > prevKnockCount.current) {
      const newest = knockRequests[knockRequests.length - 1];
      toast({
        title: `🔔 ${newest.name} wants to join`,
        description: "Check the admission panel below.",
        duration: 6000,
      });
    }
    prevKnockCount.current = knockRequests.length;
  }, [knockRequests, isHost, toast]);

  // ── Toggles ─────────────────────────────────────────────────────────────
  const toggleAudio = async () => {
    if (!localStream) return;
    let track = localStream.getAudioTracks()[0];
    if (!track) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        track = s.getAudioTracks()[0];
        localStream.addTrack(track);
      } catch {
        toast({ variant: "destructive", title: "Mic Access Denied" });
        return;
      }
    }
    track.enabled = !track.enabled;
    setDevices(prev => ({ ...prev, audio: track.enabled }));
    updateStatus({ audioOn: track.enabled });
  };

  const toggleVideo = async () => {
    if (!localStream) return;
    let track = localStream.getVideoTracks()[0];
    if (!track) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        track = s.getVideoTracks()[0];
        localStream.addTrack(track);
      } catch {
        toast({ variant: "destructive", title: "Camera Access Denied" });
        return;
      }
    }
    track.enabled = !track.enabled;
    setDevices(prev => ({ ...prev, video: track.enabled }));
    updateStatus({ videoOn: track.enabled });
  };

  const leaveMeeting = () => {
    localStream?.getTracks().forEach(t => t.stop());
    router.push('/');
  };

  if (isInitializing || !localStream) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-headline uppercase tracking-widest text-xs">Entering Secure Space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 glass-morphism z-50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <span className="font-headline font-bold text-lg tracking-tight">GuardCall</span>
          <Badge variant="outline" className="text-[10px] ml-2 border-primary/20 text-primary uppercase tracking-widest font-bold">
            SECURE • {meetingId.slice(0, 8)}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {isHost && knockRequests.length > 0 && (
            <Badge className="bg-amber-500 text-white gap-1 px-2 py-1 animate-pulse">
              <Bell className="w-3 h-3" />
              {knockRequests.length} waiting
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-headline border-primary/20 hover:bg-primary/10"
            onClick={() => {
              const link = `${window.location.origin}/meeting/${meetingId}`;
              navigator.clipboard.writeText(link);
              toast({ title: "Link Copied", description: "Meeting link copied to clipboard." });
            }}
          >
            Copy Link
          </Button>
          {isHost && (
            <Button
              variant={showDashboard ? "default" : "secondary"}
              size="sm"
              className="gap-2 text-xs font-headline"
              onClick={() => setShowDashboard(!showDashboard)}
            >
              <BarChart3 className="w-4 h-4" />
              Console
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative flex flex-col items-center justify-center p-4">

          {/* ── Knock Admission Panel (Host only) ── */}
          {isHost && knockRequests.length > 0 && (
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-3 w-80">
              {knockRequests.map(knock => (
                <div
                  key={knock.participantId}
                  className="glass-morphism border border-amber-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{knock.name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{knock.name}</p>
                      <p className="text-xs text-muted-foreground">wants to join the meeting</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => admitParticipant(knock.participantId, knock.name)}
                    >
                      <UserCheck className="w-4 h-4" />
                      Admit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1.5"
                      onClick={() => denyParticipant(knock.participantId)}
                    >
                      <UserX className="w-4 h-4" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Video Grid */}
          <VideoGrid
            participants={participants}
            localId={participantId}
            localStream={localStream}
            localDevices={devices}
            remoteStreams={remoteStreams}
          />

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 rounded-3xl glass-morphism shadow-2xl z-50 border border-white/5 backdrop-blur-2xl">
            <Button
              variant={devices.audio ? "secondary" : "destructive"}
              size="icon"
              onClick={toggleAudio}
              className="rounded-2xl w-14 h-14"
              title={devices.audio ? "Mute microphone" : "Unmute microphone"}
            >
              {devices.audio ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>
            <Button
              variant={devices.video ? "secondary" : "destructive"}
              size="icon"
              onClick={toggleVideo}
              className="rounded-2xl w-14 h-14"
              title={devices.video ? "Turn off camera" : "Turn on camera"}
            >
              {devices.video ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
            <div className="w-px h-10 bg-border mx-2" />
            <Button
              variant="destructive"
              size="icon"
              onClick={leaveMeeting}
              className="rounded-2xl w-14 h-14 bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Host Dashboard Sidebar */}
        {isHost && showDashboard && (
          <aside className="w-[400px] border-l border-border glass-morphism flex flex-col p-4 overflow-y-auto">
            <HostDashboard participants={participants} meetingId={meetingId} />
          </aside>
        )}
      </div>
    </div>
  );
}
