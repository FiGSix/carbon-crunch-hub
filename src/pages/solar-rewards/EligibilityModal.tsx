import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface EligibilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQualified: () => void;
}

export function EligibilityModal({ open, onOpenChange, onQualified }: EligibilityModalProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    {
      question: "Is your solar system in South Africa?",
      correctAnswer: true
    },
    {
      question: "Do you own the solar system?",
      subtext: "(not leased or rented)",
      correctAnswer: true
    },
    {
      question: "Is your system smaller than 15 kWp?",
      subtext: "(Most homes are 3-10 kWp)",
      correctAnswer: true
    },
    {
      question: "Are you already registered in another carbon programme?",
      correctAnswer: false
    }
  ];

  const handleAnswer = (answer: boolean) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // Check if all answers are correct
      const allCorrect = newAnswers.every((ans, idx) => ans === questions[idx].correctAnswer);
      if (allCorrect) {
        setTimeout(() => onQualified(), 500);
      }
    }
  };

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setStep(0);
    setAnswers([]);
    setEmail("");
    setSubmitted(false);
    onOpenChange(false);
  };

  const isQualified = step === questions.length && 
    answers.every((ans, idx) => ans === questions[idx].correctAnswer);
  
  const failedStep = step === questions.length ? 
    answers.findIndex((ans, idx) => ans !== questions[idx].correctAnswer) : -1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Quick Eligibility Check</DialogTitle>
        </DialogHeader>
        
        {step < questions.length ? (
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Question {step + 1} of {questions.length}
              </h3>
              <p className="text-xl font-semibold text-foreground">
                {questions[step].question}
              </p>
              {questions[step].subtext && (
                <p className="text-sm text-muted-foreground">
                  {questions[step].subtext}
                </p>
              )}
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={() => handleAnswer(true)}
                variant="outline"
                className="flex-1 h-14 text-lg"
              >
                Yes
              </Button>
              <Button
                onClick={() => handleAnswer(false)}
                variant="outline"
                className="flex-1 h-14 text-lg"
              >
                No
              </Button>
            </div>
            
            <div className="flex gap-1 justify-center">
              {questions.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx < step ? "w-8 bg-primary" : 
                    idx === step ? "w-12 bg-primary/50" : 
                    "w-8 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : isQualified ? (
          <div className="py-6 text-center space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">
                Great News! You Qualify!
              </h3>
              <p className="text-muted-foreground">
                Your solar system is eligible for carbon credit earnings.
                Let's calculate your potential income.
              </p>
            </div>
            
            <Button 
              onClick={onQualified}
              className="w-full h-12 text-lg"
            >
              Calculate My Earnings →
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center space-y-6">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">
                Not Eligible (Yet)
              </h3>
              <p className="text-muted-foreground">
                {failedStep === 0 && "Currently, we only work with solar systems in South Africa."}
                {failedStep === 1 && "You need to own your solar system to qualify for carbon credits."}
                {failedStep === 2 && "Systems over 15 kWp require a different registration process. Contact us for enterprise solutions."}
                {failedStep === 3 && "You can only be registered in one carbon programme at a time."}
              </p>
            </div>
            
            {!submitted ? (
              <form onSubmit={handleNotifyMe} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We're constantly expanding our program. Leave your email to be notified when you qualify.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="notifyEmail" className="sr-only">Email</Label>
                  <Input
                    id="notifyEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  Notify Me
                </Button>
              </form>
            ) : (
              <p className="text-green-600 font-medium">
                ✓ We'll notify you when you're eligible!
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
