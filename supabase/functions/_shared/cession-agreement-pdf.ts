import { PDFDocument, PDFFont, PDFPage, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

interface CessionAgreementData {
  ownerName: string;
  ownerEmail: string;
  registrationNumber: string;
  companyAddress: string;
  premisesAddress: string;
  installationDate: string;
  signingDate: string;
  clientSharePercentage: number;
  ownerPercentage: string;
  cessionaryPercentage: string;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 50;
const TOP_MARGIN = 50;
const BOTTOM_MARGIN = 50;
const MAX_WIDTH = A4_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

const crunchYellow = rgb(1, 0.804, 0.012);
const crunchCharcoal = rgb(0.137, 0.122, 0.125);
const textColor = rgb(0, 0, 0);
const lightGray = rgb(0.4, 0.4, 0.4);

export async function addCessionAgreementPages(
  pdfDoc: PDFDocument,
  fonts: { regular: PDFFont; bold: PDFFont },
  proposalData: any
): Promise<void> {
  // Extract dynamic values
  const data: CessionAgreementData = {
    ownerName: proposalData.content?.clientInfo?.name || "[Owner Name]",
    ownerEmail: proposalData.content?.clientInfo?.email || "[Owner Email]",
    registrationNumber: proposalData.content?.clientInfo?.registrationNumber || "Not Applicable",
    companyAddress: proposalData.content?.clientInfo?.address || proposalData.content?.projectInfo?.address || "[Company Address]",
    premisesAddress: proposalData.content?.projectInfo?.address || "[Premises Address]",
    installationDate: proposalData.content?.projectInfo?.commissionDate?.split('T')[0] || "[Installation Date]",
    signingDate: new Date().toISOString().split('T')[0],
    clientSharePercentage: proposalData.client_share_percentage || 0,
    ownerPercentage: (proposalData.client_share_percentage || 0).toFixed(1),
    cessionaryPercentage: (100 - (proposalData.client_share_percentage || 0)).toFixed(1),
  };

  let currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - TOP_MARGIN;

  // Helper function to add a new page when needed
  const checkPageBreak = (requiredSpace: number): void => {
    if (y - requiredSpace < BOTTOM_MARGIN + 30) {
      currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      y = A4_HEIGHT - TOP_MARGIN;
    }
  };

  // Helper function to draw wrapped text
  const drawText = (text: string, size: number, font: PDFFont, color = textColor, indent = 0): void => {
    const maxWidth = MAX_WIDTH - indent;
    const words = text.split(' ');
    let line = '';
    const lineHeight = size * 1.4;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const testWidth = font.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        checkPageBreak(lineHeight);
        currentPage.drawText(line, {
          x: LEFT_MARGIN + indent,
          y,
          size,
          font,
          color,
        });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      checkPageBreak(lineHeight);
      currentPage.drawText(line, {
        x: LEFT_MARGIN + indent,
        y,
        size,
        font,
        color,
      });
      y -= lineHeight;
    }
  };

  // Helper to add section heading
  const addHeading = (text: string, level: 'main' | 'section' | 'subsection'): void => {
    const size = level === 'main' ? 20 : level === 'section' ? 14 : 12;
    const space = level === 'main' ? 30 : level === 'section' ? 20 : 15;
    
    checkPageBreak(size * 1.4 + space);
    y -= space / 2;
    drawText(text, size, fonts.bold, crunchCharcoal);
    y -= space / 2;
  };

  // Helper to add clause with number
  const addClause = (number: string, text: string, indent = 0): void => {
    const clauseText = `${number} ${text}`;
    drawText(clauseText, 10, fonts.regular, textColor, indent);
  };

  // === TITLE PAGE ===
  addHeading('Carbon Right Cessionary Agreement', 'main');
  y -= 20;

  // Between section
  drawText('Between:', 12, fonts.bold, crunchCharcoal);
  y -= 10;

  // OWNER DETAILS (FIRST - Reversed from previous version)
  drawText(data.ownerName, 11, fonts.bold, textColor, 20);
  drawText('the owner of solar photovoltaic power systems ("the owner")', 10, fonts.regular, textColor, 20);
  if (data.registrationNumber !== "Not Applicable") {
    drawText(`with Registration No. ${data.registrationNumber}`, 10, fonts.regular, textColor, 20);
  }
  drawText(`Incorporated in South Africa with Registered Offices at ${data.companyAddress}`, 10, fonts.regular, textColor, 20);
  drawText(`and email: ${data.ownerEmail}`, 10, fonts.regular, textColor, 20);
  y -= 15;

  drawText('AND', 12, fonts.bold, textColor, MAX_WIDTH / 2 - 20);
  y -= 15;

  // CRUNCH CARBON DETAILS (SECOND - Reversed from previous version)
  drawText('Crunch Carbon Pty (Ltd)', 11, fonts.bold, textColor, 20);
  drawText('with Registration 2019/54306/07', 10, fonts.regular, textColor, 20);
  drawText('acting as aggregator on behalf of Carbon Disclosure South Africa (Pty) Ltd', 10, fonts.regular, textColor, 20);
  drawText('with Registration number: 2009/023392/07 (hereinafter referred to as "CDSA")', 10, fonts.regular, textColor, 20);
  y -= 25;

  // === PREAMBLE (Completely Rewritten) ===
  addHeading('PREAMBLE', 'section');
  addClause('1.1', 'Whereas CDSA possesses the specialized Intellectual Property essential for the commercialization of potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction, stemming from solar photovoltaic power systems, coupled with an in-depth technical comprehension of carbon markets.');
  addClause('1.2', 'And whereas the aforementioned program has received official recognition from one or more carbon credit standards, meeting requisite standards, and pursuant to said program, CDSA has been formally listed as an account holder in the Verra Registry as one of the carbon credits standards.');
  addClause('1.3', 'And whereas the Owner holds ownership rights to any environmental benefit or greenhouse gas (GHG) reduction benefit emanating from its solar photovoltaic power systems, should this be included as part of the info shown to the client.');
  addClause('1.4', 'And whereas the Parties record that this agreement is incorporated in the operational framework between Crunch Carbon and CDSA ("Crunch Carbon\'s framework with Carbon Disclosure South Africa (CDSA)"), concluded between the Aggregator and CDSA.');
  addClause('1.5', 'And whereas the Aggregator and CDSA have mutually agreed, as stipulated in Crunch Carbon\'s framework with Carbon Disclosure South Africa (CDSA), to leverage CDSA\'s Intellectual Property Rights for their mutual benefit by pursuing potential environmental benefits, including, but not limited to, greenhouse gas (GHG) reduction from the Owner\'s solar photovoltaic power systems, through initiatives, including, but not limited to engaging in the commercialization of carbon credits derived from the aforementioned potential benefits, to yield potential additional revenue ("Project").');
  addClause('1.6', 'And whereas the Owner holds the sole legal right to cede/assign any potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction originating from its Solar Photovoltaic Power Systems, which Solar Photovoltaic Power Systems is located at the following address(ses) as indicated on the electronic Portal.');
  addClause('1.7', 'And whereas it is imperative for the Owner to transfer and assign its rights related to any potential environmental benefits, specifically including but not limited to greenhouse gas (GHG) reductions resulting from its Solar Photovoltaic Power Systems, and additionally to furnish Crunch Carbon on behalf of CDSA with all data sets, documents, records, forms, and any other relevant information in respect of the Owner\'s Solar Photovoltaic Power Systems necessary for the development of carbon credits, to facilitate the achievement of The Project.');
  addClause('1.8', 'And whereas the Aggregator in terms of Crunch Carbon\'s framework with Carbon Disclosure South Africa (CDSA) is responsible for facilitating the ceding process of said rights and sourcing the required data from the Owner to CDSA;');
  y -= 10;
  drawText('Now Therefore, it is agreed as follows:', 11, fonts.bold);
  y -= 20;

  // === 2. INTERPRETATION (Updated with sub-clauses) ===
  addHeading('2. INTERPRETATION AND PRELIMINARY', 'section');
  addClause('2.1', 'The headings of the clauses in this agreement are for the purpose of convenience and reference only and shall not be used in the interpretation of, nor modify, nor amplify the terms of this agreement nor any clause hereof, unless the contrary intention clearly appears,');
  addClause('2.2', 'Words importing');
  addClause('2.2.1', 'any one gender includes the other two genders.', 20);
  addClause('2.2.2', 'the singular includes the plural and vice versa; and', 20);
  addClause('2.2.3', 'natural persons include created entities (corporate and non-corporate) and vice versa.', 20);
  addClause('2.3', 'If any provision in the preamble or within a definition is a substantive provision conferring rights or imposing obligations on any party, notwithstanding that it is contained in the preamble or the definition clause, effect shall be given to it as if it were a substantive provision in the body of this agreement.');
  addClause('2.4', 'This agreement shall be governed, interpreted and enforced in accordance with the laws of the Republic of South Africa from time to time.');
  y -= 20;

  // === 3. DEFINITIONS (Major restructure) ===
  addHeading('3. DEFINITIONS', 'section');
  drawText('Unless otherwise determined by the context, the following words will bear the meanings set forth against them:', 10, fonts.regular);
  y -= 10;
  addClause('3.1', '"CDSA" means Carbon Disclosure South Africa (Pty) Ltd;');
  addClause('3.2', `"The Owner" referring to ${data.ownerName}, the owner of the Solar Photovoltaic Power Systems as per this Cession Agreement;`);
  addClause('3.3', '"The Aggregator" means the Party responsible, in this instance Crunch Carbon, for facilitating the ceding process of the Owner\'s rights to any environmental benefit or greenhouse gas (GHG) reduction benefit emanating from the Owner\'s solar photovoltaic power systems rights and the sourcing of the required data as per the guideline provided by CDSA, from the Owner to CDSA;');
  addClause('3.4', '"the Parties" means Carbon Disclosure South Africa (Pty) Ltd and (the Owner) as per the signed agreement;');
  addClause('3.5', '"this agreement" means this Cession Agreement contained in this document;');
  addClause('3.6', 'the Aggregator and CDSA;');
  addClause('3.7', '"including" (or words of similar meaning) means to include without limitation, and if the expression is used with reference to specific examples the "eiusdem generis" rule shall not apply;');
  addClause('3.8', '"law" means any law of general application and includes the common law and any statute, constitution, decree, treaty, regulation, directive, ordinance, by-law, order or any other enactment of legislative measure of government (including local and provincial government) statutory or regulatory body which has the force of law;');
  addClause('3.9', '"person/individual" means any person, company, close corporation, trust, partnership or other entity whether or not having separate legal personality;');
  addClause('3.10', '"signature date" means (or words of similar meaning) in relation to this agreement means the date on which this agreement is executed by the party signing it last in chronological order, thereby constituting the date on which this agreement is formally concluded.');
  addClause('3.11', '"day" means a day which is not a Saturday, Sunday or official public holiday in the Republic of South Africa;');
  addClause('3.12', '"Property" includes Movable, Immovable and Intellectual Property;');
  addClause('3.13', '"Intellectual Property" means:');
  addClause('3.13.1', 'Business Model;', 20);
  addClause('3.13.2', 'Data;', 20);
  addClause('3.13.3', 'Knowledge;', 20);
  addClause('3.13.4', 'Copyright or Patent (if any); and', 20);
  addClause('3.13.5', 'Inventions (if any); which relates to and is the property which is currently and henceforth the property of CDSA, which also includes all improvements, and extensions, to the Intellectual Property;', 20);
  addClause('3.14', '"Knowledge" means all confidential information of whatever nature relating to the Intellectual Property and its exploitation including the technical information, techniques, business model, revenue-related data, processes, marketing and business information generally;');
  addClause('3.15', '"Data" means all forms of information, inclusive of but not limited to data sets, documents, records, forms, and any other relevant materials for the purpose of developing carbon credits. This includes, without limitation, data pertaining to emissions reductions, carbon offset projects, methodologies, monitoring protocols, and any additional particulars specified within the provided guideline of Crunch Carbon\'s framework with Carbon Disclosure South Africa (CDSA);');
  addClause('3.16', '"Confidential Information" means any and all Data and Knowledge, as defined above, required for the development of carbon credits, which is designated as confidential or which a reasonable person would understand to be confidential given the nature of this Agreement;');
  addClause('3.17', '"Carbon Offset" signifies a certified reduction in emissions of Greenhouse Gases, resulting from a project activity, measured in tonnes of carbon dioxide-equivalent (tCO2e), where one Carbon Offset represents the reduction of one tonne of carbon dioxide-equivalent emitted into the atmosphere;');
  addClause('3.18', '"Carbon Credit" see "Carbon Offset"');
  addClause('3.19', '"Greenhouse Gas (GHG)" comprises gases that trap heat in the atmosphere, including but not limited to carbon dioxide (CO2), methane (CH4), and nitrous oxide (N2O);');
  addClause('3.20', '"Premises" refer to the addresses where the Carbon Offsets from dispersed electricity generated by Solar Photovoltaic Power Systems are generated and/or consumed.');
  addClause('3.21', '"Project" entails Crunch Carbon on behalf of CDSA developing, obtaining, and commercializing Carbon Credits derived from any potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction, stemming from the Owner\'s Solar Photovoltaic Power Systems;');
  addClause('3.22', '"Project Activity" denotes the specific set of technologies, measures, and/or outcomes specified in a methodology applied to the Project, altering the conditions identified in the Baseline Scenario and resulting in GHG emission reductions or removals;');
  addClause('3.23', '"Registry" represents the platform of the Carbon Offset Standard that records Carbon Offset Projects and facilitates the transfer of Carbon Offsets between Accounts;');
  addClause('3.24', '"Site visit" encompasses any physical inspection of the installed Units, including interviews with any Stakeholder identified by an independent validation and verification body (VVB) or dually authorized auditor;');
  addClause('3.25', '"Unit" refers to the Owner\'s Solar Photovoltaic Power System(s);');
  addClause('3.26', '"VVB" represents an accredited independent validation and verification body tasked with the independent validation of the Project and/or the independent verification of the quantity of Greenhouse Gas emissions reduced.');
  addClause('3.27', '"Platform" means the Crunch Carbon digital portal, system, website or application through which Owners or their authorised Agents provide, upload or maintain information relating to their Units. The Platform shall serve as the authoritative, complete and binding record of all Unit(s) and Premise(s) subject to this Agreement.');
  y -= 20;

  // === 4. NATURE OF AGREEMENT (Added 4.4.5 and 4.4.6) ===
  addHeading('4. NATURE OF AGREEMENT AND OBLIGATIONS OF THE OWNER', 'section');
  addClause('4.1', 'The Parties hereby enter into this agreement by virtue of the provisions as set out in the preamble above. For the avoidance of doubt, this Cession Agreement is the sole binding agreement between the Owner and Crunch Carbon (Pty) Ltd. Any references to Crunch Carbon\'s framework with CDSA merely describe the operational relationship that enables Crunch Carbon to fulfill its obligations to the Owner.');
  addClause('4.2', 'It is hereby acknowledged by the Owner that the definitions herein correspond to those stipulated within this Cession Agreement; however, only the definitions pertinent to this agreement have been expressly included.');
  addClause('4.3', 'Furthermore, it is acknowledged by the Owner that at any time and continuously, they are at liberty to request more information regarding the carbon credit process (audit, development, or otherwise). As such, Owners are regarded as well-informed regarding the carbon credit process.');
  addClause('4.4', 'Accordingly, it is acknowledged and agreed that the Owner\'s responsibilities in terms of the/this agreement, to facilitate the achievement of the Project, are as follows:');
  addClause('4.4.1', 'The Owner shall provide Crunch Carbon on behalf of CDSA, with facilitation and sourcing provided by the Aggregator, with detailed specifications concerning the requisite data. The specifics regarding the required data that the Owner must provide to Crunch Carbon on behalf of CDSA are delineated in the data provided to Crunch Carbon.', 20);
  addClause('4.4.2', 'The Aggregator shall collaborate with the Owner and CDSA and the accredited independent validation and verification body (VVB) to facilitate the efficient and effective validation of the Project Activity and the verification of quantities of Greenhouse Gases reduced by the Project. This cooperation encompasses facilitating access to the sites and all other aspects involved with a Site Visit.', 20);
  addClause('4.4.3', 'The Owner shall ensure that the Data associated with Greenhouse Gas emissions reduced by the Units subject to this Cession Agreement is not utilized by different Carbon Offset Project developers for the same purpose as that of the Project\'s objective.', 20);
  addClause('4.4.4', 'The Owner is obligated to cede, assign, transfer, and relinquish unto Crunch Carbon on behalf of CDSA, all rights, title, interest, and benefits pertaining to the ownership and contractual rights associated with any potential environmental benefits, inclusive of but not limited to greenhouse gas (GHG) reduction, resulting from the Unit, as well as any subsequent pursuit of revenue derived from such environmental benefits.', 20);
  addClause('4.4.5', 'Clause 4.4.4 would automatically be cancelled after 30-days termination notice by the owner.', 20);
  addClause('4.4.6', 'Additionally, the owner is obligated to protect the Intellectual Property of Crunch Carbon and CDSA.', 20);
  y -= 20;

  // === 5. CESSION OF RIGHTS (Added 5.6) ===
  addHeading('5. CESSION OF RIGHTS TO CDSA', 'section');
  addClause('5.1', 'The Owner hereby cedes, assigns, transfers, and relinquishes unto Crunch Carbon on behalf of CDSA, all of its rights, title, interest, and benefits in and to the ownership pertaining to any potential environmental benefits, including but not limited to, greenhouse gas (GHG) reduction, resulting from the Owner\'s Units located or installed at the Premises, including, the Owner\'s contractual rights for the pursuit of revenue from the aforementioned potential environmental benefits.');
  addClause('5.2', 'It is agreed that the aforementioned transfer of all rights, title, interest, and benefits pertaining to any potential environmental benefits, arising from the Unit, shall encompass all Units installed or located at the premises as (day/month/year) state on the platform.');
  addClause('5.3', 'It is agreed that the aforementioned transfer of all rights, title, interest, and benefits pertaining to any potential environmental benefits, arising from the Unit, shall constitute a component of the exclusive Intellectual Property of Crunch Carbon and CDSA, which property shall, in accordance with this Cession Agreement, endure as the sole and exclusive Intellectual Property of Crunch Carbon and CDSA.');
  addClause('5.4', 'It is further specifically agreed that only the aforementioned transfer of all of the Owner\'s contractual rights, title, interest, and benefits pertaining to the pursuit of revenue from any potential environmental benefits shall, in accordance with this Cession Agreement, be retained as the sole and exclusive property of Crunch Carbon on behalf of CDSA until the termination or expiration of this Cession Agreement.');
  addClause('5.5', 'Additionally, the Owner hereby undertakes to furnish Crunch Carbon on behalf of CDSA, with written notice, provided no less than 30 (thirty) days in advance, prior to the sale of the Premises (this shall not hinder the sale or guarantee that the new owner will continue with this Cession Agreement).');
  addClause('5.6', 'This Cession applies to all Units at the Signature Date and automatically to all future Units added by the Owner or its authorised representatives to the Platform, without requiring any further signature or amendment. Any Unit uploaded, submitted, approved or added by the Owner or its EPC/Agent on the Platform is deemed incorporated into this Agreement.');
  y -= 20;

  // === 6. REPRESENTATIONS ===
  addHeading('6. REPRESENTATIONS AND WARRANTIES', 'section');
  addClause('6.1.1', 'The Owner represents and warrants that:');
  addClause('6.1.2', 'It has full power and authority to enter into this agreement and to cede the aforementioned rights, title, interest, and benefits in and to the ownership pertaining to any potential environmental benefits to Crunch Carbon on behalf of CDSA', 20);
  addClause('6.1.3', 'It is the lawful owner of the rights, title, interest, and benefits being ceded herein.', 20);
  addClause('6.1.4', 'There are no encumbrances or restrictions on the rights, title, interest, and benefits being ceded herein.', 20);
  addClause('6.1.5', 'The cession of the rights, title, interest, and benefits to CDSA does not violate any law or agreement binding on the Owner.', 20);
  addClause('6.1.6', 'That the Owner has not ceded, sold, explicitly or implicitly forfeited any potential environmental benefit arising from the Unit located at the Premises in any form.', 20);
  y -= 20;

  // === 7. INDEMNITY ===
  addHeading('7. INDEMNITY', 'section');
  addClause('7.1.1', 'The Owner indemnifies and holds harmless Crunch Carbon and CDSA from and against any and all claims, liabilities, losses, damages, costs, and expenses, arising out of or in connection with any breach of the representations and warranties set forth herein.');
  y -= 20;

  // === 8. ACKNOWLEDGEMENT ===
  addHeading('8. ACKNOWLEDGEMENT AND ACCEPTANCE', 'section');
  addClause('8.1.1', 'Crunch Carbon and CDSA acknowledges and accepts the cession of the aforementioned rights, title, interest, and benefits from the Owner and agrees to assume all rights, obligations, and liabilities associated therewith.');
  y -= 20;

  // === 9. IP PROTECTION ===
  addHeading('9. PROTECTION OF CRUNCH CARBON AND CDSA\'S INTELLECTUAL PROPERTY', 'section');
  addClause('9.1', 'The Parties agree that all Intellectual Property obtained, accessed, or utilized in terms of the/this agreement, as a result of the relationship created by virtue of the/this agreement relating to the development of carbon credits, shall be retained and/or hereby assigned, transferred, ceded and relinquished to Crunch Carbon on behalf of CDSA, vesting solely and exclusively in Crunch Carbon on behalf of CDSA and shall be treated as confidential. Furthermore, it is acknowledged that this provision shall survive the termination of the/this agreement and shall remain effective until explicitly rescinded or amended in writing by the Parties.');
  addClause('9.2', 'In light of the Owner\'s and/or Aggregator\'s association with CDSA, the Owner shall be acquainted with and gain access to CDSA\'s Intellectual Property and Confidential Information, thereby gaining insight into the Intellectual Property essential to the operations and endeavours of CDSA.');
  addClause('9.3', 'Having regard to the facts recorded above, the Owner and/or Aggregator specifically agrees that in order to protect the proprietary interest of CDSA, the Owner and/or Aggregator will not during the subsistence of the/this agreement or at any time thereafter, either use or directly or indirectly divulge or disclose to other any of CDSA\'s Intellectual Property.');
  addClause('9.4', 'Unless agreed otherwise in writing, nothing in the/this agreement shall confer or be deemed to confer on the Owner and/or Aggregator any rights in or licence to use the above-referenced Intellectual Property rights other than in the performance of its obligations in terms of the/this agreement.');
  addClause('9.5', 'Either party shall ensure that the use by the other party of the information and of the intellectual property, which usage of information and intellectual property is required in order for the fulfilment of the obligations created by virtue of the/this agreement, shall not infringe any third party\'s intellectual property rights.');
  addClause('9.5.1', 'The parties warrant that:');
  addClause('9.5.1.1', 'They have fully and accurately disclosed all relevant known facts relating to the Intellectual Property and its application in terms of the/this agreement which may affect the other party\'s decision to enter into this agreement;', 20);
  addClause('9.5.1.2', 'They have the sole rights to the Intellectual Property and that it is not encumbered in any manner whatsoever;', 20);
  addClause('9.5.1.3', 'No third person has any claim to or interest of any nature in the Intellectual Property;', 20);
  addClause('9.5.1.4', 'Neither the Intellectual Property nor its use constitutes an infringement of the Intellectual Property Rights of any other person.', 20);
  addClause('9.5.1.5', 'If it is established that such use infringes any third party\'s intellectual property right, the infringing party shall at its own expense and risk take such measures as to ensure that the infringement is obviated and that the non-infringing party\'s use of the information is not affected;', 20);
  addClause('9.5.1.5.1', 'shall procure a license or similar authority for the non-infringing party to use the Intellectual Property without liability for infringement; or', 40);
  addClause('9.5.1.5.2', 'shall replace or modify the Intellectual Property so that it does not infringe the rights of a third party while retaining equivalent functionality.', 40);
  y -= 20;

  // === 7. REVENUE (Renumbered from 10, Updated) ===
  addHeading('7. REVENUE, MONETARY ARRANGEMENTS, AND RELATED RESPONSIBILITIES', 'section');
  addClause('7.1.1', 'All costs for setting up the official account of CDSA in the Registry/Registries have been the responsibility of CDSA.');
  addClause('7.1.2', 'CDSA shall cover the costs for the registry account in which the issued carbon credits will be held. The Owner shall not be liable for these costs.');
  addClause('7.1.3', 'CDSA shall cover the fees associated with engaging a VVB for the purposes of validating the Project and verifying the Carbon Credits generated. The Owner shall not be liable for these costs.');
  addClause('7.1.4', 'CDSA shall be responsible for the sale of the Carbon Credits generated by the Project. The decision as to when and how to sell the Carbon Credits, including the choice of buyer, shall be at the sole discretion of CDSA. CDSA shall ensure transparency in the sales process by providing periodic updates to the Owner, including relevant market insights and pricing trends, to keep the Owner informed of the status and performance of the Carbon Credits.');
  addClause('7.1.5', 'Additionally, CDSA shall exercise its discretion in determining the entities to which the Carbon Credits will be sold. This discretion encompasses the selection of interested parties and the negotiation of terms for the sale of the Carbon Credits.');
  addClause('7.1.6', 'Revenue paid out to the owner is stipulated as per the signed proposal.');
  addClause('7.1.7', 'Or to retain and hold the Carbon Credits in its own name. If the Owner elects to hold the Carbon Credits, all costs and fees related to issuance, transfer, registration, or ongoing management shall be for the Owner\'s account, and CDSA or Crunch Carbon shall bear no responsibility or liability for such costs or activities.');
  addClause('7.1.8', 'It is specifically recorded and agreed that the transfer of the revenue to the Aggregator and subsequently to the owner shall be conducted periodically on an annual basis throughout the subsistence of this Cession Agreement.');
  addClause('7.1.9', 'Feedback will be provided at least quarterly or as required by the project owners.');
  y -= 20;

  // === 8. INCORPORATION (Renumbered from 11) ===
  addHeading('8. INCORPORATION OF THIS AGREEMENT INTO THE PROVISIONS OF THE AGREEMENT', 'section');
  addClause('8.1', 'It is specifically agreed that this Agreement shall form an integral and indivisible part of this Cession Agreement, to the extent that the content of this Agreement, including subsequent amendments made to this Agreement, shall be regarded by the parties as fully incorporated into the provisions of this Cession Agreement.');
  y -= 20;

  // === 9. TERMINATION (Renumbered from 12, Added 9.2) ===
  addHeading('9. TERMINATION', 'section');
  addClause('9.1', 'This Agreement may be terminated at any time by either of the parties hereto, provided that such consent to terminate is in writing and is signed by the party who wants to cancel.');
  addClause('9.1.1', 'In the case of termination the terminating party must provide 30 days of written notice to the other party.', 20);
  addClause('9.1.2', 'Data extraction will be terminated as from the last day of the 30-day notice period.', 20);
  addClause('9.1.3', 'n/a', 20);
  addClause('9.2', 'The Owner may request the removal of a specific Unit by giving 30 days written notice. Such removal applies only to future periods and shall not reverse cessions already utilised for audits, submissions or issued vintages.');
  addClause('9.3', 'Other than Clause 9.1 either party will be entitled to terminate the agreement by providing 30-days written notice to the other in the event of:');
  addClause('9.3.1', 'the other party committing a breach of the terms and conditions of this Cession Agreement, all of which are declared to be material and failing to remedy the breach within 14 (Fourteen) days of written notice calling upon the other party to remedy the breach complained of;', 20);
  addClause('9.3.1.1', 'In the event of either of the Parties ("the defaulting party") committing a breach of any of the terms of this Cession Agreement and failing to remedy such breach within a period of 14 (Fourteen) days after receipt of a written notice from the other party ("the aggrieved party") calling upon the defaulting party so to remedy, then the aggrieved party shall be entitled, either claims specific performance of the terms of this Cession Agreement or to cancel this Cession Agreement forthwith and without further notice.', 40);
  addClause('9.3.1.2', 'the other party committing an act of insolvency or being sequestrated/liquidated or being placed under a provisional or final winding-up or judicial management order or if the other party makes an assignment for the benefit of creditors.', 40);
  addClause('9.4', 'The termination of this Cession Agreement, for whatever reason, will not affect the rights of a party which may have accrued as at the date of termination and will further not affect any rights and obligations which specifically or by their nature survive the termination of this Cession Agreement.');
  y -= 20;

  // === 10. DISPUTE RESOLUTION (Renumbered from 13) ===
  addHeading('10. DISPUTE RESOLUTION', 'section');
  addClause('10.1', 'In the event of a dispute arising from, or incidental to, this Cession Agreement, the Parties agree to submit the matter for mediation and failing which to arbitration.');
  addClause('10.2', 'Notwithstanding the above provisions, the Parties will be entitled to approach a Court of competent jurisdiction for urgent relief.');
  y -= 20;

  // === 11. ARBITRATION (Renumbered from 14, Updated 11.5) ===
  addHeading('11. ARBITRATION', 'section');
  addClause('11.1', 'Save where otherwise provided for in this Cession Agreement, any dispute between the Parties hereto (and which dispute has previously been submitted to mediation without resolution) in regard to:');
  addClause('11.1.1', 'the interpretation of; or', 20);
  addClause('11.1.2', 'the effect of; or', 20);
  addClause('11.1.3', 'the carrying out of; or', 20);
  addClause('11.1.4', 'any other matter arising directly or indirectly out of, this Cession Agreement, shall be submitted to and decided by arbitration.', 20);
  addClause('11.2', 'The arbitration shall be held informally but otherwise under the provisions of the Arbitration Act No.42 of 1965, as amended from time to time, or any Act passed in substitution for it; it being the intention as far as possible that the arbitration shall be held and concluded within 21 (twenty one) days after it has been demanded by way of written notice of either party to the other party. The Parties shall be entitled to be represented at the arbitration.');
  addClause('11.3', 'The arbitrator shall be, if the matter in issue is:');
  addClause('11.3.1', 'primarily an accounting matter an independent chartered accountant of not less than 15 (Fifteen) years\' standing, practising as a registered auditor, agreed upon between the Parties;', 20);
  addClause('11.3.2', 'primarily a legal matter a practising attorney of not less than 15 (Fifteen) years\' standing, agreed upon between the Parties;', 20);
  addClause('11.3.3', 'any other matter an independent person agreed upon between the Parties.', 20);
  addClause('11.4', 'If the Parties cannot agree whether any matter in dispute falls under the clauses mentioned hereinabove within 7 (seven) days after arbitration has been demanded, then that dispute shall be submitted for decision in terms of clause 15.3.3 above within 7 (seven) days after the Parties have so failed to agree, in order that the arbitration can be held and concluded as far as possible within a period of 21 (twenty one) days referred to above.');
  addClause('11.5', 'If the Parties fail to agree on the appointment of an arbitrator, such failure to agree shall be referred to the Attorneys\' Association of Gauteng in order for the Association to appoint an arbitrator.');
  addClause('11.6', 'The decision of the arbitrator shall be final and binding upon the Parties and shall be carried into effect by them and made an order of any competent Court, including any decision regarding the costs of the arbitration which the arbitrator shall be empowered to make.');
  addClause('11.7', 'Notwithstanding the foregoing, any party shall be entitled to approach any court of competent jurisdiction for urgent relief.');
  y -= 20;

  // === 12. FORCE MAJEURE (Renumbered from 15) ===
  addHeading('12. FORCE MAJEURE', 'section');
  addClause('12.1', 'A party is not liable for a failure to perform any of its obligations in so far as it proves:');
  addClause('12.1.1', 'that the failure was due to an impediment beyond its control.', 20);
  addClause('12.1.2', 'that it could not reasonably be expected to have taken the impediment and its effects upon the party\'s ability to perform into account at the time of the conclusion of the contract; and', 20);
  addClause('12.1.3', 'that it could not reasonably have avoided or overcome the impediment or at least its effects.', 20);
  addClause('12.2', 'An impediment under clause 16.1.1 may result from events such as the following, this enumeration not being exhaustive:');
  addClause('12.2.1', 'war, whether declared or not, civil war, civil violence, riots and revolutions, acts of piracy, acts of sabotage.', 20);
  addClause('12.2.2', 'natural disasters such as violent storms, cyclones, earthquakes, tidal waves, floods, destruction by explosions, fires, destruction of machines, of factories and of any kind of installations.', 20);
  addClause('12.2.3', 'boycotts, strikes and lockouts of all kinds, go-slows, occupation of factories and premises, and work stoppages.', 20);
  addClause('12.2.5', 'acts of authority, whether lawful or unlawful, apart from acts for which the party seeking relief has assumed the risk by virtue of any other provisions of this Cession Agreement.', 20);
  addClause('12.3', 'Relief from liability for non-performance by reason of the provisions of this clause shall commence on the date upon which the party seeking relief gives notice of the impediment relied upon and shall terminate upon the date upon which such impediment ceases to exist, provided that if such impediment continues for a period of more than 30 (THIRTY) days, either party shall be entitled to terminate this Cession Agreement by written notice to the other party, without cause, penalty, claim or obligation in respect of any loss suffered or damages incurred as a result of such cancellation.');
  y -= 20;

  // === 13. DOMICILIUM (Renumbered from 16) ===
  addHeading('13. DOMICILIUM CITANDI ET EXECUTANDI AND NOTICES', 'section');
  addClause('13.1', 'The Parties choose as their domicilia citandi et executandi their respective addresses as set out hereinabove for all purposes arising out of or in connection with this Agreement at which physical or electronic mail addresses all processes and notices arising out of or in connection with this Agreement, its breach or termination may validly be served upon or delivered to the Parties.');
  addClause('13.2', 'Any notice, consent or other communication required or permitted hereunder from either party shall be in writing. and shall');
  addClause('13.2.1', 'if delivered by hand be deemed to have been duly received by the addressee on the date of delivery;', 20);
  addClause('13.2.2', 'if transmitted by facsimile or electronic mail be deemed to have been received by the addressee on the day following the date of transmission, unless the contrary is proved.', 20);
  addClause('13.3', 'Notwithstanding anything to the contrary contained or implied in this Agreement, a written notice or communication actually received by one of the Parties from another including by way electronic mail transmission shall be adequate written notice or communication to such party.');
  y -= 20;

  // === 14. TERMINATION ASSISTANCE (Renumbered from 17) ===
  addHeading('14. TERMINATION / EXPIRATION ASSISTANCE', 'section');
  drawText('On the expiration or termination of this Cession Agreement the Parties shall make themselves available for an exit meeting for the discussion and implementation of termination/expiration assistance.', 10, fonts.regular);
  y -= 20;

  // === 15. GENERAL (Renumbered from 18) ===
  addHeading('15. GENERAL', 'section');
  addClause('15.1', 'No waiver, extension of time or other indulgence which may be given or allowed by either party in respect of the performance of any obligation hereunder, and no delay or forbearance in the enforcement of any right of either party arising from this agreement, and no single or partial exercise of any right by either party under this agreement, shall in any circumstances be construed to be an implied consent or election by either party or operate as a waiver or a novation of or otherwise affect any of either party\'s rights in terms of or arising from this agreement or estop or preclude either party from enforcing at any time and without notice, strict and punctual compliance with each and every provision or term hereof.');
  addClause('15.2', 'This agreement constitutes the entire agreement between the parties who acknowledge that there are no other oral or written understandings or agreements between them relating to the subject matter of this agreement. No amendment, consensual cancellation or other modification of this agreement shall be valid or binding on a party hereto unless reduced to writing and executed by both parties and agreed to be attached hereto as a further Appendix.');
  addClause('15.3', 'Each and every provision of this agreement (excluding only those provisions which are essential at law for a valid and binding agreement to be constituted) shall be deemed to be separate and severable from the remaining provisions of this agreement. If any of the provisions of this agreement (excluding only those provisions which are essential at law for a valid and binding agreement to be constituted) is found by any court of competent jurisdiction to be invalid and/or unenforceable then, notwithstanding such invalidity and/or unenforceability, the remaining provisions of this agreement shall be and remain of full force and effect.');
  addClause('15.4', 'The expiration, cancellation or other termination of this agreement shall not affect those provisions of this agreement which expressly provide that they will operate after such expiration, cancellation or other termination or which of necessity must continue to endure after such expiration, cancellation or other termination, notwithstanding that the relevant clause may not expressly provide for such continuation.');
  addClause('15.5', 'Neither parties may not assign, transfer, sub-contract or otherwise part with this agreement or any part thereof or any right or obligation under it, without obtaining the other party\'s prior written consent thereto. Consent would not be unreasonably withheld.');
  addClause('15.6', 'This agreement may be executed in one or more counterparts, each of which shall be deemed an original and all of which shall be taken together and deemed to be one instrument.');
  addClause('15.7', 'The Parties agree that the current operation and identity of each shall not be altered, unless it is agreed otherwise and reduced into writing.');
  addClause('15.8', 'The undersigned hereby warrants and represents that they possess complete authority to enter into and execute this agreement on behalf of the party herein, in accordance with the duly conferred authorization to represent said party, and that such execution and performance of this agreement have been duly authorized by all requisite corporate or legal actions. Additionally, the undersigned undertakes to indemnify and absolve the other party from any and all claims, losses, or damages stemming from any breach of the aforementioned warranty.');
  addClause('15.9', 'Each Party recognizes that this Cession Agreement is a legally binding contract and acknowledges that such party has had the opportunity to consult with legal counsel of choice. Each party has reviewed this agreement, and any question of interpretation shall not be resolved by any rule of Interpretation providing for interpretation against the drafting party. This agreement shall be construed as though drafted by the parties.');
  y -= 30;

  // === SIGNATURE BLOCK (Updated with witness names) ===
  drawText('THUS, DONE AND SIGNED AT __________________________________ ON THIS', 10, fonts.regular);
  drawText(`DATE ${data.signingDate} IN THE PRESENCE OF THE UNDERSIGNED WITNESSES.`, 10, fonts.regular);
  y -= 20;

  drawText('AS WITNESSES:', 10, fonts.bold);
  y -= 30;
  drawText('1. __________________________________', 10, fonts.regular);
  y -= 15;
  drawText('2. __________________________________', 10, fonts.regular);
  y -= 20;
  drawText(`_________________________________ FOR: "${data.ownerName}" (Owner)`, 10, fonts.regular);
  y -= 30;

  drawText('THUS, DONE AND SIGNED AT SANDTON JOHANNESBURG ON THIS', 10, fonts.regular);
  drawText(`DATE ${data.signingDate} IN THE PRESENCE OF THE UNDERSIGNED WITNESSES.`, 10, fonts.regular);
  y -= 20;

  drawText('AS WITNESSES:', 10, fonts.bold);
  y -= 30;
  drawText('1. ANDREW D. STOCKIL', 10, fonts.regular);
  y -= 15;
  drawText('2. JOHANITA BURGER', 10, fonts.regular);
  y -= 20;
  drawText('FOR: __________________________________ Crunch Carbon Pty (Ltd)', 10, fonts.regular);
}
