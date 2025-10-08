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
          <CardTitle>Terms and Conditions</CardTitle>
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
          <h2 className="text-2xl font-bold mb-6">CARBON RIGHTS CESSION AGREEMENT</h2>
          <p className="text-sm text-muted-foreground mb-4">Version 2.0</p>
          
          <div className="space-y-1 mb-6 text-sm">
            <div><strong>Date:</strong> {signingDate}</div>
            <div><strong>Place:</strong> {signingLocation}</div>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="font-semibold mb-2">PARTIES</h3>
              <div className="space-y-2">
                <p>
                  <strong>{ownerName}</strong>, with registration number <strong>{registrationNumber}</strong>, whose registered office is at <strong>{companyAddress}</strong>, contactable via email at <strong>{ownerEmail}</strong> (hereinafter referred to as <strong>"the Owner"</strong>);
                </p>
                <p className="text-center my-2"><em>and</em></p>
                <p>
                  <strong>Crunch Carbon Solutions (Pty) Ltd</strong>, a private company duly registered in accordance with the laws of South Africa with registration number 2018/318693/07, whose registered office is at Unit 3B, 5th Floor, Sovereign Quay, 32 Somerset Road, De Waterkant, Cape Town, 8001, contactable via email at info@crunchcarbon.com (hereinafter referred to as <strong>"Crunch Carbon"</strong>);
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2">RECITALS</h3>
              <div className="space-y-2">
                <p><strong>WHEREAS</strong></p>
                <div className="ml-4 space-y-2">
                  <p><strong>A.</strong> The Owner is the legal owner of solar photovoltaic (PV) system(s) generating electricity;</p>
                  <p><strong>B.</strong> The premises are located at <strong>{premisesAddress}</strong> (hereinafter referred to as <strong>"the Premises"</strong>);</p>
                  <p><strong>C.</strong> The system was installed on <strong>{installationDate}</strong> (hereinafter referred to as <strong>"the Installation"</strong>);</p>
                  <p><strong>D.</strong> The Installation enables the Owner to self-generate electrical energy on the Premises (hereinafter referred to as <strong>"the Energy"</strong>);</p>
                  <p><strong>E.</strong> The Energy generated by the Installation results in the Owner earning carbon offset credits for the reduced carbon emissions (hereinafter referred to as <strong>"the Carbon Credits"</strong>);</p>
                  <p><strong>F.</strong> The Owner is registered with the Department of Minerals and Energy of the Republic of South Africa as a self-generator of Energy and is bound to report all Energy generated in terms of the Electricity Regulation Act, 2006;</p>
                  <p><strong>G.</strong> The Owner wishes to cede the Carbon Credits earned on the Premises to Crunch Carbon in order to monetize the Carbon Credits, and Crunch Carbon is agreeable to accepting the cession of the Carbon Credits on the terms and conditions set out in this agreement.</p>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">INTRODUCTION TO THE PARTIES</h4>
              <p>The introduction by the Parties immediately preceding this clause forms part of this agreement.</p>
            </section>

            <section>
              <h4 className="font-semibold mb-2">1. DEFINITIONS</h4>
              <p className="mb-2">In this agreement, unless the context indicates otherwise –</p>
              <dl className="ml-6 space-y-2 text-sm">
                <div>
                  <dt className="font-semibold">"Business Day"</dt>
                  <dd className="ml-4">means any day other than a Saturday, Sunday or gazetted public holiday in the Republic of South Africa;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Carbon Credits"</dt>
                  <dd className="ml-4">means all carbon credits which may accrue to the Owner in respect of, or as a result of, the use of the Installation on the Premises, and shall include, without limitation, all rights, benefits, claims of whatsoever nature or description in relation to the use of the Installation on the Premises and shall include, without limitation, all carbon credits, renewable energy credits, carbon offset credits, certified emission reduction credits and carbon offset certificates;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Commencement Date"</dt>
                  <dd className="ml-4">has the meaning given to it in clause 4.1 of this agreement;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Crunch Carbon" or "Cessionary"</dt>
                  <dd className="ml-4">has the meaning given to it in the introduction to this agreement;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Effective Date"</dt>
                  <dd className="ml-4">means the date of the last of the Parties to sign this agreement;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Energy"</dt>
                  <dd className="ml-4">has the meaning given to it in the recitals to this agreement;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Installation"</dt>
                  <dd className="ml-4">has the meaning given to it in the recitals to this agreement;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Installation Date"</dt>
                  <dd className="ml-4">means the date the installation was installed on the Premises, and shall be deemed to be <span className="font-semibold">{installationDate}</span>;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Laws"</dt>
                  <dd className="ml-4">shall mean all applicable laws, regulations, by-laws, rules, sub-rules, ordinances, promulgations and any amendments or re-enactments thereof or replacements therefor in force from time to time in the Republic of South Africa;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Owner"</dt>
                  <dd className="ml-4">has the meaning given to it in the introduction to this agreement;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Premises"</dt>
                  <dd className="ml-4">has the meaning given to it in the recitals to this agreement;</dd>
                </div>
                <div>
                  <dt className="font-semibold">"Shares"</dt>
                  <dd className="ml-4">has the meaning given to it in clause 8.2.1 of this agreement.</dd>
                </div>
              </dl>
            </section>

            <section>
              <h4 className="font-semibold mb-2">2. INTERPRETATION</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>Unless otherwise defined herein, terms defined in the Companies Act shall bear the same meaning in this agreement.</li>
                <li>Reference to any statutory enactment shall be construed as a reference to that enactment as at the Signature Date and as amended or substituted from time to time.</li>
                <li>Words importing the singular shall include the plural and vice versa, and words importing any gender shall include the other genders.</li>
                <li>Expressions defined in this agreement shall bear the same meaning throughout this agreement and any annexure/s or other document/s incorporated into the agreement.</li>
                <li>The clause headings have been inserted for convenience only and shall not be taken into account in the interpretation of this agreement.</li>
                <li>Where figures are referred to in numerals and in words, and there is any conflict between the two, the words shall prevail, unless the context indicates a contrary intention.</li>
                <li>Where any number of days is to be calculated from a particular date, such number shall be calculated exclusively of such date.</li>
                <li>If any provision in a definition is a substantive provision conferring a right or imposing an obligation on any Party, then, notwithstanding that it is only in the definition clause, effect shall be given to it as if it were a substantive provision in the body of the agreement.</li>
                <li>Any reference to an enactment is to that enactment as at the Signature Date and as amended or re-enacted from time to time.</li>
                <li>A reference to a day, other than a Business Day, is to be interpreted as that specific day.</li>
                <li>Reference to any agreement or contract shall include such agreement or contract, as amended from time to time.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">3. REPRESENTATIONS AND WARRANTIES</h4>
              <p className="mb-2">Each Party represents and warrants to the other Party that –</p>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>it has been duly incorporated and validly exists, is in good standing and is registered in terms of all Laws of the Republic of South Africa;</li>
                <li>the person signing this agreement for and on behalf of that Party is duly authorised to enter into and bind that Party to this agreement; and</li>
                <li>it has the capacity and authority to enter into and to fulfil its obligations under this agreement.</li>
              </ol>
              <p className="mt-2 text-sm">
                The Owner further represents and warrants that it has the full and unfettered right to cede the Carbon Credits to Crunch Carbon, and that the Carbon Credits are free of any liens, encumbrances or other security interests.
              </p>
            </section>

            <section>
              <h4 className="font-semibold mb-2">4. COMMENCEMENT AND DURATION</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>This agreement shall come into operation on the Installation Date (the <span className="font-semibold">"Commencement Date"</span>).</li>
                <li>Notwithstanding clause 4.1 above, the Parties acknowledge that this agreement shall only come into force on the Effective Date and that, accordingly, the provisions of this agreement shall apply with retrospective effect to the Commencement Date.</li>
                <li>This agreement shall endure for the duration of the estimated life expectancy of the Installation, which the Parties agree shall be deemed to be a period of 25 (twenty-five) years, unless terminated earlier in accordance with the provisions of this agreement.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">5. CESSION OF THE CARBON CREDITS</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>The Owner hereby cedes, assigns and makes over to Crunch Carbon all of its right, title and interest in and to the Carbon Credits.</li>
                <li>The cession of the Carbon Credits contemplated in terms of clause 5.1 above is made in consideration for the undertaking by Crunch Carbon to distribute a portion of the proceeds of the sale of the Carbon Credits to the Owner in accordance with clause 8.</li>
                <li>The Owner shall sign all such documents and do such further acts and things as may be required by Crunch Carbon in order to give effect to the cession contemplated by this clause 5.</li>
                <li>The Owner undertakes to furnish Crunch Carbon with such records and information relating to the Energy and/or the Carbon Credits as Crunch Carbon may reasonably require from time to time.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">6. ACCESS TO THE INSTALLATION</h4>
              <p className="mb-2 text-sm">
                The Owner hereby grants Crunch Carbon, and any person duly authorised by Crunch Carbon, the right of access to the Premises to inspect and test the Installation at all reasonable times, provided that –
              </p>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>Crunch Carbon provides the Owner with at least 48 (forty-eight) hours' prior written notice of its intention to access the Premises; and</li>
                <li>Crunch Carbon complies with all reasonable safety and security measures required by the Owner when accessing the Premises.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">7. MAINTENANCE OF THE INSTALLATION</h4>
              <p className="text-sm">
                The Owner undertakes to maintain the Installation in good working order and condition and to ensure that the Installation complies with all applicable Laws and safety standards.
              </p>
            </section>

            <section>
              <h4 className="font-semibold mb-2">8. FINANCIAL PROVISIONS</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold mb-1">8.1 Sale of the Carbon Credits</p>
                  <ol className="list-decimal ml-6 space-y-1">
                    <li>Crunch Carbon shall be solely responsible for the sale of the Carbon Credits and shall be entitled to sell the Carbon Credits at such times and on such terms as it deems fit.</li>
                    <li>Crunch Carbon shall not be obliged to sell the Carbon Credits at any particular time or for any particular price.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold mb-1">8.2 Distribution of the proceeds</p>
                  <ol className="list-decimal ml-6 space-y-1">
                    <li>Crunch Carbon shall distribute the proceeds of the sale of the Carbon Credits between itself and the Owner in the following proportions (the <span className="font-semibold">"Shares"</span>):
                      <ul className="list-disc ml-6 mt-1">
                        <li>Crunch Carbon shall be entitled to {cessionaryPercentage}% of the proceeds; and</li>
                        <li>the Owner shall be entitled to {ownerPercentage}% of the proceeds.</li>
                      </ul>
                    </li>
                    <li>Crunch Carbon shall pay the Owner's Share to the Owner within 30 (thirty) days of receipt of the proceeds of the sale of the Carbon Credits.</li>
                    <li>All payments shall be made by electronic funds transfer into such bank account as the Owner may nominate in writing from time to time.</li>
                  </ol>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold mb-2">9. RECORDS AND REPORTING</h4>
              <p className="mb-2 text-sm">Crunch Carbon shall –</p>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>keep proper records of all sales of the Carbon Credits and of the distribution of the proceeds thereof; and</li>
                <li>provide the Owner with a written statement setting out the details of all sales of the Carbon Credits and the distribution of the proceeds thereof within 30 (thirty) days of the end of each financial year of Crunch Carbon.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">10. WARRANTIES</h4>
              <p className="mb-2 text-sm">Crunch Carbon does not warrant or make any representations to the Owner in respect of –</p>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>the amount of Carbon Credits that may be earned by the Owner;</li>
                <li>the price at which the Carbon Credits may be sold; or</li>
                <li>the amount of the proceeds that may be distributed to the Owner.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">11. INDEMNITY</h4>
              <p className="text-sm">
                The Owner indemnifies and holds harmless Crunch Carbon, its directors, officers, employees and agents against any and all claims, losses, damages, liabilities, costs and expenses (including legal fees) arising out of or in connection with –
              </p>
              <ol className="list-decimal ml-6 space-y-2 text-sm mt-2">
                <li>any breach by the Owner of any of its obligations under this agreement;</li>
                <li>any misrepresentation or breach of warranty by the Owner;</li>
                <li>the Installation or the use thereof; or</li>
                <li>any claim by any third party that the Carbon Credits are subject to any lien, encumbrance or other security interest.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">12. CONFIDENTIALITY</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>Each Party undertakes to keep confidential all information disclosed to it by the other Party in connection with this agreement, except to the extent that such information –
                  <ol className="list-[lower-alpha] ml-6 mt-1 space-y-1">
                    <li>is or becomes publicly available otherwise than through a breach of this clause;</li>
                    <li>is required to be disclosed by law or by any regulatory authority; or</li>
                    <li>is disclosed to the Party's professional advisers, auditors or bankers on a confidential basis.</li>
                  </ol>
                </li>
                <li>The provisions of this clause shall survive the termination of this agreement.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">13. BREACH</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>If either Party commits a breach of any of the provisions of this agreement and fails to remedy such breach within 14 (fourteen) days of receiving written notice from the other Party requiring it to do so, the other Party shall be entitled, without prejudice to any other rights it may have in terms of this agreement or at law –
                  <ol className="list-[lower-alpha] ml-6 mt-1 space-y-1">
                    <li>to claim specific performance of any obligation, whether or not the due date for performance has arrived;</li>
                    <li>to claim immediate payment of all amounts owing by the defaulting Party to the other Party;</li>
                    <li>to cancel this agreement; and/or</li>
                    <li>to claim damages.</li>
                  </ol>
                </li>
                <li>The rights referred to in clause 13.1 above are cumulative and the exercise of any one of them shall not preclude the exercise of any other right.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">14. TERMINATION</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>Either Party may terminate this agreement by giving the other Party not less than 60 (sixty) days' prior written notice.</li>
                <li>Notwithstanding clause 14.1 above, Crunch Carbon shall be entitled to terminate this agreement with immediate effect if –
                  <ol className="list-[lower-alpha] ml-6 mt-1 space-y-1">
                    <li>the Owner commits a material breach of this agreement and fails to remedy such breach within 14 (fourteen) days of receiving written notice from Crunch Carbon requiring it to do so;</li>
                    <li>the Owner becomes insolvent or enters into business rescue proceedings or liquidation;</li>
                    <li>the Installation is removed or ceases to operate for a period exceeding 6 (six) months; or</li>
                    <li>the Owner ceases to be the legal owner of the Installation.</li>
                  </ol>
                </li>
                <li>Upon termination of this agreement, all Carbon Credits that have accrued but have not yet been sold shall revert to the Owner.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">15. CESSION AND ASSIGNMENT</h4>
              <p className="text-sm">
                Neither Party shall be entitled to cede, assign or otherwise transfer any of its rights or obligations under this agreement without the prior written consent of the other Party, which consent shall not be unreasonably withheld.
              </p>
            </section>

            <section>
              <h4 className="font-semibold mb-2">16. NOTICES AND DOMICILIA</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>The Parties choose as their domicilium citandi et executandi for all purposes under this agreement, whether in respect of court process, notices or other documents or communications of whatsoever nature, the following addresses –
                  <div className="ml-4 mt-2 space-y-2">
                    <div>
                      <p className="font-semibold">Owner:</p>
                      <p className="ml-4">Physical address: {companyAddress}</p>
                      <p className="ml-4">Email: {ownerEmail}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Crunch Carbon:</p>
                      <p className="ml-4">Physical address: Unit 3B, 5th Floor, Sovereign Quay, 32 Somerset Road, De Waterkant, Cape Town, 8001</p>
                      <p className="ml-4">Email: info@crunchcarbon.com</p>
                    </div>
                  </div>
                </li>
                <li>Any notice or communication required or permitted to be given in terms of this agreement shall be valid and effective only if in writing and delivered by hand or sent by email to the Party concerned at its chosen address set out in clause 16.1 above.</li>
                <li>Any notice delivered by hand shall be deemed to have been received on the date of delivery.</li>
                <li>Any notice sent by email shall be deemed to have been received on the Business Day following the date of transmission.</li>
                <li>Either Party may by written notice to the other Party change its chosen address to another address in the Republic of South Africa, provided that the change shall become effective on the 7th (seventh) Business Day from the deemed receipt of the notice by the other Party.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">17. GENERAL</h4>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li>This agreement constitutes the entire agreement between the Parties in relation to the subject matter hereof and supersedes all prior agreements, understandings and arrangements between the Parties, whether written or oral.</li>
                <li>No addition to, variation, novation or consensual cancellation of this agreement shall be of any force or effect unless reduced to writing and signed by the Parties.</li>
                <li>No indulgence, leniency or extension of time which either Party may grant or show to the other shall in any way prejudice the rights of the Party granting or showing such indulgence, leniency or extension of time or preclude such Party from exercising any of its rights in the future.</li>
                <li>If any provision of this agreement is found to be invalid, unlawful or unenforceable, such provision shall be severed from the remainder of this agreement which shall continue to be valid and enforceable.</li>
                <li>This agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa.</li>
                <li>The Parties consent to the non-exclusive jurisdiction of the High Court of South Africa (Western Cape Division, Cape Town) in respect of all matters arising out of or in connection with this agreement.</li>
              </ol>
            </section>

            <section>
              <h4 className="font-semibold mb-2">18. SIGNATURE</h4>
              <p className="text-sm mb-4">
                The Parties have caused this agreement to be signed by their duly authorised representatives on the date first written above.
              </p>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">SIGNED by the OWNER:</p>
                  <div className="ml-4 mt-2">
                    <p>Name: {ownerName}</p>
                    <p>Capacity: [Owner/Director/Authorised Signatory]</p>
                    <p>Date: {signingDate}</p>
                    <p>Signature: [Electronic signature by typing name]</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold">SIGNED by CRUNCH CARBON SOLUTIONS (PTY) LTD:</p>
                  <div className="ml-4 mt-2">
                    <p>Name: [Crunch Carbon Representative]</p>
                    <p>Capacity: Director</p>
                    <p>Date: {signingDate}</p>
                    <p>Signature: [Crunch Carbon Signature]</p>
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
