
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  CircleX, 
  Clipboard, 
  FileText, 
  HelpCircle, 
  Info, 
  User
} from "lucide-react";

type FormStep = "eligibility" | "client" | "project" | "summary";

const CreateProposal = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<FormStep>("eligibility");
  
  // Form state
  const [eligibility, setEligibility] = useState({
    inSouthAfrica: false,
    notRegistered: false,
    under15MWp: false,
    commissionedAfter2022: false,
    legalOwnership: false,
  });
  
  const [clientInfo, setClientInfo] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    existingClient: false,
  });
  
  const [projectInfo, setProjectInfo] = useState({
    name: "",
    address: "",
    size: "",
    commissionDate: "",
    additionalNotes: "",
  });
  
  // Calculate if all eligibility criteria are met
  const isEligible = Object.values(eligibility).every(value => value === true);
  
  // Calculate annual energy and carbon credits
  const calculateAnnualEnergy = () => {
    const sizeInKWp = parseFloat(projectInfo.size) * 1000; // Convert MWp to kWp
    const dailyKWh = sizeInKWp * 4.5; // Average 4.5 hours of sun per day
    return dailyKWh * 365; // Annual energy in kWh
  };
  
  const calculateCarbonCredits = () => {
    const annualEnergy = calculateAnnualEnergy();
    // Conversion factor: 1 MWh = 1.02 tCO2 (approximate for South Africa's grid)
    return (annualEnergy / 1000) * 1.02; // Convert kWh to MWh and then to tCO2
  };
  
  // Calculate projected revenue based on carbon credit prices by year
  const calculateRevenue = () => {
    const carbonCredits = calculateCarbonCredits();
    const carbonPrices = {
      2024: 78.36,
      2025: 93.19,
      2026: 110.78,
      2027: 131.64,
      2028: 156.30,
      2029: 185.30,
      2030: 190.55,
    };
    
    const revenue = {};
    Object.entries(carbonPrices).forEach(([year, price]) => {
      revenue[year] = Math.round(carbonCredits * price);
    });
    
    return revenue;
  };
  
  // Calculate client share percentage based on portfolio size
  const getClientSharePercentage = () => {
    const portfolioSize = parseFloat(projectInfo.size); // In MWp
    
    if (portfolioSize < 5) return 63;
    if (portfolioSize < 10) return 66.5;
    if (portfolioSize < 30) return 70;
    return 73.5;
  };
  
  // Calculate agent commission percentage
  const getAgentCommissionPercentage = () => {
    const portfolioSize = parseFloat(projectInfo.size); // In MWp
    return portfolioSize < 15 ? 4 : 7;
  };
  
  // Navigate to next step
  const nextStep = () => {
    switch (step) {
      case "eligibility":
        setStep("client");
        break;
      case "client":
        setStep("project");
        break;
      case "project":
        setStep("summary");
        break;
      case "summary":
        // Submit proposal
        navigate("/proposals");
        break;
    }
  };
  
  // Navigate to previous step
  const prevStep = () => {
    switch (step) {
      case "client":
        setStep("eligibility");
        break;
      case "project":
        setStep("client");
        break;
      case "summary":
        setStep("project");
        break;
    }
  };
  
  // Toggle eligibility checkbox
  const toggleEligibility = (field: keyof typeof eligibility) => {
    setEligibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  // Update client info
  const updateClientInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setClientInfo(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };
  
  // Update project info
  const updateProjectInfo = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProjectInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-carbon-gray-900">Create Proposal</h1>
        <p className="text-carbon-gray-600">Generate a new carbon credit proposal for a client or project.</p>
      </div>
      
      <div className="mb-8">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border-2 border-carbon-gray-200 retro-shadow">
          <div 
            className={`flex items-center ${step === "eligibility" || step === "client" || step === "project" || step === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center ${step === "eligibility" || step === "client" || step === "project" || step === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="ml-2 font-medium">Eligibility</span>
          </div>
          <div className={`h-1 w-16 ${step === "client" || step === "project" || step === "summary" ? "bg-carbon-green-500" : "bg-carbon-gray-200"}`}></div>
          <div 
            className={`flex items-center ${step === "client" || step === "project" || step === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center ${step === "client" || step === "project" || step === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
              <User className="h-5 w-5" />
            </div>
            <span className="ml-2 font-medium">Client Info</span>
          </div>
          <div className={`h-1 w-16 ${step === "project" || step === "summary" ? "bg-carbon-green-500" : "bg-carbon-gray-200"}`}></div>
          <div 
            className={`flex items-center ${step === "project" || step === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center ${step === "project" || step === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
              <FileText className="h-5 w-5" />
            </div>
            <span className="ml-2 font-medium">Project Info</span>
          </div>
          <div className={`h-1 w-16 ${step === "summary" ? "bg-carbon-green-500" : "bg-carbon-gray-200"}`}></div>
          <div 
            className={`flex items-center ${step === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center ${step === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
              <Clipboard className="h-5 w-5" />
            </div>
            <span className="ml-2 font-medium">Summary</span>
          </div>
        </div>
      </div>
      
      {/* Eligibility Step */}
      {step === "eligibility" && (
        <Card className="retro-card">
          <CardHeader>
            <CardTitle>Eligibility Check</CardTitle>
            <CardDescription>
              Verify that the project meets all eligibility criteria for carbon credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="inSouthAfrica" 
                checked={eligibility.inSouthAfrica}
                onCheckedChange={() => toggleEligibility("inSouthAfrica")}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="inSouthAfrica" 
                  className="font-medium text-carbon-gray-900"
                >
                  The project is located in South Africa
                </Label>
                <p className="text-sm text-carbon-gray-500">
                  The renewable energy system must be physically located within South Africa.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="notRegistered" 
                checked={eligibility.notRegistered}
                onCheckedChange={() => toggleEligibility("notRegistered")}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="notRegistered" 
                  className="font-medium text-carbon-gray-900"
                >
                  Not registered in another GHG program
                </Label>
                <p className="text-sm text-carbon-gray-500">
                  The project is not currently registered under any other greenhouse gas reduction program.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="under15MWp" 
                checked={eligibility.under15MWp}
                onCheckedChange={() => toggleEligibility("under15MWp")}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="under15MWp" 
                  className="font-medium text-carbon-gray-900"
                >
                  The system is under 15 MWp in capacity
                </Label>
                <p className="text-sm text-carbon-gray-500">
                  The total capacity of the renewable energy system must be less than 15 MWp.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="commissionedAfter2022" 
                checked={eligibility.commissionedAfter2022}
                onCheckedChange={() => toggleEligibility("commissionedAfter2022")}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="commissionedAfter2022" 
                  className="font-medium text-carbon-gray-900"
                >
                  Commissioned on or after September 15, 2022
                </Label>
                <p className="text-sm text-carbon-gray-500">
                  The system must have been commissioned (put into operation) on or after September 15, 2022.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="legalOwnership" 
                checked={eligibility.legalOwnership}
                onCheckedChange={() => toggleEligibility("legalOwnership")}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="legalOwnership" 
                  className="font-medium text-carbon-gray-900"
                >
                  Legal ownership of system or green attributes
                </Label>
                <p className="text-sm text-carbon-gray-500">
                  The client must have legal ownership of either the renewable energy system or its green attributes.
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-carbon-gray-50 border border-carbon-gray-200">
              <div className="flex items-start">
                <div className="mr-3">
                  {isEligible ? 
                    <CheckCircle2 className="h-6 w-6 text-carbon-green-500" /> : 
                    <CircleX className="h-6 w-6 text-destructive" />
                  }
                </div>
                <div>
                  <h3 className="font-medium text-carbon-gray-900">
                    {isEligible ? 
                      "Project is eligible for carbon credits" : 
                      "Project does not meet all eligibility criteria"
                    }
                  </h3>
                  <p className="text-sm text-carbon-gray-600 mt-1">
                    {isEligible ? 
                      "This project meets all the requirements to generate carbon credits through CrunchCarbon." : 
                      "Please ensure all eligibility criteria are met before proceeding."
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button 
              variant="outline" 
              onClick={() => navigate("/proposals")}
              className="retro-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button 
              onClick={nextStep} 
              disabled={!isEligible}
              className={`retro-button ${isEligible ? "bg-carbon-green-500 hover:bg-carbon-green-600 text-white" : "bg-carbon-gray-200 text-carbon-gray-500 cursor-not-allowed"}`}
            >
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Client Information Step */}
      {step === "client" && (
        <Card className="retro-card">
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Provide details about the client who will receive this proposal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 mb-6">
                <Checkbox 
                  id="existingClient" 
                  name="existingClient"
                  checked={clientInfo.existingClient}
                  onCheckedChange={(checked) => 
                    setClientInfo(prev => ({ ...prev, existingClient: !!checked }))
                  }
                />
                <div className="space-y-1">
                  <Label 
                    htmlFor="existingClient" 
                    className="font-medium text-carbon-gray-900"
                  >
                    This is an existing client
                  </Label>
                  <p className="text-sm text-carbon-gray-500">
                    Check this box if the client already has an account with CrunchCarbon.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={clientInfo.name}
                    onChange={updateClientInfo}
                    className="retro-input"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email"
                    value={clientInfo.email}
                    onChange={updateClientInfo}
                    className="retro-input"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={clientInfo.phone}
                    onChange={updateClientInfo}
                    className="retro-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name (Optional)</Label>
                  <Input 
                    id="companyName" 
                    name="companyName" 
                    value={clientInfo.companyName}
                    onChange={updateClientInfo}
                    className="retro-input"
                  />
                </div>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-carbon-blue-50 border border-carbon-blue-200">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-carbon-blue-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-carbon-gray-900">Client Notification</h3>
                    <p className="text-sm text-carbon-gray-600 mt-1">
                      {clientInfo.existingClient ? 
                        "The client will be notified about this proposal through their CrunchCarbon dashboard." : 
                        "A new account will be created for this client, and they will receive an email invitation to view this proposal."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button 
              variant="outline" 
              onClick={prevStep}
              className="retro-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button 
              onClick={nextStep} 
              disabled={!clientInfo.name || !clientInfo.email}
              className={`retro-button ${clientInfo.name && clientInfo.email ? "bg-carbon-green-500 hover:bg-carbon-green-600 text-white" : "bg-carbon-gray-200 text-carbon-gray-500 cursor-not-allowed"}`}
            >
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Project Information Step */}
      {step === "project" && (
        <Card className="retro-card">
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Enter details about the renewable energy project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={projectInfo.name}
                    onChange={updateProjectInfo}
                    className="retro-input"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="size">System Size (MWp)</Label>
                  <Input 
                    id="size" 
                    name="size" 
                    type="number"
                    step="0.01"
                    min="0"
                    max="15"
                    value={projectInfo.size}
                    onChange={updateProjectInfo}
                    className="retro-input"
                    required
                  />
                  <p className="text-xs text-carbon-gray-500">Must be less than 15 MWp</p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Project Address</Label>
                  <Textarea 
                    id="address" 
                    name="address" 
                    value={projectInfo.address}
                    onChange={updateProjectInfo}
                    className="retro-input"
                    required
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="commissionDate">Commission Date</Label>
                  <div className="relative">
                    <Input 
                      id="commissionDate" 
                      name="commissionDate" 
                      type="date"
                      value={projectInfo.commissionDate}
                      onChange={updateProjectInfo}
                      className="retro-input"
                      required
                      min="2022-09-15"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-carbon-gray-500">Must be on or after September 15, 2022</p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                  <Textarea 
                    id="additionalNotes" 
                    name="additionalNotes" 
                    value={projectInfo.additionalNotes}
                    onChange={updateProjectInfo}
                    className="retro-input"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-carbon-green-50 border border-carbon-green-200">
                <div className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-carbon-green-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-carbon-gray-900">System Size Information</h3>
                    <p className="text-sm text-carbon-gray-600 mt-1">
                      The system size should be specified in Megawatt peak (MWp). For example, a 100 kWp system would be entered as 0.1 MWp.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button 
              variant="outline" 
              onClick={prevStep}
              className="retro-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button 
              onClick={nextStep} 
              disabled={!projectInfo.name || !projectInfo.address || !projectInfo.size || !projectInfo.commissionDate}
              className={`retro-button ${projectInfo.name && projectInfo.address && projectInfo.size && projectInfo.commissionDate ? "bg-carbon-green-500 hover:bg-carbon-green-600 text-white" : "bg-carbon-gray-200 text-carbon-gray-500 cursor-not-allowed"}`}
            >
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Summary Step */}
      {step === "summary" && (
        <Card className="retro-card">
          <CardHeader>
            <CardTitle>Proposal Summary</CardTitle>
            <CardDescription>
              Review the proposal details before finalizing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-carbon-gray-500">Name</p>
                    <p className="font-medium">{clientInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Email</p>
                    <p className="font-medium">{clientInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Phone</p>
                    <p className="font-medium">{clientInfo.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Company</p>
                    <p className="font-medium">{clientInfo.companyName || "—"}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-carbon-gray-500">Project Name</p>
                    <p className="font-medium">{projectInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">System Size</p>
                    <p className="font-medium">{projectInfo.size} MWp</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-carbon-gray-500">Address</p>
                    <p className="font-medium">{projectInfo.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Commission Date</p>
                    <p className="font-medium">{projectInfo.commissionDate && new Date(projectInfo.commissionDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Carbon Credit Projection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-carbon-gray-500">Estimated Annual Energy</p>
                    <p className="font-medium">{calculateAnnualEnergy().toLocaleString()} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Estimated Annual Carbon Credits</p>
                    <p className="font-medium">{calculateCarbonCredits().toFixed(2)} tCO₂</p>
                  </div>
                </div>
                
                <h4 className="font-medium text-carbon-gray-700 mb-2">Projected Revenue by Year</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-carbon-gray-50">
                        <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Year</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Carbon Price (R/tCO₂)</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Estimated Revenue (R)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(calculateRevenue()).map(([year, revenue]) => (
                        <tr key={year}>
                          <td className="px-4 py-2 text-sm border border-carbon-gray-200">{year}</td>
                          <td className="px-4 py-2 text-sm border border-carbon-gray-200">
                            {year === "2024" && "R 78.36"}
                            {year === "2025" && "R 93.19"}
                            {year === "2026" && "R 110.78"}
                            {year === "2027" && "R 131.64"}
                            {year === "2028" && "R 156.30"}
                            {year === "2029" && "R 185.30"}
                            {year === "2030" && "R 190.55"}
                          </td>
                          <td className="px-4 py-2 text-sm text-right border border-carbon-gray-200">R {revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
                    <p className="text-sm text-carbon-gray-500">Client Share</p>
                    <p className="text-xl font-bold text-carbon-green-600">{getClientSharePercentage()}%</p>
                    <p className="text-xs text-carbon-gray-500 mt-1">Based on portfolio size</p>
                  </div>
                  <div className="p-4 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
                    <p className="text-sm text-carbon-gray-500">Agent Commission</p>
                    <p className="text-xl font-bold text-carbon-blue-600">{getAgentCommissionPercentage()}%</p>
                    <p className="text-xs text-carbon-gray-500 mt-1">Based on portfolio size</p>
                  </div>
                  <div className="p-4 bg-carbon-gray-50 rounded-lg border border-carbon-gray-200">
                    <p className="text-sm text-carbon-gray-500">Crunch Carbon Share</p>
                    <p className="text-xl font-bold text-carbon-gray-900">
                      {(100 - getClientSharePercentage() - getAgentCommissionPercentage()).toFixed(1)}%
                    </p>
                    <p className="text-xs text-carbon-gray-500 mt-1">Platform fee</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button 
              variant="outline" 
              onClick={prevStep}
              className="retro-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button 
              onClick={nextStep}
              className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button"
            >
              Generate Proposal <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default CreateProposal;
