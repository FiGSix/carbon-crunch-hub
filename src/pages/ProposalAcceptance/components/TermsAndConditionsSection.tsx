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
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    return "[Installation Date]";
  };
  
  const getSigningDate = () => {
    const date = new Date();
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  const signingLocation = "South Africa";
  const installationDate = getInstallationDate();
  const signingDate = getSigningDate();
  
  // Calculate revenue share percentages
  const clientSharePercentage = proposal?.client_share_percentage || 0;
  const cessionaryPercentage = (100 - clientSharePercentage).toFixed(1);
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
                  <p className="font-semibold">Crunch Carbon Pty (Ltd)</p>
                  <p className="text-sm">Registration Number: 2019/54306/07</p>
                  <p className="text-sm">acting as aggregator on behalf of Carbon Disclosure South Africa (Pty) Ltd (CDSA)</p>
                  <p className="text-sm">CDSA Registration Number: 2009/023392/07</p>
                  <p className="text-sm">Address: 4 Sandown Valley Crescent, Sandown, Sandton, 2031</p>
                  <p className="text-sm mt-2">(the <strong>"Aggregator"</strong> or <strong>"Crunch Carbon"</strong>)</p>
                </div>
                <p className="text-center font-semibold">And</p>
                <div>
                  <p className="font-semibold">{ownerName}</p>
                  {registrationNumber !== "Not Applicable" && <p className="text-sm">Registration Number: {registrationNumber}</p>}
                  <p className="text-sm">Address: {companyAddress}</p>
                  <p className="text-sm">Email: {ownerEmail}</p>
                  <p className="text-sm mt-2">(the <strong>"Owner"</strong>)</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2">PREAMBLE</h3>
              <div className="space-y-2 text-sm">
                <p><strong>1.1</strong> CDSA has developed specialized Intellectual Property for the purposes of commercializing Carbon Credits generated from solar PV installations for the purposes of implementing carbon offset programmes.</p>
                <p><strong>1.2</strong> CDSA's program for the commercialisation of Carbon Credits is officially recognized under the Verified Carbon Standard (VCS) and is registered on the Verra Registry under programme ID #3945.</p>
                <p><strong>1.3</strong> The Owner is the legal owner of the environmental benefits that accrue from the generation of electricity from its solar photovoltaic installation located on the Premises.</p>
                <p><strong>1.4</strong> Simultaneously, with this Agreement, the Parties have entered into, or will enter into a Memorandum of Agreement.</p>
                <p><strong>1.5</strong> The Parties have agreed to work together with the aim of leveraging CDSA's Intellectual Property to commercialize the environmental benefits of the Owner's installation(s).</p>
                <p><strong>1.6</strong> The Owner is the sole party entitled to cede the environmental benefits and has decided to cede such environmental benefits to Crunch Carbon on behalf of CDSA.</p>
                <p><strong>1.7</strong> The Owner has an obligation to provide accurate Data for the purposes of commercializing carbon credits, and further, the Owner has the right to receive a percentage of the revenue derived from the sale of such commercialized carbon credits.</p>
                <p><strong>1.8</strong> The Aggregator has an obligation to facilitate the commercialization of the carbon credits through the services of CDSA.</p>
              </div>
              <p className="font-semibold mt-4">Now Therefore, it is agreed as follows:</p>
            </section>

            <section>
              <h4 className="font-semibold mb-2">2. INTERPRETATION AND PRELIMINARY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>2.1</strong> The headings to the clauses to this Agreement are inserted for reference purposes only and shall in no way govern or affect the interpretation of, or be taken into consideration in interpreting, any of the terms and conditions of this Agreement.</p>
                <p><strong>2.2</strong> Unless inconsistent with the context, an expression which denotes any gender includes the other genders, a natural person includes an artificial person and vice versa, and the singular includes the plural and vice versa.</p>
                <p><strong>2.3</strong> Where any term is defined within a particular clause other than this clause, that term shall bear the meaning ascribed to it in that clause wherever it is used in this Agreement.</p>
                <p><strong>2.4</strong> This Agreement shall in all respects be governed by, interpreted and construed in accordance with the law of the Republic of South Africa.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">3. DEFINITIONS</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>3.1 "Aggregator"</strong> means Crunch Carbon (Pty) Ltd, a company duly incorporated in accordance with the company laws of South Africa, with registration number 2019/54306/07.</p>
                <p><strong>3.2 "Agreement"</strong> means this Carbon Right Cessionary Agreement including all annexures and schedules.</p>
                <p><strong>3.3 "Carbon Credit"</strong> means one (1) tonne (metric ton) of carbon dioxide equivalent (CO2e) GHG emission reductions or removals.</p>
                <p><strong>3.4 "Carbon Offset"</strong> means an instrument representing the reduction, avoidance or sequestration of one metric tonne of carbon dioxide or carbon dioxide equivalent greenhouse gases.</p>
                <p><strong>3.5 "CDSA"</strong> means Carbon Disclosure South Africa (Pty) Ltd, a company duly incorporated in accordance with the company laws of South Africa, with registration number 2009/023392/07.</p>
                <p><strong>3.6 "Confidential Information"</strong> means all information of a confidential or proprietary nature (whether or not specifically identified as confidential), in any form or medium, that is disclosed or made available by a Party, directly or indirectly, to the other Party.</p>
                <p><strong>3.7 "Data"</strong> means the information relating to the actual operation of the Project, particularly electricity consumption or generation data, depending on the scope of the Project, that is used for the purposes of generating and commercializing Carbon Credits, and includes such Data that is generated and collected prior to the Signature Date of this Agreement.</p>
                <p><strong>3.8 "Day"</strong> means any day other than a Saturday, Sunday or official public holiday in the Republic of South Africa.</p>
                <p><strong>3.9 "GHG"</strong> means the basket of six greenhouse gases listed in Annex A to the Kyoto Protocol: carbon dioxide (CO2), methane (CH4), nitrous oxide (N2O), hydrofluorocarbons (HFCs), perfluorocarbons (PFCs), and sulphur hexafluoride (SF6).</p>
                <p><strong>3.10 "Installation date"</strong> means {installationDate}.</p>
                <p><strong>3.11 "Knowledge"</strong> means the actual knowledge of the directors or executives or senior manager of such Party.</p>
                <p><strong>3.12 "Law"</strong> means any applicable statute, regulation, by-law, ordinance or subordinate legislation in force from time to time, and will include any applicable industry code, policy or standard enforceable by law, any applicable direction, policy, rule or order that is made or given by any regulatory body, governmental department, governmental, inter-governmental or supranational body, agency, department or regulatory, self-regulatory or other authority or organisation and that is made or given under any statute, regulation, by-law, ordinance or subordinate legislation (or under any such industry code, policy or standard), and any applicable judgment or order of any court of law.</p>
                <p><strong>3.13 "Intellectual Property"</strong> means all intellectual property developed by or for CDSA and includes:</p>
                <p className="ml-4"><strong>3.13.1</strong> methodologies (including the methodology approved by Verra);</p>
                <p className="ml-4"><strong>3.13.2</strong> tools and calculation methods including baselines and assumptions;</p>
                <p className="ml-4"><strong>3.13.3</strong> reports and disclosures;</p>
                <p className="ml-4"><strong>3.13.4</strong> procedures and processes;</p>
                <p className="ml-4"><strong>3.13.5</strong> systems and software;</p>
                <p className="ml-4"><strong>3.13.6</strong> all data, formulas, know-how and ideas;</p>
                <p className="ml-4"><strong>3.13.7</strong> all trademarks and copyright; and</p>
                <p className="ml-4"><strong>3.13.8</strong> any other information that can be connected to CDSA's carbon offset programme.</p>
                <p><strong>3.14 "Owner"</strong> means {ownerName}.</p>
                <p><strong>3.15 "Parties"</strong> means the Aggregator and the Owner, jointly; and Party means either one of them.</p>
                <p><strong>3.16 "Person"</strong> means any natural or juristic person and includes any trust, association, partnership or other entity.</p>
                <p><strong>3.17 "Premises"</strong> means the property located at {premisesAddress}.</p>
                <p><strong>3.18 "Project"</strong> means solar photovoltaic installation(s) owned by the Owner and located on the Premises.</p>
                <p><strong>3.19 "Project Activity"</strong> means the generation of electricity from grid-connected solar photovoltaic systems that constitutes the activity undertaken by the Project that generates GHG emission reductions or removals.</p>
                <p><strong>3.20 "Registry"</strong> means Verra Registry or any other internationally recognized carbon credit registry approved by the Parties.</p>
                <p><strong>3.21 "Signature Date"</strong> means {signingDate}.</p>
                <p><strong>3.22 "Site visit"</strong> means a physical visit to the Premises by a representative of CDSA or Crunch Carbon or a VVB.</p>
                <p><strong>3.23 "Unit"</strong> means a Verified Carbon Unit (VCU) issued by Verra or equivalent unit issued by another Registry.</p>
                <p><strong>3.24 "VVB"</strong> means an accredited Validation and Verification Body approved by Verra or other relevant Registry to validate and verify carbon credit projects.</p>
                <p><strong>3.25</strong> Any reference to an enactment is to that enactment as at the Signature Date and as amended or re-enacted from time to time.</p>
                <p><strong>3.26</strong> References to clauses are to clauses of this Agreement unless otherwise stated.</p>
                <p><strong>3.27</strong> Any phrase introduced by the terms "including", "include", "in particular" or any similar expression shall be construed as illustrative and shall not limit the sense of the words preceding those terms.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">4. NATURE OF AGREEMENT AND OBLIGATIONS OF THE OWNER</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>4.1</strong> The Owner acknowledges that by entering into the Agreement, it agrees to participate in the programme and to be bound by the programme requirements as developed and managed by CDSA.</p>
                <p><strong>4.2</strong> Specifically, the Owner acknowledges and agrees that wherever this Agreement refers to the definitions as contained in clause 3, such definitions correspond to the definitions contained in the methodology and programme.</p>
                <p><strong>4.3</strong> The Owner has the right to request information relating to the programme from Crunch Carbon or CDSA and Crunch Carbon or CDSA will use its reasonable endeavours to address any query relating to the programme within a reasonable timeframe.</p>
                <p><strong>4.4</strong> The Owner acknowledges and agrees that it has the following responsibilities:</p>
                <p className="ml-4"><strong>4.4.1</strong> to provide Data to Crunch Carbon or CDSA for the purposes of generating and commercializing Carbon Credits;</p>
                <p className="ml-4"><strong>4.4.2</strong> to afford CDSA, Crunch Carbon or a VVB reasonable access to the Premises and systems for the purposes of Site visits or audits required for the programme;</p>
                <p className="ml-4"><strong>4.4.3</strong> that the Data the Owner provides to Crunch Carbon or CDSA is used exclusively by CDSA for the purposes of commercializing the Carbon Credits in accordance with this Agreement and the methodology and programme;</p>
                <p className="ml-4"><strong>4.4.4</strong> to cede, for the benefit of CDSA, the rights to the environmental benefits associated with the Project Activity to CDSA as set out in this Agreement; and</p>
                <p className="ml-4"><strong>4.4.5</strong> not to disclose CDSA's Intellectual Property to any third party or to use such Intellectual Property for the Owner's own benefit or the benefit of any third party.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">5. CESSION OF RIGHTS TO CDSA</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>5.1</strong> Subject to and in accordance with the provisions of this Agreement, the Owner hereby irrevocably and unconditionally cedes, assigns, delegates and makes over to Crunch Carbon on behalf of CDSA all of its right, title, interest and benefit (both present and future) in and to the rights to the environmental benefits that accrue from the Project Activity.</p>
                <p><strong>5.2</strong> The transfer of the rights contemplated in this clause shall be effective from the Installation date.</p>
                <p><strong>5.3</strong> Notwithstanding any termination of this Agreement, the Intellectual Property of CDSA will endure beyond such termination.</p>
                <p><strong>5.4</strong> Notwithstanding clause 5.3, the Owner's rights to revenue will terminate upon termination of this Agreement.</p>
                <p><strong>5.5</strong> In the event that the Owner intends to sell the Premises, the Owner shall provide Crunch Carbon or CDSA with at least 30 (thirty) Days' written notice prior to such sale.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">6. REPRESENTATIONS AND WARRANTIES</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>6.1</strong> The Owner represents and warrants to CDSA and Crunch Carbon that:</p>
                <p className="ml-4"><strong>6.1.1</strong> it has full power and authority to enter into and perform its obligations under this Agreement;</p>
                <p className="ml-4"><strong>6.1.2</strong> it is the lawful owner of the Project and the environmental benefits that accrue from the Project Activity;</p>
                <p className="ml-4"><strong>6.1.3</strong> the environmental benefits are free from any encumbrances, liens, charges or other third-party rights;</p>
                <p className="ml-4"><strong>6.1.4</strong> the cession of rights contemplated in this Agreement does not and will not violate any Law or agreement to which the Owner is a party;</p>
                <p className="ml-4"><strong>6.1.5</strong> it has not previously ceded, sold, transferred or otherwise disposed of the environmental benefits to any other person; and</p>
                <p className="ml-4"><strong>6.1.6</strong> to the best of its Knowledge, it has not received any subsidy or other financial support from any governmental or quasi-governmental entity specifically for the environmental benefits that would prohibit the commercialization of Carbon Credits from the Project Activity.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">7. INDEMNITY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>7.1</strong> The Owner indemnifies and holds harmless Crunch Carbon on behalf of CDSA, its directors, officers, employees, and agents against any and all claims, losses, damages, liabilities, costs and expenses (including reasonable legal fees) arising out of or in connection with any breach by the Owner of its representations, warranties or obligations under this Agreement.</p>
                <p><strong>7.2</strong> [Reserved]</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">8. ACKNOWLEDGEMENT AND ACCEPTANCE</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p>CDSA acknowledges and accepts the cession of the rights to the environmental benefits in terms of clause 5 and assumes all rights and obligations of the cessionary under this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">9. PROTECTION OF CRUNCH CARBON AND CDSA'S INTELLECTUAL PROPERTY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>9.1</strong> The Owner acknowledges that all Intellectual Property used in connection with the commercialization of the Carbon Credits belongs to and shall remain the property of CDSA and is confidential and proprietary to CDSA.</p>
                <p><strong>9.2</strong> The Owner acknowledges that it may have access to certain Intellectual Property for the limited purpose of participating in the programme and that such access does not confer any ownership rights in the Intellectual Property.</p>
                <p><strong>9.3</strong> The Owner undertakes not to disclose any Intellectual Property to any third party without the prior written consent of CDSA and to use the Intellectual Property solely for the purpose of participating in the programme.</p>
                <p><strong>9.4</strong> Nothing in this Agreement shall be construed as conferring any license or right to use the Intellectual Property for any purpose other than as expressly provided in this Agreement.</p>
                <p><strong>9.5</strong> The Owner warrants that:</p>
                <p className="ml-4"><strong>9.5.1</strong> it will not infringe CDSA's Intellectual Property and specifically:</p>
                <p className="ml-8"><strong>9.5.1.1</strong> it will not copy, reproduce, distribute, modify, or create derivative works of the Intellectual Property;</p>
                <p className="ml-8"><strong>9.5.1.2</strong> it will not reverse engineer, decompile, or disassemble any software that forms part of the Intellectual Property;</p>
                <p className="ml-8"><strong>9.5.1.3</strong> it will not remove, alter, or obscure any copyright, trademark, or other proprietary rights notices from the Intellectual Property;</p>
                <p className="ml-8"><strong>9.5.1.4</strong> it will not use the Intellectual Property to develop competing products or services; and</p>
                <p className="ml-8"><strong>9.5.1.5</strong> it will not:</p>
                <p className="ml-12"><strong>9.5.1.5.1</strong> sell, rent, lease, sublicense, or transfer the Intellectual Property to any third party; and</p>
                <p className="ml-12"><strong>9.5.1.5.2</strong> use the Intellectual Property for any unlawful purpose or in any manner inconsistent with this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">10. REVENUE, MONETARY ARRANGEMENTS, AND RELATED RESPONSIBILITIES</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>10.1</strong> CDSA shall:</p>
                <p className="ml-4"><strong>10.1.1</strong> establish and maintain an account with the Registry for the issuance and holding of Carbon Credits generated from the Project;</p>
                <p className="ml-4"><strong>10.1.2</strong> be responsible for all costs associated with establishing and maintaining the Registry account;</p>
                <p className="ml-4"><strong>10.1.3</strong> be responsible for all fees charged by VVBs for validation and verification services and any audit fees;</p>
                <p className="ml-4"><strong>10.1.4</strong> coordinate the sale of Carbon Credits and actively seek buyers;</p>
                <p className="ml-4"><strong>10.1.5</strong> have sole discretion in selecting buyers and negotiating sale terms, provided that CDSA acts in good faith and with reasonable commercial judgment;</p>
                <p className="ml-4"><strong>10.1.6</strong> distribute revenue from Carbon Credit sales, with the Owner entitled to receive {ownerPercentage}% of the gross revenue received from the sale of Carbon Credits; and</p>
                <p className="ml-4"><strong>10.1.7</strong> transfer the Owner's share of revenue on a periodic basis as Carbon Credits are sold and payment is received, typically within 30 (thirty) Days of receipt of payment from buyers.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">11. INCORPORATION OF THIS AGREEMENT INTO THE PROVISIONS OF THE AGREEMENT</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>11.1</strong> This Agreement forms an integral part of the main agreement between the Parties, and all subsequent amendments to that agreement shall be deemed to be incorporated into this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">12. TERMINATION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>12.1</strong> This Agreement may be terminated by mutual consent of the Parties, provided that:</p>
                <p className="ml-4"><strong>12.1.1</strong> either Party may terminate this Agreement by giving the other Party not less than 30 (thirty) Days' prior written notice;</p>
                <p className="ml-4"><strong>12.1.2</strong> the termination of this Agreement shall be triggered by the termination of the extraction of Data from the Project;</p>
                <p className="ml-4"><strong>12.1.3</strong> upon termination, the Owner shall be responsible for requesting removal of the Project from CDSA's GHG register;</p>
                <p className="ml-4"><strong>12.1.4</strong> either Party may terminate this Agreement if the other Party commits a material breach of this Agreement;</p>
                <p className="ml-4"><strong>12.1.5</strong> the Party in breach shall have 14 (fourteen) Days from the date of receipt of written notice to remedy the breach, failing which:</p>
                <p className="ml-8"><strong>12.1.5.1</strong> the aggrieved Party shall be entitled to claim specific performance or cancel this Agreement and claim damages; and</p>
                <p className="ml-8"><strong>12.1.5.2</strong> either Party may terminate this Agreement immediately if the other Party becomes insolvent, enters into liquidation (whether voluntary or compulsory), or enters into any compromise or arrangement with creditors.</p>
                <p><strong>12.2</strong> Termination of this Agreement shall not affect any rights or obligations that have accrued prior to the date of termination.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">13. DISPUTE RESOLUTION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>13.1</strong> In the event of any dispute arising out of or in connection with this Agreement, the Parties shall first attempt to resolve the dispute through mediation, and if mediation is unsuccessful, the dispute shall be referred to arbitration in accordance with clause 14.</p>
                <p><strong>13.2</strong> Nothing in this clause shall prevent either Party from seeking urgent interim relief from a court of competent jurisdiction.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">14. ARBITRATION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>14.1</strong> Any dispute which has not been resolved in terms of clause 13 shall be submitted to arbitration.</p>
                <p><strong>14.2</strong> The arbitration shall be conducted in accordance with the provisions of the Arbitration Act, 1965, and shall be held within 21 (twenty-one) Days of the dispute being referred to arbitration.</p>
                <p><strong>14.3</strong> The arbitrator shall be a person with expertise in accounting, legal matters, or such other field as may be appropriate to the dispute.</p>
                <p><strong>14.4</strong> If the Parties fail to agree on the appointment of an arbitrator within 7 (seven) Days of the dispute being referred to arbitration, the arbitrator shall be appointed by the Chairperson of the relevant Provincial Attorneys' Association.</p>
                <p><strong>14.5</strong> [Reserved]</p>
                <p><strong>14.6</strong> The decision of the arbitrator shall be final and binding on the Parties.</p>
                <p><strong>14.7</strong> The provisions of this clause shall not prevent either Party from obtaining urgent interim relief from a court of competent jurisdiction pending the outcome of the arbitration.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">15. FORCE MAJEURE</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>15.1</strong> Neither Party shall be liable to the other for any delay or failure to perform any of its obligations under this Agreement to the extent that such delay or failure is caused by an event of force majeure, provided that:</p>
                <p className="ml-4"><strong>15.1.1</strong> the event is beyond the reasonable control of the affected Party;</p>
                <p className="ml-4"><strong>15.1.2</strong> the affected Party could not have avoided the event by taking reasonable precautions; and</p>
                <p className="ml-4"><strong>15.1.3</strong> the affected Party has taken all reasonable steps to mitigate the effects of the event.</p>
                <p><strong>15.2</strong> Events of force majeure include, but are not limited to:</p>
                <p className="ml-4"><strong>15.2.1</strong> war, invasion, act of foreign enemies, hostilities, civil war, rebellion, revolution, insurrection, or military or usurped power;</p>
                <p className="ml-4"><strong>15.2.2</strong> natural disasters such as earthquakes, floods, storms, or other acts of God;</p>
                <p className="ml-4"><strong>15.2.3</strong> explosions, fires, or destruction of equipment;</p>
                <p className="ml-4"><strong>15.2.4</strong> strikes, lockouts, or other industrial action; and</p>
                <p className="ml-4"><strong>15.2.5</strong> any act or omission of any governmental or other authority.</p>
                <p><strong>15.3</strong> If an event of force majeure continues for a period exceeding 30 (thirty) Days, either Party may terminate this Agreement by giving written notice to the other Party, and such termination shall take effect from the date of commencement of the event of force majeure.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">16. DOMICILIUM CITANDI ET EXECUTANDI AND NOTICES</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>16.1</strong> The Parties choose as their domicilium citandi et executandi for all purposes under this Agreement the following addresses:</p>
                <div className="ml-4 mt-2 space-y-2">
                  <div>
                    <p className="font-semibold">Owner:</p>
                    <p className="ml-4">Physical address: {companyAddress}</p>
                    <p className="ml-4">Email: {ownerEmail}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Crunch Carbon on behalf of CDSA:</p>
                    <p className="ml-4">Physical address: 4 Sandown Valley Crescent, Sandown, Sandton, 2031</p>
                    <p className="ml-4">Email: info@crunchcarbon.com</p>
                  </div>
                </div>
                <p><strong>16.2</strong> Any notice or communication required or permitted to be given in terms of this Agreement shall be valid and effective only if in writing and:</p>
                <p className="ml-4"><strong>16.2.1</strong> delivered by hand, in which case it shall be deemed to have been received on the date of delivery; or</p>
                <p className="ml-4"><strong>16.2.2</strong> sent by fax or email, in which case it shall be deemed to have been received on the Day following the date of transmission.</p>
                <p><strong>16.3</strong> Notwithstanding the provisions of clause 16.2, any notice or communication actually received by a Party shall be deemed to be adequate notice or communication to that Party, notwithstanding that it was not sent to or delivered at the Party's chosen address.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">17. TERMINATION/EXPIRATION ASSISTANCE</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p>Upon termination or expiration of this Agreement, the Parties shall meet to discuss any outstanding matters relating to the termination or expiration of this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">18. GENERAL</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>18.1</strong> No Party shall be deemed to have waived any right under this Agreement unless such waiver is in writing and signed by the Party granting the waiver.</p>
                <p><strong>18.2</strong> This Agreement constitutes the entire agreement between the Parties in relation to the subject matter hereof and supersedes all prior agreements, understandings and arrangements between the Parties, whether written or oral.</p>
                <p><strong>18.3</strong> If any provision of this Agreement is found to be invalid, unlawful or unenforceable, such provision shall be severed from the remainder of this Agreement, which shall continue to be valid and enforceable.</p>
                <p><strong>18.4</strong> The provisions of this Agreement which by their nature are intended to survive termination or expiration shall survive any termination or expiration of this Agreement.</p>
                <p><strong>18.5</strong> Neither Party shall be entitled to cede, assign or otherwise transfer any of its rights or obligations under this Agreement without the prior written consent of the other Party, which consent shall not be unreasonably withheld.</p>
                <p><strong>18.6</strong> This Agreement may be executed in any number of counterparts, each of which when executed and delivered shall constitute an original, but all the counterparts together shall constitute one and the same instrument.</p>
                <p><strong>18.7</strong> The Parties to this Agreement shall remain the Parties for the duration of this Agreement, and no new Party may be added or substituted without the written consent of all existing Parties.</p>
                <p><strong>18.8</strong> Each Party warrants that it has the authority to enter into this Agreement and that the person signing this Agreement on behalf of that Party has the authority to bind that Party. Each Party indemnifies the other Party against any loss suffered as a result of any breach of this warranty.</p>
                <p><strong>18.9</strong> Each Party acknowledges that it has had the opportunity to obtain independent legal advice before signing this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">19. SIGNATURE</h4>
              <div className="space-y-4 text-sm">
                <p className="font-semibold">THUS, DONE AND SIGNED AT {signingLocation.toUpperCase()} ON THIS DATE {signingDate} IN THE PRESENCE OF THE UNDERSIGNED WITNESSES.</p>
                
                <div className="mt-4">
                  <p className="font-semibold">AS WITNESSES:</p>
                  <div className="ml-4 mt-2 space-y-2">
                    <p>1. DIGITAL WITNESS 1</p>
                    <p className="text-xs text-muted-foreground ml-6">(Digital verification upon client signature)</p>
                    <p>2. DIGITAL WITNESS 2</p>
                    <p className="text-xs text-muted-foreground ml-6">(Digital verification upon client signature)</p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="font-semibold mb-2">FOR AND ON BEHALF OF THE OWNER:</p>
                  <div className="ml-4 space-y-2">
                    <p>Name: {ownerName}</p>
                    <p>Signature: _____________________________</p>
                    <p>Date: {signingDate}</p>
                  </div>
                </div>

              <div className="mt-6">
                <p className="font-semibold mb-2">FOR AND ON BEHALF OF CRUNCH CARBON PTY (LTD):</p>
                <div className="ml-4 space-y-2">
                  <p>Witness: ANDREW D. STOCKIL</p>
                  <p>Witness: JOHANITA BURGER</p>
                </div>
              </div>
              </div>
            </section>
          </div>

          <div ref={sentinelRef} />
        </div>
      </CardContent>
    </Card>
  );
}
