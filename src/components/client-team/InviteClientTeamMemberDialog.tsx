import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, User } from 'lucide-react';

interface InviteClientTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: { email: string; firstName?: string; lastName?: string }) => void;
  isInviting: boolean;
}

export function InviteClientTeamMemberDialog({
  open,
  onOpenChange,
  onInvite,
  isInviting,
}: InviteClientTeamMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    onInvite({
      email: email.trim(),
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
    });

    // Reset form
    setEmail('');
    setFirstName('');
    setLastName('');
    setEmailError('');
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an email invitation to add a new member to your team. They'll receive a registration link and can help with project administration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  onBlur={handleEmailBlur}
                  className={`pl-9 ${emailError ? 'border-destructive' : ''}`}
                  disabled={isInviting}
                  required
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name (Optional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-9"
                  disabled={isInviting}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name (Optional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="pl-9"
                  disabled={isInviting}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                The invitation link will be valid for 48 hours. The new member will be added to your team after they complete registration. You can grant them signing permission later.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting || !email}>
              {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
