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
                {/* OWNER FIRST - Reversed from previous version */}
                <div>
                  <p className="font-semibold">{ownerName}</p>
                  <p className="text-sm">the owner of solar photovoltaic power systems ("the owner")</p>
                  {registrationNumber !== "Not Applicable" && <p className="text-sm">with Registration No. {registrationNumber}</p>}
                  <p className="text-sm">Incorporated in South Africa with Registered Offices at {companyAddress}</p>
                  <p className="text-sm">and email: {ownerEmail}</p>
                </div>
                <p className="text-center font-semibold">AND</p>
                {/* CRUNCH CARBON SECOND - Reversed from previous version */}
                <div>
                  <p className="font-semibold">Crunch Carbon Pty (Ltd)</p>
                  <p className="text-sm">with Registration 2019/54306/07</p>
                  <p className="text-sm">acting as aggregator on behalf of Carbon Disclosure South Africa (Pty) Ltd</p>
                  <p className="text-sm">with Registration number: 2009/023392/07 (hereinafter referred to as "CDSA")</p>
                </div>
              </div>
            </section>

            {/* PREAMBLE - Completely Rewritten */}
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

            {/* Section 2 - Updated with sub-clauses */}
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

            {/* Section 3 - Major restructure with all new definitions */}
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

            {/* Section 4 - Added 4.4.5 and 4.4.6 */}
            <section>
              <h4 className="font-semibold mb-2">4. NATURE OF AGREEMENT AND OBLIGATIONS OF THE OWNER</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>4.1</strong> The Parties hereby enter into this agreement by virtue of the provisions as set out in the preamble above. For the avoidance of doubt, this Cession Agreement is the sole binding agreement between the Owner and Crunch Carbon (Pty) Ltd. Any references to Crunch Carbon's framework with CDSA merely describe the operational relationship that enables Crunch Carbon to fulfill its obligations to the Owner.</p>
                <p><strong>4.2</strong> It is hereby acknowledged by the Owner that the definitions herein correspond to those stipulated within this Cession Agreement; however, only the definitions pertinent to this agreement have been expressly included.</p>
                <p><strong>4.3</strong> Furthermore, it is acknowledged by the Owner that at any time and continuously, they are at liberty to request more information regarding the carbon credit process (audit, development, or otherwise). As such, Owners are regarded as well-informed regarding the carbon credit process.</p>
                <p><strong>4.4</strong> Accordingly, it is acknowledged and agreed that the Owner's responsibilities in terms of the/this agreement, to facilitate the achievement of the Project, are as follows:</p>
                <p className="ml-4"><strong>4.4.1</strong> The Owner shall provide Crunch Carbon on behalf of CDSA, with facilitation and sourcing provided by the Aggregator, with detailed specifications concerning the requisite data. The specifics regarding the required data that the Owner must provide to Crunch Carbon on behalf of CDSA are delineated in the data provided to Crunch Carbon.</p>
                <p className="ml-4"><strong>4.4.2</strong> The Aggregator shall collaborate with the Owner and CDSA and the accredited independent validation and verification body (VVB) to facilitate the efficient and effective validation of the Project Activity and the verification of quantities of Greenhouse Gases reduced by the Project. This cooperation encompasses facilitating access to the sites and all other aspects involved with a Site Visit.</p>
                <p className="ml-4"><strong>4.4.3</strong> The Owner shall ensure that the Data associated with Greenhouse Gas emissions reduced by the Units subject to this Cession Agreement is not utilized by different Carbon Offset Project developers for the same purpose as that of the Project's objective.</p>
                <p className="ml-4"><strong>4.4.4</strong> The Owner is obligated to cede, assign, transfer, and relinquish unto Crunch Carbon on behalf of CDSA, all rights, title, interest, and benefits pertaining to the ownership and contractual rights associated with any potential environmental benefits, inclusive of but not limited to greenhouse gas (GHG) reduction, resulting from the Unit, as well as any subsequent pursuit of revenue derived from such environmental benefits.</p>
                <p className="ml-4"><strong>4.4.5</strong> Clause 4.4.4 would automatically be cancelled after 30-days termination notice by the owner.</p>
                <p className="ml-4"><strong>4.4.6</strong> Additionally, the owner is obligated to protect the Intellectual Property of Crunch Carbon and CDSA.</p>
              </div>
            </section>

            {/* Section 5 - Added 5.6 */}
            <section>
              <h4 className="font-semibold mb-2">5. CESSION OF RIGHTS TO CDSA</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>5.1</strong> The Owner hereby cedes, assigns, transfers, and relinquishes unto Crunch Carbon on behalf of CDSA, all of its rights, title, interest, and benefits in and to the ownership pertaining to any potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction, resulting from the Owner's Units located or installed at the Premises, including, the Owner's contractual rights for the pursuit of revenue from the aforementioned potential environmental benefits.</p>
                <p><strong>5.2</strong> It is agreed that the aforementioned transfer of all rights, title, interest, and benefits pertaining to any potential environmental benefits, arising from the Unit, shall encompass all Units installed or located at the premises as (day/month/year) state on the platform.</p>
                <p><strong>5.3</strong> It is agreed that the aforementioned transfer of all rights, title, interest, and benefits pertaining to any potential environmental benefits, arising from the Unit, shall constitute a component of the exclusive Intellectual Property of Crunch Carbon and CDSA, which property shall, in accordance with this Cession Agreement, endure as the sole and exclusive Intellectual Property of Crunch Carbon and CDSA.</p>
                <p><strong>5.4</strong> It is further specifically agreed that only the aforementioned transfer of all of the Owner's contractual rights, title, interest, and benefits pertaining to the pursuit of revenue from any potential environmental benefits shall, in accordance with this Cession Agreement, be retained as the sole and exclusive property of Crunch Carbon on behalf of CDSA until the termination or expiration of this Cession Agreement.</p>
                <p><strong>5.5</strong> Additionally, the Owner hereby undertakes to furnish Crunch Carbon on behalf of CDSA, with written notice, provided no less than 30 (thirty) days in advance, prior to the sale of the Premises (this shall not hinder the sale or guarantee that the new owner will continue with this Cession Agreement).</p>
                <p><strong>5.6</strong> This Cession applies to all Units at the Signature Date and automatically to all future Units added by the Owner or its authorised representatives to the Platform, without requiring any further signature or amendment. Any Unit uploaded, submitted, approved or added by the Owner or its EPC/Agent on the Platform is deemed incorporated into this Agreement.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h4 className="font-semibold mb-2">6. REPRESENTATIONS AND WARRANTIES</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>6.1.1</strong> The Owner represents and warrants that:</p>
                <p className="ml-4"><strong>6.1.2</strong> It has full power and authority to enter into this agreement and to cede the aforementioned rights, title, interest, and benefits in and to the ownership pertaining to any potential environmental benefits to Crunch Carbon on behalf of CDSA</p>
                <p className="ml-4"><strong>6.1.3</strong> It is the lawful owner of the rights, title, interest, and benefits being ceded herein.</p>
                <p className="ml-4"><strong>6.1.4</strong> There are no encumbrances or restrictions on the rights, title, interest, and benefits being ceded herein.</p>
                <p className="ml-4"><strong>6.1.5</strong> The cession of the rights, title, interest, and benefits to CDSA does not violate any law or agreement binding on the Owner.</p>
                <p className="ml-4"><strong>6.1.6</strong> That the Owner has not ceded, sold, explicitly or implicitly forfeited any potential environmental benefit arising from the Unit located at the Premises in any form.</p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h4 className="font-semibold mb-2">7. INDEMNITY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>7.1.1</strong> The Owner indemnifies and holds harmless Crunch Carbon and CDSA from and against any and all claims, liabilities, losses, damages, costs, and expenses, arising out of or in connection with any breach of the representations and warranties set forth herein.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h4 className="font-semibold mb-2">8. ACKNOWLEDGEMENT AND ACCEPTANCE</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>8.1.1</strong> Crunch Carbon and CDSA acknowledges and accepts the cession of the aforementioned rights, title, interest, and benefits from the Owner and agrees to assume all rights, obligations, and liabilities associated therewith.</p>
              </div>
            </section>

            {/* Section 9 - IP Protection */}
            <section>
              <h4 className="font-semibold mb-2">9. PROTECTION OF CRUNCH CARBON AND CDSA'S INTELLECTUAL PROPERTY</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>9.1</strong> The Parties agree that all Intellectual Property obtained, accessed, or utilized in terms of the/this agreement, as a result of the relationship created by virtue of the/this agreement relating to the development of carbon credits, shall be retained and/or hereby assigned, transferred, ceded and relinquished to Crunch Carbon on behalf of CDSA, vesting solely and exclusively in Crunch Carbon on behalf of CDSA and shall be treated as confidential. Furthermore, it is acknowledged that this provision shall survive the termination of the/this agreement and shall remain effective until explicitly rescinded or amended in writing by the Parties.</p>
                <p><strong>9.2</strong> In light of the Owner's and/or Aggregator's association with CDSA, the Owner shall be acquainted with and gain access to CDSA's Intellectual Property and Confidential Information, thereby gaining insight into the Intellectual Property essential to the operations and endeavours of CDSA.</p>
                <p><strong>9.3</strong> Having regard to the facts recorded above, the Owner and/or Aggregator specifically agrees that in order to protect the proprietary interest of CDSA, the Owner and/or Aggregator will not during the subsistence of the/this agreement or at any time thereafter, either use or directly or indirectly divulge or disclose to other any of CDSA's Intellectual Property.</p>
                <p><strong>9.4</strong> Unless agreed otherwise in writing, nothing in the/this agreement shall confer or be deemed to confer on the Owner and/or Aggregator any rights in or licence to use the above-referenced Intellectual Property rights other than in the performance of its obligations in terms of the/this agreement.</p>
                <p><strong>9.5</strong> Either party shall ensure that the use by the other party of the information and of the intellectual property, which usage of information and intellectual property is required in order for the fulfilment of the obligations created by virtue of the/this agreement, shall not infringe any third party's intellectual property rights.</p>
                <p><strong>9.5.1</strong> The parties warrant that:</p>
                <p className="ml-4"><strong>9.5.1.1</strong> They have fully and accurately disclosed all relevant known facts relating to the Intellectual Property and its application in terms of the/this agreement which may affect the other party's decision to enter into this agreement;</p>
                <p className="ml-4"><strong>9.5.1.2</strong> They have the sole rights to the Intellectual Property and that it is not encumbered in any manner whatsoever;</p>
                <p className="ml-4"><strong>9.5.1.3</strong> No third person has any claim to or interest of any nature in the Intellectual Property;</p>
                <p className="ml-4"><strong>9.5.1.4</strong> Neither the Intellectual Property nor its use constitutes an infringement of the Intellectual Property Rights of any other person.</p>
                <p className="ml-4"><strong>9.5.1.5</strong> If it is established that such use infringes any third party's intellectual property right, the infringing party –</p>
                <ul className="ml-8 list-disc space-y-2">
                  <li>shall at its own expense and risk take such measures as to ensure that the infringement is obviated and that the non-infringing party's use of the information is not affected;</li>
                  <li>hereby indemnifies the non-infringing party against any claims brought by such third parties, provided that the non-infringing party notifies the infringing party in writing of such claims forthwith and permits the infringing party to defend any such claim.</li>
                </ul>
              </div>
            </section>

            {/* Section 10 - Revenue */}
            <section>
              <h4 className="font-semibold mb-2">10. REVENUE, MONETARY ARRANGEMENTS, AND RELATED RESPONSIBILITIES</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p className="mb-2">CDSA shall assume the following obligations for the commercialization of carbon credits for the purpose of achieving profitability:</p>
                <p><strong>10.1.1</strong> 1. Open an account in the relevant Registry.</p>
                <p><strong>10.1.2</strong> 2. Be responsible for all administrative and financial implications of maintaining such account.</p>
                <p><strong>10.1.3</strong> 3. CDSA shall bear the costs associated with the VVB, registry fees and any and all audit fees.</p>
                <p><strong>10.1.4</strong> CDSA shall be responsible for the sale of the Carbon Credits generated by the Project, including all administrative and financial considerations, as well as the implementation of marketing activities and the identification of potential buyers or as otherwise agreed between the parties. This shall be deduced in an appendix. CDSA shall ensure transparency in the sales process by providing periodic updates to the Owner, including relevant market insights and pricing trends. The Owner may, upon request, provide input on potential buyers or negotiations; however, CDSA shall retain final decision-making authority to ensure efficient execution of sales at market-related rates.</p>
                <p><strong>10.1.5</strong> Additionally, CDSA shall exercise its discretion in determining the entities to which the Carbon Credits will be sold. This discretion encompasses the selection of interested parties and the negotiation of terms for the sale of the Carbon Credits.</p>
                <p><strong>10.1.6</strong> Revenue paid out to the owner is stipulated as per the signed proposal.</p>
                <p><strong>10.1.7</strong> Or to retain and hold the Carbon Credits in its own name. If the Owner elects to hold the Carbon Credits, all costs and fees related to issuance, transfer, registration, or ongoing management shall be for the Owner's account, and CDSA or Crunch Carbon shall bear no responsibility or liability for such costs or activities.</p>
                <p><strong>10.1.8</strong> It is specifically recorded and agreed that the transfer of the revenue to the Aggregator and subsequently to the owner shall be conducted periodically on an annual basis throughout the subsistence of this Cession Agreement.</p>
                <p><strong>10.1.9</strong> Feedback will be provided at least quarterly or as required by the project owners.</p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h4 className="font-semibold mb-2">11. INCORPORATION OF THIS AGREEMENT INTO THE PROVISIONS OF THE AGREEMENT</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>11.1</strong> It is specifically agreed that this Agreement, shall form an integral and indivisible part of this Cession Agreement, to the extent that the content of this Agreement, including subsequent amendments made to this Agreement, shall be regarded by the parties as fully incorporated into the provisions of this Cession Agreement.</p>
              </div>
            </section>

            {/* Section 12 - Termination */}
            <section>
              <h4 className="font-semibold mb-2">12. TERMINATION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>12.1</strong> This Agreement may be terminated at any time by either of the parties hereto, provided that such consent to terminate is in writing and is signed by the party who wants to cancel.</p>
                <p className="ml-4"><strong>12.1.1</strong> In the case of termination the terminating party must provide 30 days of written notice to the other party.</p>
                <p className="ml-4"><strong>12.1.2</strong> Data extraction will be terminated as from the last day of the 30-day notice period.</p>
                <p className="ml-4"><strong>12.1.3</strong> n/a</p>
                <p><strong>12.2</strong> The Owner may request the removal of a specific Unit by giving 30 days written notice. Such removal applies only to future periods and shall not reverse cessions already utilised for audits, submissions or issued vintages.</p>
                <p><strong>12.3</strong> Other than Clause 9.1 either party will be entitled to terminate the agreement by providing 30-days written notice to the other in the event of:</p>
                <p className="ml-4"><strong>12.3.1</strong> the other party committing a breach of the terms and conditions of this Cession Agreement, all of which are declared to be material and failing to remedy the breach within 14 (Fourteen) days of written notice calling upon the other party to remedy the breach complained of;</p>
                <p className="ml-8"><strong>12.3.2</strong> In the event of either of the Parties ("the defaulting party") committing a breach of any of the terms of this Cession Agreement and failing to remedy such breach within a period of 14 (Fourteen) days after receipt of a written notice from the other party ("the aggrieved party") calling upon the defaulting party so to remedy, then the aggrieved party shall be entitled, either claims specific performance of the terms of this Cession Agreement or to cancel this Cession Agreement forthwith and without further notice.</p>
                <p className="ml-8"><strong>12.3.3</strong> the other party committing an act of insolvency or being sequestrated/liquidated or being placed under a provisional or final winding-up or judicial management order or if the other party makes an assignment for the benefit of creditors.</p>
                <p><strong>12.4</strong> The termination of this Cession Agreement, for whatever reason, will not affect the rights of a party which may have accrued as at the date of termination and will further not affect any rights and obligations which specifically or by their nature survive the termination of this Cession Agreement.</p>
              </div>
            </section>

            {/* Section 13 */}
            <section>
              <h4 className="font-semibold mb-2">13. DISPUTE RESOLUTION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>13.1</strong> In the event of a dispute arising from, or incidental to, this Cession Agreement, the Parties agree to submit the matter for mediation and failing which to arbitration.</p>
                <p><strong>13.2</strong> Notwithstanding the above provisions, the Parties will be entitled to approach a Court of competent jurisdiction for urgent relief.</p>
              </div>
            </section>

            {/* Section 14 - Arbitration */}
            <section>
              <h4 className="font-semibold mb-2">14. ARBITRATION</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>14.1</strong> Save where otherwise provided for in this Cession Agreement, any dispute between the Parties hereto (and which dispute has previously been submitted to mediation without resolution) in regard to:</p>
                <p className="ml-4"><strong>14.1.1</strong> the interpretation of; or</p>
                <p className="ml-4"><strong>14.1.2</strong> the effect of; or</p>
                <p className="ml-4"><strong>14.1.3</strong> the carrying out of; or</p>
                <p className="ml-4"><strong>14.1.4</strong> any other matter arising directly or indirectly out of, this Cession Agreement, shall be submitted to and decided by arbitration.</p>
                <p><strong>14.2</strong> The arbitration shall be held informally but otherwise under the provisions of the Arbitration Act No.42 of 1965, as amended from time to time, or any Act passed in substitution for it; it being the intention as far as possible that the arbitration shall be held and concluded within 21 (twenty one) days after it has been demanded by way of written notice of either party to the other party. The Parties shall be entitled to be represented at the arbitration.</p>
                <p><strong>14.3</strong> The arbitrator shall be, if the matter in issue is:</p>
                <p className="ml-4"><strong>14.3.1</strong> primarily an accounting matter an independent chartered accountant of not less than 15 (Fifteen) years' standing, practising as a registered auditor, agreed upon between the Parties;</p>
                <p className="ml-4"><strong>14.3.2</strong> primarily a legal matter a practising attorney of not less than 15 (Fifteen) years' standing, agreed upon between the Parties;</p>
                <p className="ml-4"><strong>14.3.3</strong> any other matter an independent person agreed upon between the Parties.</p>
                <p><strong>14.4</strong> If the Parties cannot agree whether any matter in dispute falls under the clauses mentioned hereinabove within 7 (seven) days after arbitration has been demanded, then that dispute shall be submitted for decision in terms of clause 15.3.3 above within 7 (seven) days after the Parties have so failed to agree, in order that the arbitration can be held and concluded as far as possible within a period of 21 (twenty one) days referred to above.</p>
                <p><strong>14.5</strong> If the Parties fail to agree on the appointment of an arbitrator, such failure to agree shall be referred to the Attorneys' Association of Gauteng in order for the Association to appoint an arbitrator.</p>
                <p><strong>14.6</strong> The decision of the arbitrator shall be final and binding upon the Parties and shall be carried into effect by them and made an order of any competent Court, including any decision regarding the costs of the arbitration which the arbitrator shall be empowered to make.</p>
                <p><strong>14.7</strong> Notwithstanding the foregoing, any party shall be entitled to approach any court of competent jurisdiction for urgent relief.</p>
              </div>
            </section>

            {/* Section 15 - Force Majeure */}
            <section>
              <h4 className="font-semibold mb-2">15. FORCE MAJEURE</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>15.1</strong> A party is not liable for a failure to perform any of its obligations in so far as it proves:</p>
                <p className="ml-4"><strong>15.1.1</strong> that the failure was due to an impediment beyond its control.</p>
                <p className="ml-4"><strong>15.1.2</strong> that it could not reasonably be expected to have taken the impediment and its effects upon the party's ability to perform into account at the time of the conclusion of the contract; and</p>
                <p className="ml-4"><strong>15.1.3</strong> that it could not reasonably have avoided or overcome the impediment or at least its effects.</p>
                <p><strong>15.2</strong> An impediment under clause 16.1.1 may result from events such as the following, this enumeration not being exhaustive:</p>
                <p className="ml-4"><strong>15.2.1</strong> war, whether declared or not, civil war, civil violence, riots and revolutions, acts of piracy, acts of sabotage.</p>
                <p className="ml-4"><strong>15.2.2</strong> natural disasters such as violent storms, cyclones, earthquakes, tidal waves, floods, destruction by lightning, explosions, fires, destruction of machines, of factories and of any kind of installations.</p>
                <p className="ml-4"><strong>15.2.3</strong> boycotts, strikes and lockouts of all kinds, go-slows, occupation of factories and premises, and work stoppages.</p>
                <p className="ml-4"><strong>15.2.5</strong> acts of authority, whether lawful or unlawful, apart from acts for which the party seeking relief has assumed the risk by virtue of any other provisions of this Cession Agreement.</p>
                <p><strong>15.3</strong> Relief from liability for non-performance by reason of the provisions of this clause shall commence on the date upon which the party seeking relief gives notice of the impediment relied upon and shall terminate upon the date upon which such impediment ceases to exist, provided that if such impediment continues for a period of more than 30 (THIRTY) days, either party shall be entitled to terminate this Cession Agreement by written notice to the other party, without cause, penalty, claim or obligation in respect of any loss suffered or damages incurred as a result of such cancellation.</p>
              </div>
            </section>

            {/* Section 16 */}
            <section>
              <h4 className="font-semibold mb-2">16. DOMICILIUM CITANDI ET EXECUTANDI AND NOTICES</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>16.1</strong> The Parties choose as their domicilia citandi et executandi their respective addresses as set out hereinabove for all purposes arising out of or in connection with this Agreement at which physical or electronic mail addresses all processes and notices arising out of or in connection with this Agreement, its breach or termination may validly be served upon or delivered to the Parties.</p>
                <p><strong>16.2</strong> Any notice, consent or other communication required or permitted hereunder from either party shall be in writing and shall –</p>
                <p className="ml-4"><strong>16.2.1</strong> If delivered by hand be deemed to have been duly received by the addressee on the date of delivery;</p>
                <p className="ml-4"><strong>16.2.2</strong> If transmitted by facsimile or electronic mail be deemed to have been received by the addressee on the day following the date of transmission, unless the contrary is proved.</p>
                <p><strong>16.3</strong> Notwithstanding anything to the contrary contained or implied in this Agreement, a written notice or communication actually received by a party shall be an adequate written notice or communication to it notwithstanding that it was not sent to or delivered at its chosen domicilium citandi et executandi.</p>
              </div>
            </section>

            {/* Section 17 */}
            <section>
              <h4 className="font-semibold mb-2">17. TERMINATION / EXPIRATION ASSISTANCE</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>17.1</strong> On the expiration or termination of this Cession Agreement the Parties shall make themselves available for an exit meeting for the discussion and implementation of termination/expiration assistance.</p>
              </div>
            </section>

            {/* Section 18 */}
            <section>
              <h4 className="font-semibold mb-2">18. GENERAL</h4>
              <div className="ml-4 space-y-2 text-sm">
                <p><strong>18.1</strong> No variation, amendment, deletion or addition to this Agreement, including this clause, will be of any force or effect unless reduced to writing and signed by the parties.</p>
                <p><strong>18.2</strong> No indulgence, extension of time, relaxation or latitude which any party (the "grantor") may show grant or allow to the other (the "grantee") shall constitute a waiver by the grantor of any of the grantor's rights and the grantor shall not thereby be prejudiced or estopped from exercising any of its rights against the grantee which may have arisen in the past or which might arise in the future.</p>
                <p><strong>18.3</strong> Nothing contained in this Agreement shall constitute an agency, partnership, joint venture or similar relationship between any of the parties hereto or their affiliated companies.</p>
                <p><strong>18.4</strong> All annexures and schedules attached to this Agreement are incorporated by reference and shall form an integral part of this Agreement.</p>
              </div>
            </section>

            {/* Signature Block */}
            <section>
              <div className="ml-4 space-y-4 text-sm mt-6">
                <p className="font-semibold">THUS, DONE AND SIGNED AT __________________________________ ON THIS</p>
                <p className="font-semibold">DATE {signingDate} IN THE PRESENCE OF THE UNDERSIGNED WITNESSES.</p>
                <div className="mt-4">
                  <p className="font-semibold">AS WITNESSES:</p>
                  <p className="mt-2">1. __________________________________</p>
                  <p>2. __________________________________</p>
                  <p className="mt-4">_________________________________ FOR: "{ownerName}" (Owner)</p>
                </div>
                <div className="mt-6">
                  <p className="font-semibold">THUS, DONE AND SIGNED AT SANDTON JOHANNESBURG ON THIS</p>
                  <p className="font-semibold">DATE {signingDate} IN THE PRESENCE OF THE UNDERSIGNED WITNESSES.</p>
                  <div className="mt-4">
                    <p className="font-semibold">AS WITNESSES:</p>
                    <p className="mt-2">1. ANDREW D. STOCKIL</p>
                    <p>2. JOHANITA BURGER</p>
                    <p className="mt-4">FOR: __________________________________ Crunch Carbon Pty (Ltd)</p>
                  </div>
                </div>
              </div>
            </section>
            
            <div ref={sentinelRef} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
