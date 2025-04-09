
import { LinkGroup } from './LinkGroup';

const productLinks = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Calculator', href: '/calculator' },
  { label: 'For Agents', href: '/agents' },
];

const companyLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function FooterNav() {
  return (
    <>
      <div className="md:col-span-2">
        <LinkGroup title="Product" links={productLinks} />
      </div>
      
      <div className="md:col-span-2">
        <LinkGroup title="Company" links={companyLinks} />
      </div>
    </>
  );
}
