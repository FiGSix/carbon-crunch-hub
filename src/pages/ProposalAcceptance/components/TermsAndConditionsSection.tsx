import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { ProposalData } from "@/types/proposals";

interface TermsAndConditionsSectionProps {
  onScrolledToBottom: () => void;
  proposal: ProposalData;
}

export function TermsAndConditionsSection({ onScrolledToBottom, proposal }: TermsAndConditionsSectionProps) {
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Extract dynamic field values
  const ownerName = proposal?.content?.clientInfo?.name || "[Owner Name]";
  const ownerEmail = proposal?.content?.clientInfo?.email || "[Owner Email]";
  const registrationNumber = proposal?.content?.clientInfo?.registrationNumber || "Not Applicable";
  const companyAddress = proposal?.content?.clientInfo?.address || proposal?.content?.projectInfo?.address || "[Company Address]";
  const premisesAddress = proposal?.content?.projectInfo?.address || "[Premises Address]";
  
  const getInstallationDate = () => {
    if (proposal?.content?.projectInfo?.commissionDate) {
      const date = new Date(proposal.content.projectInfo.commissionDate);
      return date.toISOString().split('T')[0];
    }
    return "[Installation Date]";
  };
  
  const getSigningDate = () => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  };
  
  const installationDate = getInstallationDate();
  const signingDate = getSigningDate();
  
  const clientSharePercentage = proposal?.client_share_percentage || 0;
  const ownerPercentage = clientSharePercentage.toFixed(1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasReachedBottom) {
          setHasReachedBottom(true);
          onScrolledToBottom();
        }
      },
      { threshold: 1.0 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasReachedBottom, onScrolledToBottom]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cession Agreement</CardTitle>
          {hasReachedBottom && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Scrolled to bottom</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Please scroll through and read all terms carefully before signing
        </p>
      </CardHeader>
      <CardContent>
        <div 
          ref={contentRef}
          className="max-h-[400px] overflow-y-auto border rounded-lg p-6 space-y-4 prose prose-sm max-w-none"
        >
          <h2 className="text-2xl font-bold mb-6">Carbon Right Cessionary Agreement</h2>
          
          <div className="space-y-6">
            <section>
              <h3 className="font-semibold mb-2">Between:</h3>
              <div className="space-y-4 ml-4">
                <div>
                  <p className="font-semibold">{ownerName}</p>
                  <p className="text-sm">the owner of solar photovoltaic power systems ("the owner")</p>
                  {registrationNumber !== "Not Applicable" && <p className="text-sm">with Registration No. {registrationNumber}</p>}
                  <p className="text-sm">Incorporated in South Africa with Registered Offices at {companyAddress}</p>
                  <p className="text-sm">and email: {ownerEmail}</p>
                </div>
                <p className="text-center font-semibold">AND</p>
                <div>
                  <p className="font-semibold">Crunch Carbon Pty (Ltd)</p>
                  <p className="text-sm">with Registration 2019/54306/07</p>
                  <p className="text-sm">acting as aggregator on behalf of Carbon Disclosure South Africa (Pty) Ltd</p>
                  <p className="text-sm">with Registration number: 2009/023392/07 (hereinafter referred to as "CDSA")</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2">PREAMBLE</h3>
              <div className="space-y-2 text-sm">
                <p><strong>1.1</strong> Whereas CDSA possesses the specialized Intellectual Property essential for the commercialization of potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction, stemming from solar photovoltaic power systems, coupled with an in-depth technical comprehension of carbon markets.</p>
                <p><strong>1.2</strong> And whereas the aforementioned program has received official recognition from one or more carbon credit standards, meeting requisite standards, and pursuant to said program, CDSA has been formally listed as an account holder in the Verra Registry as one of the carbon credits standards.</p>
                <p><strong>1.3</strong> And whereas the Owner holds ownership rights to any environmental benefit or greenhouse gas (GHG) reduction benefit emanating from its solar photovoltaic power systems, should this be included as part of the info shown to the client.</p>
                <p><strong>1.4</strong> And whereas the Parties record that this agreement is incorporated in the operational framework between Crunch Carbon and CDSA ("Crunch Carbon's framework with Carbon Disclosure South Africa (CDSA)"), concluded between the Aggregator and CDSA.</p>
                <p><strong>1.5</strong> And whereas the Aggregator and CDSA have mutually agreed, as stipulated in Crunch Carbon's framework with Carbon Disclosure South Africa (CDSA), to leverage CDSA's Intellectual Property Rights for their mutual benefit by pursuing potential environmental benefits, including, but not limited to, greenhouse gas (GHG) reduction from the Owner's solar photovoltaic power systems, through initiatives, including, but not limited to engaging in the commercialization of carbon credits derived from the aforementioned potential benefits, to yield potential additional revenue ("Project").</p>
                <p><strong>1.6</strong> And whereas the Owner holds the sole legal right to cede/assign any potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction originating from its Solar Photovoltaic Power Systems, which Solar Photovoltaic Power Systems is located at the following address(ses) as indicated on the electronic Portal.</p>
                <p><strong>1.7</strong> And whereas it is imperative for the Owner to transfer and assign its rights related to any potential environmental benefits, specifically including but not limited to greenhouse gas (GHG) reductions resulting from its Solar Photovoltaic Power Systems, and additionally to furnish Crunch Carbon on behalf of CDSA with all data sets, documents, records, forms, and any other relevant information in respect of the Owner's Solar Photovoltaic Power Systems necessary for the development of carbon credits, to facilitate the achievement of The Project.</p>
                <p><strong>1.8</strong> And whereas the Aggregator in terms of Crunch Carbon's framework with Carbon Disclosure South Africa (CDSA) is responsible for facilitating the ceding process of said rights and sourcing the required data from the Owner to CDSA;</p>
              </div>
              <p className="font-semibold mt-4">Now Therefore, it is agreed as follows:</p>
            </section>

            <section>
              <h4 className="font-semibold mb-2">2. INTERPRETATION AND PRELIMINARY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>2.1</strong> The headings of the clauses in this agreement are for the purpose of convenience and reference only and shall not be used in the interpretation of, nor modify, nor amplify the terms of this agreement nor any clause hereof, unless the contrary intention clearly appears,</p>
                <p><strong>2.2</strong> Words importing</p>
                <p className="ml-4"><strong>2.2.1</strong> any one gender includes the other two genders.</p>
                <p className="ml-4"><strong>2.2.2</strong> the singular includes the plural and vice versa; and</p>
                <p className="ml-4"><strong>2.2.3</strong> natural persons include created entities (corporate and non-corporate) and vice versa.</p>
                <p><strong>2.3</strong> If any provision in the preamble or within a definition is a substantive provision conferring rights or imposing obligations on any party, notwithstanding that it is contained in the preamble or the definition clause, effect shall be given to it as if it were a substantive provision in the body of this agreement.</p>
                <p><strong>2.4</strong> This agreement shall be governed, interpreted and enforced in accordance with the laws of the Republic of South Africa from time to time.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">3. DEFINITIONS</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p className="mb-2">Unless otherwise determined by the context, the following words will bear the meanings set forth against them:</p>
                <p><strong>3.1</strong> "CDSA" means Carbon Disclosure South Africa (Pty) Ltd;</p>
                <p><strong>3.2</strong> "The Owner" referring to {ownerName}, the owner of the Solar Photovoltaic Power Systems as per this Cession Agreement;</p>
                <p><strong>3.3</strong> "The Aggregator" means the Party responsible, in this instance Crunch Carbon, for facilitating the ceding process of the Owner's rights to any environmental benefit or greenhouse gas (GHG) reduction benefit emanating from the Owner's solar photovoltaic power systems rights and the sourcing of the required data as per the guideline provided by CDSA, from the Owner to CDSA;</p>
                <p><strong>3.4</strong> "the Parties" means Carbon Disclosure South Africa (Pty) Ltd and (the Owner) as per the signed agreement;</p>
                <p><strong>3.5</strong> "this agreement" means this Cession Agreement contained in this document;</p>
                <p><strong>3.6</strong> the Aggregator and CDSA;</p>
                <p><strong>3.7</strong> "including" (or words of similar meaning) means to include without limitation, and if the expression is used with reference to specific examples the "eiusdem generis" rule shall not apply;</p>
                <p><strong>3.8</strong> "law" means any law of general application and includes the common law and any statute, constitution, decree, treaty, regulation, directive, ordinance, by-law, order or any other enactment of legislative measure of government (including local and provincial government) statutory or regulatory body which has the force of law;</p>
                <p><strong>3.9</strong> "person/individual" means any person, company, close corporation, trust, partnership or other entity whether or not having separate legal personality;</p>
                <p><strong>3.10</strong> "signature date" means (or words of similar meaning) in relation to this agreement means the date on which this agreement is executed by the party signing it last in chronological order, thereby constituting the date on which this agreement is formally concluded.</p>
                <p><strong>3.11</strong> "day" means a day which is not a Saturday, Sunday or official public holiday in the Republic of South Africa;</p>
                <p><strong>3.12</strong> "Property" includes Movable, Immovable and Intellectual Property;</p>
                <p><strong>3.13</strong> "Intellectual Property" means:</p>
                <p className="ml-4"><strong>3.13.1</strong> Business Model;</p>
                <p className="ml-4"><strong>3.13.2</strong> Data;</p>
                <p className="ml-4"><strong>3.13.3</strong> Knowledge;</p>
                <p className="ml-4"><strong>3.13.4</strong> Copyright or Patent (if any); and</p>
                <p className="ml-4"><strong>3.13.5</strong> Inventions (if any); which relates to and is the property which is currently and henceforth the property of CDSA, which also includes all improvements, and extensions, to the Intellectual Property;</p>
                <p><strong>3.14</strong> "Knowledge" means all confidential information of whatever nature relating to the Intellectual Property and its exploitation including the technical information, techniques, business model, revenue-related data, processes, marketing and business information generally;</p>
                <p><strong>3.15</strong> "Data" means all forms of information, inclusive of but not limited to data sets, documents, records, forms, and any other relevant materials for the purpose of developing carbon credits. This includes, without limitation, data pertaining to emissions reductions, carbon offset projects, methodologies, monitoring protocols, and any additional particulars specified within the provided guideline of Crunch Carbon's framework with Carbon Disclosure South Africa (CDSA);</p>
                <p><strong>3.16</strong> "Confidential Information" means any and all Data and Knowledge, as defined above, required for the development of carbon credits, which is designated as confidential or which a reasonable person would understand to be confidential given the nature of this Agreement;</p>
                <p><strong>3.17</strong> "Carbon Offset" signifies a certified reduction in emissions of Greenhouse Gases, resulting from a project activity, measured in tonnes of carbon dioxide-equivalent (tCO₂e), where one Carbon Offset represents the reduction of one tonne of carbon dioxide-equivalent emitted into the atmosphere;</p>
                <p><strong>3.18</strong> "Carbon Credit" see "Carbon Offset"</p>
                <p><strong>3.19</strong> "Greenhouse Gas (GHG)" comprises gases that trap heat in the atmosphere, including but not limited to carbon dioxide (CO₂), methane (CH₄), and nitrous oxide (N₂O);</p>
                <p><strong>3.20</strong> "Premises" refer to the addresses where the Carbon Offsets from dispersed electricity generated by Solar Photovoltaic Power Systems are generated and/or consumed.</p>
                <p><strong>3.21</strong> "Project" entails Crunch Carbon on behalf of CDSA developing, obtaining, and commercializing Carbon Credits derived from any potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction, stemming from the Owner's Solar Photovoltaic Power Systems;</p>
                <p><strong>3.22</strong> "Project Activity" denotes the specific set of technologies, measures, and/or outcomes specified in a methodology applied to the Project, altering the conditions identified in the Baseline Scenario and resulting in GHG emission reductions or removals;</p>
                <p><strong>3.23</strong> "Registry" represents the platform of the Carbon Offset Standard that records Carbon Offset Projects and facilitates the transfer of Carbon Offsets between Accounts;</p>
                <p><strong>3.24</strong> "Site visit" encompasses any physical inspection of the installed Units, including interviews with any Stakeholder identified by an independent validation and verification body (VVB) or dually authorized auditor;</p>
                <p><strong>3.25</strong> "Unit" refers to the Owner's Solar Photovoltaic Power System(s);</p>
                <p><strong>3.26</strong> "VVB" represents an accredited independent validation and verification body tasked with the independent validation of the Project and/or the independent verification of the quantity of Greenhouse Gas emissions reduced.</p>
                <p><strong>3.27</strong> "Platform" means the Crunch Carbon digital portal, system, website or application through which Owners or their authorised Agents provide, upload or maintain information relating to their Units. The Platform shall serve as the authoritative, complete and binding record of all Unit(s) and Premise(s) subject to this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">4. CESSION OF RIGHTS</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>4.1</strong> The Owner hereby cedes, assigns, and transfers to CDSA all rights, title, and interest in and to any potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction, arising from the Owner's Solar Photovoltaic Power Systems.</p>
                <p><strong>4.2</strong> The cession includes all rights to develop, register, verify, and commercialize Carbon Credits derived from the aforementioned environmental benefits.</p>
                <p><strong>4.3</strong> The Owner warrants that it has the full legal right and authority to cede these rights and that such rights are free from any encumbrances or third-party claims.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">5. OBLIGATIONS OF THE OWNER</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>5.1</strong> The Owner shall provide Crunch Carbon on behalf of CDSA with all necessary Data, documents, records, and information required for the development of Carbon Credits.</p>
                <p><strong>5.2</strong> The Owner shall grant reasonable access to the Premises for Site visits by VVBs or authorized auditors.</p>
                <p><strong>5.3</strong> The Owner shall maintain the Solar Photovoltaic Power Systems in good working order and notify CDSA of any material changes or decommissioning.</p>
                <p><strong>5.4</strong> The Owner shall cooperate fully with CDSA and the Aggregator in all matters relating to the Project.</p>
                <p><strong>5.5</strong> The Owner shall provide, update and maintain accurate information regarding all Units and Premises through the Platform. Any Unit or Premise not recorded on the Platform shall be deemed excluded from this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">6. OBLIGATIONS OF CDSA</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>6.1</strong> CDSA shall use its Intellectual Property and expertise to develop, register, and commercialize Carbon Credits from the Owner's Solar Photovoltaic Power Systems.</p>
                <p><strong>6.2</strong> CDSA shall keep the Owner informed of significant developments in the Project.</p>
                <p><strong>6.3</strong> CDSA shall distribute revenue from the sale of Carbon Credits in accordance with the revenue-sharing arrangement specified in this agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">7. REVENUE SHARING</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>7.1</strong> The net revenue from the sale of Carbon Credits shall be shared as follows:</p>
                <p className="ml-4"><strong>7.1.1</strong> {ownerPercentage}% to the Owner</p>
                <p className="ml-4"><strong>7.1.2</strong> The remainder to CDSA and the Aggregator as per their separate agreement</p>
                <p><strong>7.2</strong> "Net revenue" means the gross proceeds from Carbon Credit sales less any direct costs incurred in the development, verification, registration, and sale of such credits.</p>
                <p><strong>7.3</strong> Payments to the Owner shall be made within 60 days of receipt of funds by CDSA from Carbon Credit sales.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">8. CONFIDENTIALITY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>8.1</strong> All Parties agree to maintain the confidentiality of Confidential Information disclosed in connection with this agreement.</p>
                <p><strong>8.2</strong> This obligation shall not apply to information that:</p>
                <p className="ml-4"><strong>8.2.1</strong> is or becomes publicly available through no breach of this agreement;</p>
                <p className="ml-4"><strong>8.2.2</strong> is required to be disclosed by law or regulatory authority; or</p>
                <p className="ml-4"><strong>8.2.3</strong> is independently developed without reference to the Confidential Information.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">9. TERM AND TERMINATION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>9.1</strong> This agreement shall commence on the signature date and continue for a period of 10 years.</p>
                <p><strong>9.2</strong> This agreement may be terminated earlier by mutual written consent of the Parties.</p>
                <p><strong>9.3</strong> Upon termination, the rights ceded under this agreement shall revert to the Owner, subject to CDSA's right to complete any ongoing Carbon Credit development and sales processes.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">10. INTELLECTUAL PROPERTY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>10.1</strong> All Intellectual Property used in the Project remains the exclusive property of CDSA.</p>
                <p><strong>10.2</strong> The Owner acknowledges that it acquires no rights to CDSA's Intellectual Property through this agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">11. WARRANTIES AND REPRESENTATIONS</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>11.1</strong> Each Party warrants that:</p>
                <p className="ml-4"><strong>11.1.1</strong> it has the legal capacity and authority to enter into this agreement;</p>
                <p className="ml-4"><strong>11.1.2</strong> this agreement constitutes valid and binding obligations; and</p>
                <p className="ml-4"><strong>11.1.3</strong> it will comply with all applicable laws in performing its obligations.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">12. LIMITATION OF LIABILITY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>12.1</strong> Neither Party shall be liable for indirect, consequential, or punitive damages arising from this agreement.</p>
                <p><strong>12.2</strong> CDSA does not guarantee any specific revenue or number of Carbon Credits to be generated.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">13. DISPUTE RESOLUTION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>13.1</strong> Any dispute arising from this agreement shall first be attempted to be resolved through good faith negotiations.</p>
                <p><strong>13.2</strong> If negotiations fail, the dispute shall be referred to mediation before resorting to litigation.</p>
                <p><strong>13.3</strong> This agreement shall be governed by the laws of the Republic of South Africa.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">14. GENERAL PROVISIONS</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>14.1</strong> This agreement constitutes the entire agreement between the Parties and supersedes all prior agreements or understandings.</p>
                <p><strong>14.2</strong> No amendment to this agreement shall be valid unless in writing and signed by all Parties.</p>
                <p><strong>14.3</strong> No Party may cede or assign its rights or obligations under this agreement without the prior written consent of the other Parties.</p>
                <p><strong>14.4</strong> If any provision of this agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">15. NOTICES</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>15.1</strong> Any notice required under this agreement shall be in writing and delivered to:</p>
                <p className="ml-4"><strong>For the Owner:</strong></p>
                <p className="ml-6">{ownerName}</p>
                <p className="ml-6">{companyAddress}</p>
                <p className="ml-6">Email: {ownerEmail}</p>
                <p className="ml-4 mt-2"><strong>For CDSA:</strong></p>
                <p className="ml-6">Carbon Disclosure South Africa (Pty) Ltd</p>
                <p className="ml-6">Email: info@carbondisclosure.co.za</p>
              </div>
            </section>

            <div className="mt-8 pt-4 border-t">
              <p className="text-sm font-semibold">By signing below, the Parties acknowledge that they have read, understood, and agree to be bound by the terms of this Cession Agreement.</p>
              <p className="text-sm mt-4">Signed at _________________ on this {signingDate}</p>
            </div>
            
            <div ref={sentinelRef} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
