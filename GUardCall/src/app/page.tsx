"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCreateMeeting = () => {
    setLoading(true);
    try {
      // Generate a unique meeting ID locally — no Firestore needed
      const meetingId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
      toast({
        title: "Meeting Created",
        description: "Redirecting to your secure room...",
      });
      router.push(`/meeting/${meetingId}?isHost=true`);
    } catch (error: any) {
      setLoading(false);
      toast({ variant: "destructive", title: "Error", description: "Could not create meeting." });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="p-3 bg-primary/20 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-5xl font-bold font-headline">GuardCall</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The world's first video conferencing platform with integrated real-time AI deepfake detection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="glass-morphism border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Host a Secure Meeting
              </CardTitle>
              <CardDescription>
                Start an encrypted session with active deepfake monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Button 
                onClick={handleCreateMeeting} 
                className="w-full h-12 text-lg font-headline gap-2 group"
                disabled={loading}
              >
                {loading ? "Initializing..." : "Start Secure Meeting"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6 pt-8">
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-accent/20 rounded-lg h-fit">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI Audio Analysis</h3>
                <p className="text-muted-foreground text-sm">Every audio chunk is analyzed for synthetic patterns and robotic anomalies.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-accent/20 rounded-lg h-fit">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Visual Integrity</h3>
                <p className="text-muted-foreground text-sm">Real-time frame analysis detects unnatural facial movements or lighting inconsistencies.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/20 rounded-lg h-fit">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Secure Handshakes</h3>
                <p className="text-muted-foreground text-sm">Participant links are unique and meetings are strictly invite-only.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
