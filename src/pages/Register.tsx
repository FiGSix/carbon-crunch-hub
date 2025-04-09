
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft, CheckCircle, FileText, Link2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'agent' ? 'agent' : 'client';
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    role: initialRole,
  });
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value as "client" | "agent" }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if terms need to be accepted for agents
    if (formData.role === "agent" && !termsAccepted) {
      alert("You must accept the Agent Referral Agreement to continue.");
      return;
    }
    
    // In a real app, this would register the user and store the terms acceptance
    if (formData.role === "agent" && termsAccepted) {
      // Here we would store in a database:
      // - User ID
      // - Timestamp
      // - IP address (would need to be captured from server)
      // - Agreement version
      // - Full text of agreement
      console.log("Terms & Conditions accepted at:", new Date().toISOString());
    }
    
    navigate("/dashboard");
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md px-4">
          <div className="mb-6">
            <Link to="/" className="flex items-center text-carbon-gray-600 hover:text-carbon-green-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </div>
          
          <div className="retro-card">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-carbon-gray-900">Create an account</h1>
              <p className="text-carbon-gray-600 mt-2">Join CrunchCarbon and start earning from carbon credits</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">I am a</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger className="retro-input mt-1">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">System Owner (Client)</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="retro-input mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="retro-input mt-1"
                      required
                    />
                  </div>
                </div>
                
                {formData.role === "agent" && (
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="retro-input mt-1"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="retro-input mt-1"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="retro-input mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="retro-input mt-1"
                    required
                  />
                </div>
                
                {formData.role === "agent" && (
                  <div className="space-y-2 border-t pt-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="terms" 
                        checked={termsAccepted}
                        onCheckedChange={(checked) => {
                          setTermsAccepted(checked === true);
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="terms"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                        >
                          I agree to the 
                          <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                type="button" 
                                variant="link" 
                                className="h-auto p-0 text-carbon-green-600 hover:underline"
                              >
                                Agent Referral Agreement
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <FileText className="h-5 w-5" />
                                  Crunch Carbon Agent Referral Agreement
                                </DialogTitle>
                                <DialogDescription>
                                  Please read the following agreement carefully
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4 text-sm mt-4">
                                <div className="text-center">
                                  <p className="font-bold">Crunch Carbon Agent Referral Agreement</p>
                                  <p>Crunch Carbon (Pty) Ltd</p>
                                  <p>Registration No: 2019/54306/07</p>
                                  <p>4 Sandown Valley Crescent, Sandown, Sandton, 2031</p>
                                  <p>(Hereinafter referred to as "Crunch Carbon")</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">RECITALS</p>
                                  <p>WHEREAS, the Referring Agent is engaged in the business of providing services to the renewable energy sector such as engineering, procurement, construction (EPC) services, or otherwise works with clients who own photovoltaic (solar) systems;</p>
                                  <p>AND WHEREAS, Crunch Carbon is engaged in the facilitation, auditing, and sale of verified carbon credits and seeks to acquire new clients via such referral relationships;</p>
                                  <p>NOW THEREFORE, in consideration of the mutual covenants and promises contained herein, the parties agree as follows:</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">1. Scope of Services</p>
                                  <p>The Referring Agent agrees to:</p>
                                  <p>a. Identify and refer qualifying clients who own solar PV systems to Crunch Carbon;</p>
                                  <p>b. Assist in the onboarding process of referred clients, where required;</p>
                                  <p>c. Manage all administrative tasks related to the referral process, including document collection and client liaison;</p>
                                  <p>d. Obtain all necessary documents and information from referred clients as required by Crunch Carbon to facilitate the registration, verification, and sale of carbon credits.</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">2. Compensation</p>
                                  <p>a. Crunch Carbon shall pay the Referring Agent a referral fee as outlined within the portal.</p>
                                  <p>b. Referral fees will be calculated based on verified client projects and payable on an annual basis following the successful completion of a financial audit.</p>
                                  <p>c. All compensation will be communicated in writing to the Referring Agent.</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">3. Term</p>
                                  <p>This Agreement shall commence upon the Referring Agent's acceptance via online sign-up and shall remain in force for the duration their referred client(s) remains on the program, unless terminated earlier in accordance with Clause 4.</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">4. Termination</p>
                                  <p>a. Either party may terminate this Agreement with 30 (thirty) days' written notice to the other.</p>
                                  <p>b. In the event of termination, the Referring Agent shall be entitled to any referral fees earned prior to the termination date.</p>
                                  <p>c. Should the Referring Agent fail to comply with the duties outlined in Clause 1 (a–d), Crunch Carbon shall issue a notice allowing 7 working days to rectify such failures. Failure to comply may result in immediate termination with no compensation.</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">5. Confidentiality</p>
                                  <p>Both parties agree to treat all non-public, proprietary, or sensitive information shared during the course of this Agreement as strictly confidential and shall not disclose such information to any third party without prior written consent, except as required by law.</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">6. Indemnification</p>
                                  <p>The Referring Agent agrees to indemnify, defend, and hold harmless Crunch Carbon, its affiliates, directors, and employees from any claims, losses, or liabilities arising from the Referring Agent's actions, negligence, or breach of this Agreement.</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">7. Governing Law</p>
                                  <p>This Agreement shall be governed by and interpreted in accordance with the laws of the Republic of South Africa. Any disputes arising from this Agreement shall be subject to the hearing and adjudication by the council of the South African arbitrators.</p>
                                </div>
                                
                                <div>
                                  <p className="font-bold">8. Entire Agreement</p>
                                  <p>This document constitutes the entire agreement between Crunch Carbon and the Referring Agent. It supersedes all prior discussions, agreements, or understandings related to the subject matter herein.</p>
                                </div>
                                
                                <div className="pt-4">
                                  <Button
                                    onClick={() => {
                                      setTermsAccepted(true);
                                      setTermsDialogOpen(false);
                                    }}
                                    className="w-full bg-carbon-green-500 hover:bg-carbon-green-600"
                                  >
                                    I Agree to the Terms & Conditions
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-carbon-gray-600">
                  <CheckCircle className="h-4 w-4 text-carbon-green-500 mr-2" />
                  <span>
                    By signing up, you agree to our {" "}
                    <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="link" 
                          className="h-auto p-0 text-carbon-green-600 hover:underline"
                        >
                          Terms and Privacy Policy
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5" />
                            Terms of Service & Privacy Policy
                          </DialogTitle>
                          <DialogDescription>
                            Last updated: April 9, 2025
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="text-sm space-y-4 mt-4">
                          <h3 className="font-bold text-lg mb-2">Privacy Policy</h3>
                          <p>
                            This Privacy Policy explains how Crunch Carbon collects, shares, and uses any information that relates to you when you use our Site, engage with us on social media, or otherwise interact with us (your "Personal Data"). This Privacy Policy also explains the rights you have concerning the Personal Data that we process and how you can exercise these rights.
                          </p>

                          <div>
                            <h3 className="font-bold text-base mb-2">Principles</h3>
                            <p>Crunch Carbon manifests its commitment to privacy and data protection by embracing the following principles.</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>Crunch Carbon uses Personal Data lawfully, fairly, and in a transparent manner.</li>
                              <li>Crunch Carbon collects no more Personal Data than necessary, and only for a legitimate purpose.</li>
                              <li>Crunch Carbon retains no more data than necessary or for a longer period than needed.</li>
                              <li>Crunch Carbon protects Personal Data with appropriate security measures.</li>
                            </ul>
                          </div>

                          <div>
                            <h3 className="font-bold text-base mb-2">Data We Collect</h3>
                            <p>This policy applies only to information collected on our website. We collect two types of information from visitors to our websites:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>Personal Data.</li>
                              <li>Non-personal Data.</li>
                            </ul>
                            <p className="mt-2">"Personal Data" is information that identifies you personally and that you provide to us, such as your name, address, telephone number, email address, and sometimes your Internet Protocol (IP) address.</p>
                            <p className="mt-2">"Non-personal Data" can be technical in nature. It does not identify you personally.</p>
                          </div>

                          <div className="pt-4">
                            <Button
                              onClick={() => {
                                setPrivacyDialogOpen(false);
                              }}
                              className="w-full"
                            >
                              I Understand
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </span>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button"
                >
                  Create Account
                </Button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-carbon-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-carbon-green-600 hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Register;
