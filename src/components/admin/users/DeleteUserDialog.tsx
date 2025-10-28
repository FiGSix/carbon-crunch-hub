import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserWithRoles {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles;
  onDelete: (userId: string) => Promise<void>;
  isDeleting: boolean;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onDelete,
  isDeleting,
}: DeleteUserDialogProps) {
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationStep(1);
      setEmailConfirmation('');
      setError(null);
      onOpenChange(false);
    }
  };

  const handleContinue = () => {
    setConfirmationStep(2);
    setError(null);
  };

  const handleBack = () => {
    setConfirmationStep(1);
    setEmailConfirmation('');
    setError(null);
  };

  const handleDelete = async () => {
    if (emailConfirmation !== user.email) {
      setError('Email does not match. Please type the exact email address.');
      return;
    }

    try {
      setError(null);
      await onDelete(user.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const userName = user.first_name || user.last_name
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : user.email;

  const isEmailMatch = emailConfirmation === user.email;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {confirmationStep === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Permanently Delete User?
              </DialogTitle>
              <DialogDescription className="space-y-2 pt-4">
                <p className="font-medium text-foreground">
                  You are about to permanently delete:
                </p>
                <div className="bg-muted p-3 rounded-md space-y-1">
                  <p className="font-medium">{userName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm">
                    Role: <span className="font-medium">{user.role}</span>
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm space-y-2">
                <p className="font-semibold">This action cannot be undone. This will:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Permanently delete the user account</li>
                  <li>Remove all user data from the system</li>
                  <li>Revoke all access and permissions</li>
                  <li>Preserve proposals for business continuity</li>
                </ul>
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleContinue}
                disabled={isDeleting}
              >
                Continue →
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Permanent Deletion
              </DialogTitle>
              <DialogDescription className="pt-2">
                Type the user's email address to confirm deletion
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">{user.email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-confirm">
                  Type email to confirm <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email-confirm"
                  value={emailConfirmation}
                  onChange={(e) => {
                    setEmailConfirmation(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter email address"
                  disabled={isDeleting}
                  autoComplete="off"
                  className={error ? 'border-destructive' : ''}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isDeleting}
              >
                ← Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={!isEmailMatch || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}