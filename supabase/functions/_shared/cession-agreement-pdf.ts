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

  // Crunch Carbon details
  drawText('Crunch Carbon Pty (Ltd)', 11, fonts.bold, textColor, 20);
  drawText('Registration Number: 2019/54306/07', 10, fonts.regular, textColor, 20);
  drawText('acting as aggregator on behalf of Carbon Disclosure South Africa (Pty) Ltd (CDSA)', 10, fonts.regular, textColor, 20);
  drawText('CDSA Registration Number: 2009/023392/07', 10, fonts.regular, textColor, 20);
  drawText('Address: 4 Sandown Valley Crescent, Sandown, Sandton, 2031', 10, fonts.regular, textColor, 20);
  y -= 5;
  drawText('(the "Aggregator" or "Crunch Carbon")', 10, fonts.regular, textColor, 20);
  y -= 15;

  drawText('And', 12, fonts.bold, textColor, MAX_WIDTH / 2 - 20);
  y -= 15;

  // Owner details
  drawText(data.ownerName, 11, fonts.bold, textColor, 20);
  if (data.registrationNumber !== "Not Applicable") {
    drawText(`Registration Number: ${data.registrationNumber}`, 10, fonts.regular, textColor, 20);
  }
  drawText(`Address: ${data.companyAddress}`, 10, fonts.regular, textColor, 20);
  drawText(`Email: ${data.ownerEmail}`, 10, fonts.regular, textColor, 20);
  y -= 5;
  drawText('(the "Owner")', 10, fonts.regular, textColor, 20);
  y -= 25;

  // === PREAMBLE ===
  addHeading('PREAMBLE', 'section');
  addClause('1.1', 'CDSA has developed specialized Intellectual Property for the purposes of commercializing Carbon Credits generated from solar PV installations for the purposes of implementing carbon offset programmes.');
  addClause('1.2', "CDSA's program for the commercialisation of Carbon Credits is officially recognized under the Verified Carbon Standard (VCS) and is registered on the Verra Registry under programme ID #3945.");
  addClause('1.3', 'The Owner is the legal owner of the environmental benefits that accrue from the generation of electricity from its solar photovoltaic installation located on the Premises.');
  addClause('1.4', 'Simultaneously, with this Agreement, the Parties have entered into, or will enter into a Memorandum of Agreement.');
  addClause('1.5', "The Parties have agreed to work together with the aim of leveraging CDSA's Intellectual Property to commercialize the environmental benefits of the Owner's installation(s).");
  addClause('1.6', 'The Owner is the sole party entitled to cede the environmental benefits and has decided to cede such environmental benefits to Crunch Carbon on behalf of CDSA.');
  addClause('1.7', 'The Owner has an obligation to provide accurate Data for the purposes of commercializing carbon credits, and further, the Owner has the right to receive a percentage of the revenue derived from the sale of such commercialized carbon credits.');
  addClause('1.8', 'The Aggregator has an obligation to facilitate the commercialization of the carbon credits through the services of CDSA.');
  y -= 10;
  drawText('Now Therefore, it is agreed as follows:', 11, fonts.bold);
  y -= 20;

  // === 2. INTERPRETATION ===
  addHeading('2. INTERPRETATION AND PRELIMINARY', 'section');
  addClause('2.1', 'The headings to the clauses to this Agreement are inserted for reference purposes only and shall in no way govern or affect the interpretation of, or be taken into consideration in interpreting, any of the terms and conditions of this Agreement.');
  addClause('2.2', 'Unless inconsistent with the context, an expression which denotes any gender includes the other genders, a natural person includes an artificial person and vice versa, and the singular includes the plural and vice versa.');
  addClause('2.3', 'Where any term is defined within a particular clause other than this clause, that term shall bear the meaning ascribed to it in that clause wherever it is used in this Agreement.');
  addClause('2.4', 'This Agreement shall in all respects be governed by, interpreted and construed in accordance with the law of the Republic of South Africa.');
  y -= 20;

  // === 3. DEFINITIONS ===
  addHeading('3. DEFINITIONS', 'section');
  addClause('3.1', '"Aggregator" means Crunch Carbon (Pty) Ltd, a company duly incorporated in accordance with the company laws of South Africa, with registration number 2019/54306/07.');
  addClause('3.2', '"Agreement" means this Carbon Right Cessionary Agreement including all annexures and schedules.');
  addClause('3.3', '"Carbon Credit" means one (1) tonne (metric ton) of carbon dioxide equivalent (CO2e) GHG emission reductions or removals.');
  addClause('3.4', '"Carbon Offset" means an instrument representing the reduction, avoidance or sequestration of one metric tonne of carbon dioxide or carbon dioxide equivalent greenhouse gases.');
  addClause('3.5', '"CDSA" means Carbon Disclosure South Africa (Pty) Ltd, a company duly incorporated in accordance with the company laws of South Africa, with registration number 2009/023392/07.');
  addClause('3.6', '"Confidential Information" means all information of a confidential or proprietary nature (whether or not specifically identified as confidential), in any form or medium, that is disclosed or made available by a Party, directly or indirectly, to the other Party.');
  addClause('3.7', '"Data" means the information relating to the actual operation of the Project, particularly electricity consumption or generation data, depending on the scope of the Project, that is used for the purposes of generating and commercializing Carbon Credits, and includes such Data that is generated and collected prior to the Signature Date of this Agreement.');
  addClause('3.8', '"Day" means any day other than a Saturday, Sunday or official public holiday in the Republic of South Africa.');
  addClause('3.9', '"GHG" means the basket of six greenhouse gases listed in Annex A to the Kyoto Protocol: carbon dioxide (CO2), methane (CH4), nitrous oxide (N2O), hydrofluorocarbons (HFCs), perfluorocarbons (PFCs), and sulphur hexafluoride (SF6).');
  addClause('3.10', `"Installation date" means ${data.installationDate}.`);
  addClause('3.11', '"Knowledge" means the actual knowledge of the directors or executives or senior manager of such Party.');
  addClause('3.12', '"Law" means any applicable statute, regulation, by-law, ordinance or subordinate legislation in force from time to time, and will include any applicable industry code, policy or standard enforceable by law, any applicable direction, policy, rule or order that is made or given by any regulatory body, governmental department, governmental, inter-governmental or supranational body, agency, department or regulatory, self-regulatory or other authority or organisation and that is made or given under any statute, regulation, by-law, ordinance or subordinate legislation (or under any such industry code, policy or standard), and any applicable judgment or order of any court of law.');
  addClause('3.13', '"Intellectual Property" means all intellectual property developed by or for CDSA and includes:');
  addClause('3.13.1', 'methodologies (including the methodology approved by Verra);', 20);
  addClause('3.13.2', 'tools and calculation methods including baselines and assumptions;', 20);
  addClause('3.13.3', 'reports and disclosures;', 20);
  addClause('3.13.4', 'procedures and processes;', 20);
  addClause('3.13.5', 'systems and software;', 20);
  addClause('3.13.6', 'all data, formulas, know-how and ideas;', 20);
  addClause('3.13.7', 'all trademarks and copyright; and', 20);
  addClause('3.13.8', "any other information that can be connected to CDSA's carbon offset programme.", 20);
  addClause('3.14', `"Owner" means ${data.ownerName}.`);
  addClause('3.15', '"Parties" means the Aggregator and the Owner, jointly; and Party means either one of them.');
  addClause('3.16', '"Person" means any natural or juristic person and includes any trust, association, partnership or other entity.');
  addClause('3.17', `"Premises" means the property located at ${data.premisesAddress}.`);
  addClause('3.18', '"Project" means solar photovoltaic installation(s) owned by the Owner and located on the Premises.');
  addClause('3.19', '"Project Activity" means the generation of electricity from grid-connected solar photovoltaic systems that constitutes the activity undertaken by the Project that generates GHG emission reductions or removals.');
  addClause('3.20', '"Registry" means Verra Registry or any other internationally recognized carbon credit registry approved by the Parties.');
  addClause('3.21', `"Signature Date" means ${data.signingDate}.`);
  addClause('3.22', '"Site visit" means a physical visit to the Premises by a representative of CDSA or Crunch Carbon or a VVB.');
  addClause('3.23', '"Unit" means a Verified Carbon Unit (VCU) issued by Verra or equivalent unit issued by another Registry.');
  addClause('3.24', '"VVB" means an accredited Validation and Verification Body approved by Verra or other relevant Registry to validate and verify carbon credit projects.');
  addClause('3.25', 'Any reference to an enactment is to that enactment as at the Signature Date and as amended or re-enacted from time to time.');
  addClause('3.26', 'References to clauses are to clauses of this Agreement unless otherwise stated.');
  addClause('3.27', 'Any phrase introduced by the terms "including", "include", "in particular" or any similar expression shall be construed as illustrative and shall not limit the sense of the words preceding those terms.');
  y -= 20;

  // === 4. NATURE OF AGREEMENT ===
  addHeading('4. NATURE OF AGREEMENT AND OBLIGATIONS OF THE OWNER', 'section');
  addClause('4.1', 'The Owner acknowledges that by entering into the Agreement, it agrees to participate in the programme and to be bound by the programme requirements as developed and managed by CDSA.');
  addClause('4.2', 'Specifically, the Owner acknowledges and agrees that wherever this Agreement refers to the definitions as contained in clause 3, such definitions correspond to the definitions contained in the methodology and programme.');
  addClause('4.3', 'The Owner has the right to request information relating to the programme from Crunch Carbon or CDSA and Crunch Carbon or CDSA will use its reasonable endeavours to address any query relating to the programme within a reasonable timeframe.');
  addClause('4.4', 'The Owner acknowledges and agrees that it has the following responsibilities:');
  addClause('4.4.1', 'to provide Data to Crunch Carbon or CDSA for the purposes of generating and commercializing Carbon Credits;', 20);
  addClause('4.4.2', 'to afford CDSA, Crunch Carbon or a VVB reasonable access to the Premises and systems for the purposes of Site visits or audits required for the programme;', 20);
  addClause('4.4.3', 'that the Data the Owner provides to Crunch Carbon or CDSA is used exclusively by CDSA for the purposes of commercializing the Carbon Credits in accordance with this Agreement and the methodology and programme;', 20);
  addClause('4.4.4', 'to cede, for the benefit of CDSA, the rights to the environmental benefits associated with the Project Activity to CDSA as set out in this Agreement; and', 20);
  addClause('4.4.5', "not to disclose CDSA's Intellectual Property to any third party or to use such Intellectual Property for the Owner's own benefit or the benefit of any third party.", 20);
  y -= 20;

  // === 5. CESSION OF RIGHTS ===
  addHeading('5. CESSION OF RIGHTS TO CDSA', 'section');
  addClause('5.1', 'Subject to and in accordance with the provisions of this Agreement, the Owner hereby irrevocably and unconditionally cedes, assigns, delegates and makes over to Crunch Carbon on behalf of CDSA all of its right, title, interest and benefit (both present and future) in and to the rights to the environmental benefits that accrue from the Project Activity.');
  addClause('5.2', 'The transfer of the rights contemplated in this clause shall be effective from the Installation date.');
  addClause('5.3', 'Notwithstanding any termination of this Agreement, the Intellectual Property of CDSA will endure beyond such termination.');
  addClause('5.4', "Notwithstanding clause 5.3, the Owner's rights to revenue will terminate upon termination of this Agreement.");
  addClause('5.5', 'In the event that the Owner intends to sell the Premises, the Owner shall provide Crunch Carbon or CDSA with at least 30 (thirty) Days\' written notice prior to such sale.');
  y -= 20;

  // === 6. REPRESENTATIONS ===
  addHeading('6. REPRESENTATIONS AND WARRANTIES', 'section');
  addClause('6.1', 'The Owner represents and warrants to CDSA and Crunch Carbon that:');
  addClause('6.1.1', 'it has full power and authority to enter into and perform its obligations under this Agreement;', 20);
  addClause('6.1.2', 'it is the lawful owner of the Project and the environmental benefits that accrue from the Project Activity;', 20);
  addClause('6.1.3', 'the environmental benefits are free from any encumbrances, liens, charges or other third-party rights;', 20);
  addClause('6.1.4', 'the cession of rights contemplated in this Agreement does not and will not violate any Law or agreement to which the Owner is a party;', 20);
  addClause('6.1.5', 'it has not previously ceded, sold, transferred or otherwise disposed of the environmental benefits to any other person; and', 20);
  addClause('6.1.6', 'to the best of its Knowledge, it has not received any subsidy or other financial support from any governmental or quasi-governmental entity specifically for the environmental benefits that would prohibit the commercialization of Carbon Credits from the Project Activity.', 20);
  y -= 20;

  // === 7. INDEMNITY ===
  addHeading('7. INDEMNITY', 'section');
  addClause('7.1', 'The Owner indemnifies and holds harmless Crunch Carbon on behalf of CDSA, its directors, officers, employees, and agents against any and all claims, losses, damages, liabilities, costs and expenses (including reasonable legal fees) arising out of or in connection with any breach by the Owner of its representations, warranties or obligations under this Agreement.');
  addClause('7.2', '[Reserved]');
  y -= 20;

  // === 8. ACKNOWLEDGEMENT ===
  addHeading('8. ACKNOWLEDGEMENT AND ACCEPTANCE', 'section');
  drawText('CDSA acknowledges and accepts the cession of the rights to the environmental benefits in terms of clause 5 and assumes all rights and obligations of the cessionary under this Agreement.', 10, fonts.regular);
  y -= 20;

  // === 9. IP PROTECTION ===
  addHeading('9. PROTECTION OF CRUNCH CARBON AND CDSA\'S INTELLECTUAL PROPERTY', 'section');
  addClause('9.1', 'The Owner acknowledges that all Intellectual Property used in connection with the commercialization of the Carbon Credits belongs to and shall remain the property of CDSA and is confidential and proprietary to CDSA.');
  addClause('9.2', 'The Owner acknowledges that it may have access to certain Intellectual Property for the limited purpose of participating in the programme and that such access does not confer any ownership rights in the Intellectual Property.');
  addClause('9.3', 'The Owner undertakes not to disclose any Intellectual Property to any third party without the prior written consent of CDSA and to use the Intellectual Property solely for the purpose of participating in the programme.');
  addClause('9.4', 'Nothing in this Agreement shall be construed as conferring any license or right to use the Intellectual Property for any purpose other than as expressly provided in this Agreement.');
  addClause('9.5', 'The Owner warrants that:');
  addClause('9.5.1', "it will not infringe CDSA's Intellectual Property and specifically:", 20);
  addClause('9.5.1.1', 'it will not copy, reproduce, distribute, modify, or create derivative works of the Intellectual Property;', 40);
  addClause('9.5.1.2', 'it will not reverse engineer, decompile, or disassemble any software that forms part of the Intellectual Property;', 40);
  addClause('9.5.1.3', 'it will not remove, alter, or obscure any copyright, trademark, or other proprietary rights notices from the Intellectual Property;', 40);
  addClause('9.5.1.4', 'it will not use the Intellectual Property to develop competing products or services; and', 40);
  addClause('9.5.1.5', 'it will not:', 40);
  addClause('9.5.1.5.1', 'sell, rent, lease, sublicense, or transfer the Intellectual Property to any third party; and', 60);
  addClause('9.5.1.5.2', 'use the Intellectual Property for any unlawful purpose or in any manner inconsistent with this Agreement.', 60);
  y -= 20;

  // === 10. REVENUE ARRANGEMENTS ===
  addHeading('10. REVENUE, MONETARY ARRANGEMENTS, AND RELATED RESPONSIBILITIES', 'section');
  addClause('10.1', 'CDSA shall:');
  addClause('10.1.1', 'establish and maintain an account with the Registry for the issuance and holding of Carbon Credits generated from the Project;', 20);
  addClause('10.1.2', 'be responsible for all costs associated with establishing and maintaining the Registry account;', 20);
  addClause('10.1.3', 'be responsible for all fees charged by VVBs for validation and verification services and any audit fees;', 20);
  addClause('10.1.4', 'coordinate the sale of Carbon Credits and actively seek buyers;', 20);
  addClause('10.1.5', 'have sole discretion in selecting buyers and negotiating sale terms, provided that CDSA acts in good faith and with reasonable commercial judgment;', 20);
  addClause('10.1.6', `distribute revenue from Carbon Credit sales, with the Owner entitled to receive ${data.ownerPercentage}% of the gross revenue received from the sale of Carbon Credits; and`, 20);
  addClause('10.1.7', "transfer the Owner's share of revenue on a periodic basis as Carbon Credits are sold and payment is received, typically within 30 (thirty) Days of receipt of payment from buyers.", 20);
  y -= 20;

  // === 11. INCORPORATION ===
  addHeading('11. INCORPORATION OF THIS AGREEMENT INTO THE PROVISIONS OF THE AGREEMENT', 'section');
  addClause('11.1', 'This Agreement forms an integral part of the main agreement between the Parties, and all subsequent amendments to that agreement shall be deemed to be incorporated into this Agreement.');
  y -= 20;

  // === 12. TERMINATION ===
  addHeading('12. TERMINATION', 'section');
  addClause('12.1', 'This Agreement may be terminated by mutual consent of the Parties, provided that:');
  addClause('12.1.1', "either Party may terminate this Agreement by giving the other Party not less than 30 (thirty) Days' prior written notice;", 20);
  addClause('12.1.2', 'the termination of this Agreement shall be triggered by the termination of the extraction of Data from the Project;', 20);
  addClause('12.1.3', "upon termination, the Owner shall be responsible for requesting removal of the Project from CDSA's GHG register;", 20);
  addClause('12.1.4', 'either Party may terminate this Agreement if the other Party commits a material breach of this Agreement;', 20);
  addClause('12.1.5', 'the Party in breach shall have 14 (fourteen) Days from the date of receipt of written notice to remedy the breach, failing which:', 20);
  addClause('12.1.5.1', 'the aggrieved Party shall be entitled to claim specific performance or cancel this Agreement and claim damages; and', 40);
  addClause('12.1.5.2', 'either Party may terminate this Agreement immediately if the other Party becomes insolvent, enters into liquidation (whether voluntary or compulsory), or enters into any compromise or arrangement with creditors.', 40);
  addClause('12.2', 'Termination of this Agreement shall not affect any rights or obligations that have accrued prior to the date of termination.');
  y -= 20;

  // === 13. DISPUTE RESOLUTION ===
  addHeading('13. DISPUTE RESOLUTION', 'section');
  addClause('13.1', 'In the event of any dispute arising out of or in connection with this Agreement, the Parties shall first attempt to resolve the dispute through mediation, and if mediation is unsuccessful, the dispute shall be referred to arbitration in accordance with clause 14.');
  addClause('13.2', 'Nothing in this clause shall prevent either Party from seeking urgent interim relief from a court of competent jurisdiction.');
  y -= 20;

  // === 14. ARBITRATION ===
  addHeading('14. ARBITRATION', 'section');
  addClause('14.1', 'Any dispute which has not been resolved in terms of clause 13 shall be submitted to arbitration.');
  addClause('14.2', 'The arbitration shall be conducted in accordance with the provisions of the Arbitration Act, 1965, and shall be held within 21 (twenty-one) Days of the dispute being referred to arbitration.');
  addClause('14.3', 'The arbitrator shall be a person with expertise in accounting, legal matters, or such other field as may be appropriate to the dispute.');
  addClause('14.4', "If the Parties fail to agree on the appointment of an arbitrator within 7 (seven) Days of the dispute being referred to arbitration, the arbitrator shall be appointed by the Chairperson of the relevant Provincial Attorneys' Association.");
  addClause('14.5', '[Reserved]');
  addClause('14.6', 'The decision of the arbitrator shall be final and binding on the Parties.');
  addClause('14.7', 'The provisions of this clause shall not prevent either Party from obtaining urgent interim relief from a court of competent jurisdiction pending the outcome of the arbitration.');
  y -= 20;

  // === 15. FORCE MAJEURE ===
  addHeading('15. FORCE MAJEURE', 'section');
  addClause('15.1', 'Neither Party shall be liable to the other for any delay or failure to perform any of its obligations under this Agreement to the extent that such delay or failure is caused by an event of force majeure, provided that:');
  addClause('15.1.1', 'the event is beyond the reasonable control of the affected Party;', 20);
  addClause('15.1.2', 'the affected Party could not have avoided the event by taking reasonable precautions; and', 20);
  addClause('15.1.3', 'the affected Party has taken all reasonable steps to mitigate the effects of the event.', 20);
  addClause('15.2', 'Events of force majeure include, but are not limited to:');
  addClause('15.2.1', 'war, invasion, act of foreign enemies, hostilities, civil war, rebellion, revolution, insurrection, or military or usurped power;', 20);
  addClause('15.2.2', 'natural disasters such as earthquakes, floods, storms, or other acts of God;', 20);
  addClause('15.2.3', 'explosions, fires, or destruction of equipment;', 20);
  addClause('15.2.4', 'strikes, lockouts, or other industrial action; and', 20);
  addClause('15.2.5', 'any act or omission of any governmental or other authority.', 20);
  addClause('15.3', 'If an event of force majeure continues for a period exceeding 30 (thirty) Days, either Party may terminate this Agreement by giving written notice to the other Party, and such termination shall take effect from the date of commencement of the event of force majeure.');
  y -= 20;

  // === 16. DOMICILIUM ===
  addHeading('16. DOMICILIUM CITANDI ET EXECUTANDI AND NOTICES', 'section');
  addClause('16.1', 'The Parties choose as their domicilium citandi et executandi for all purposes under this Agreement the following addresses:');
  y -= 5;
  drawText('Owner:', 10, fonts.bold, textColor, 20);
  drawText(`Physical address: ${data.companyAddress}`, 10, fonts.regular, textColor, 40);
  drawText(`Email: ${data.ownerEmail}`, 10, fonts.regular, textColor, 40);
  y -= 10;
  drawText('Crunch Carbon on behalf of CDSA:', 10, fonts.bold, textColor, 20);
  drawText('Physical address: 4 Sandown Valley Crescent, Sandown, Sandton, 2031', 10, fonts.regular, textColor, 40);
  drawText('Email: info@crunchcarbon.com', 10, fonts.regular, textColor, 40);
  y -= 10;
  addClause('16.2', 'Any notice or communication required or permitted to be given in terms of this Agreement shall be valid and effective only if in writing and:');
  addClause('16.2.1', 'delivered by hand, in which case it shall be deemed to have been received on the date of delivery; or', 20);
  addClause('16.2.2', 'sent by fax or email, in which case it shall be deemed to have been received on the Day following the date of transmission.', 20);
  addClause('16.3', "Notwithstanding the provisions of clause 16.2, any notice or communication actually received by a Party shall be deemed to be adequate notice or communication to that Party, notwithstanding that it was not sent to or delivered at the Party's chosen address.");
  y -= 20;

  // === 17. TERMINATION ASSISTANCE ===
  addHeading('17. TERMINATION/EXPIRATION ASSISTANCE', 'section');
  drawText('Upon termination or expiration of this Agreement, the Parties shall meet to discuss any outstanding matters relating to the termination or expiration of this Agreement.', 10, fonts.regular);
  y -= 20;

  // === 18. GENERAL ===
  addHeading('18. GENERAL', 'section');
  addClause('18.1', 'No Party shall be deemed to have waived any right under this Agreement unless such waiver is in writing and signed by the Party granting the waiver.');
  addClause('18.2', 'This Agreement constitutes the entire agreement between the Parties in relation to the subject matter hereof and supersedes all prior agreements, understandings and arrangements between the Parties, whether written or oral.');
  addClause('18.3', 'If any provision of this Agreement is found to be invalid, unlawful or unenforceable, such provision shall be severed from the remainder of this Agreement, which shall continue to be valid and enforceable.');
  addClause('18.4', 'The provisions of this Agreement which by their nature are intended to survive termination or expiration shall survive any termination or expiration of this Agreement.');
  addClause('18.5', 'Neither Party shall be entitled to cede, assign or otherwise transfer any of its rights or obligations under this Agreement without the prior written consent of the other Party, which consent shall not be unreasonably withheld.');
  addClause('18.6', 'This Agreement may be executed in any number of counterparts, each of which when executed and delivered shall constitute an original, but all the counterparts together shall constitute one and the same instrument.');
  addClause('18.7', 'The Parties to this Agreement shall remain the Parties for the duration of this Agreement, and no new Party may be added or substituted without the written consent of all existing Parties.');
  addClause('18.8', 'Each Party warrants that it has the authority to enter into this Agreement and that the person signing this Agreement on behalf of that Party has the authority to bind that Party. Each Party indemnifies the other Party against any loss suffered as a result of any breach of this warranty.');
  addClause('18.9', 'Each Party acknowledges that it has had the opportunity to obtain independent legal advice before signing this Agreement.');
  y -= 20;

  // === 19. SIGNATURE ===
  addHeading('19. SIGNATURE', 'section');
  drawText(`THUS, DONE AND SIGNED AT SOUTH AFRICA ON THIS DATE ${data.signingDate} IN THE PRESENCE OF THE UNDERSIGNED WITNESSES.`, 10, fonts.bold);
  y -= 20;
  
  drawText('AS WITNESSES:', 10, fonts.bold);
  y -= 5;
  drawText('1. DIGITAL WITNESS 1', 10, fonts.regular, textColor, 20);
  drawText('(Digital verification upon client signature)', 9, fonts.regular, lightGray, 40);
  drawText('2. DIGITAL WITNESS 2', 10, fonts.regular, textColor, 20);
  drawText('(Digital verification upon client signature)', 9, fonts.regular, lightGray, 40);
  y -= 20;
  
  drawText('FOR AND ON BEHALF OF THE OWNER:', 10, fonts.bold);
  y -= 5;
  drawText(`Name: ${data.ownerName}`, 10, fonts.regular, textColor, 20);
  drawText('Signature: _____________________________', 10, fonts.regular, textColor, 20);
  drawText(`Date: ${data.signingDate}`, 10, fonts.regular, textColor, 20);
  y -= 20;
  
  drawText('FOR AND ON BEHALF OF CRUNCH CARBON PTY (LTD):', 10, fonts.bold);
  y -= 5;
  drawText('Witness: ANDREW D. STOCKIL', 10, fonts.regular, textColor, 20);
  drawText('Witness: JOHANITA BURGER', 10, fonts.regular, textColor, 20);

  console.log(`[Cession Agreement] Generated ${pdfDoc.getPageCount()} pages`);
}
