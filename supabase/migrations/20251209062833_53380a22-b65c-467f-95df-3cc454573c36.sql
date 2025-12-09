-- Insert the Agent Referral Agreement document
INSERT INTO public.legal_documents (
  document_type,
  title,
  content,
  status,
  is_active,
  effective_date,
  current_version
) VALUES (
  'agent_referral_agreement',
  'Agent Referral Agreement',
  '# CRUNCH CARBON AGENT REFERRAL AGREEMENT

This Agent Referral Agreement ("Agreement") is entered into between Crunch Carbon (Pty) Ltd ("Crunch Carbon") and the Agent ("Agent").

## 1. SCOPE OF SERVICES

The Agent agrees to refer potential clients to Crunch Carbon for carbon credit monetization services related to solar PV installations.

## 2. COMPENSATION

Agent compensation will be determined according to the commission structure agreed upon and may be subject to performance tiers.

## 3. CONFIDENTIALITY

The Agent agrees to maintain the confidentiality of all proprietary information shared by Crunch Carbon for a period of five (5) years from the date of disclosure.

## 4. NON-CIRCUMVENTION

The Agent agrees not to circumvent, avoid, bypass, or attempt to circumvent Crunch Carbon in any transaction with clients introduced through this Agreement for a period of three (3) years.

## 5. DISPUTE RESOLUTION

Any disputes arising from this Agreement shall be resolved through arbitration administered by the Arbitration Foundation of Southern Africa (AFSA).

## 6. GENERAL PROVISIONS

This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations and agreements.

---

*This is placeholder content. Administrators should update this document with the full legal agreement text via the Legal Documents management page.*',
  'published',
  true,
  CURRENT_DATE,
  1
);