
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ShieldCheck,
  User,
  Share2,
  Mail,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInviteLink } from "@/lib/meeting-service";

interface HostDashboardProps {
  participants: any[];
  meetingId: string;
}

export function HostDashboard({
  participants,
  meetingId,
}: HostDashboardProps) {
  const suspiciousCount = participants.filter(
    (p) => p.status !== "Human"
  ).length;

  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const inviteLink = generateInviteLink(meetingId);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = inviteLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Meeting link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Please copy the link manually.",
      });
    }
  };

  const handleSendInvite = async () => {
    if (!emails.trim()) {
      toast({ title: "No emails", description: "Please enter at least one email." });
      return;
    }

    setSending(true);
    try {
      const emailList = emails.split(",").map((e) => e.trim()).filter((e) => e);
      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailList,
          meetingId,
          inviteLink // Pass the active client link
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invites");

      toast({
        title: "Invites Sent",
        description: `Sent to ${emailList.length} participant(s).`,
      });
      setEmails("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Invitation Failed",
        description: error.message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Security Console
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time AI analysis of participants
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Invite Participants
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Emails (comma separated)"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="text-xs bg-background/50"
            />
            <Button onClick={handleSendInvite} disabled={sending} className="shrink-0">
              {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </Button>
          </div>

          <Button
            variant="secondary"
            onClick={handleCopyLink}
            className="w-full text-xs flex gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Meeting Link"}
          </Button>

          <div className="pt-2">
            <p className="text-[10px] uppercase text-muted-foreground mb-1 font-bold">Current Secure Link</p>
            <Input value={inviteLink} readOnly className="text-xs h-8 bg-background/30" />
          </div>
        </CardContent>
      </Card>

      {suspiciousCount > 0 && (
        <div className="p-4 bg-red-100/10 border border-red-500/50 rounded flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-200">
            {suspiciousCount} suspicious participant(s) detected. High risk of synthetic media.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Active Participants ({participants.length})
        </h3>

        {participants.map((p) => (
          <Card key={p.id} className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {p.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={p.status === "Human" ? "secondary" : "destructive"}
                  className="text-[10px]"
                >
                  {p.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>AI Risk Assessment</span>
                    <span className={p.aiScore > 0.4 ? "text-red-400" : "text-green-400"}>
                      {(p.aiScore * 100).toFixed(0)}% Risk
                    </span>
                  </div>
                  <Progress 
                    value={p.aiScore * 100} 
                    className={p.aiScore > 0.4 ? "bg-red-900/20 [&>div]:bg-red-500" : ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
