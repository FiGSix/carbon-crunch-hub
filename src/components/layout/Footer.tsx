
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Footer({ className }: { className?: string }) {
  const navigate = useNavigate();
  
  return (
    <footer className={cn("bg-white border-t border-crunch-black/5 pt-16 pb-10", className)}>
      <div className="grid-container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <div className="md:col-span-4">
            <div className="mb-4">
              <img src="/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png" alt="CrunchCarbon Logo" className="h-12" />
            </div>
            <p className="text-crunch-black/70 mb-6 max-w-md">Turn your renewable energy into a powerful income stream with verified carbon credits. Simple, transparent, and effective.</p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a 
                  key={social.name}
                  href={social.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-crunch-black/5 hover:bg-crunch-yellow/20 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <social.icon className="w-5 h-5 text-crunch-black" />
                </motion.a>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="font-bold text-lg mb-4 text-crunch-black">Product</h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-crunch-black/70 hover:text-crunch-black relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="font-bold text-lg mb-4 text-crunch-black">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-crunch-black/70 hover:text-crunch-black relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="md:col-span-4">
            <h3 className="font-bold text-lg mb-4 text-crunch-black">Get Started Today</h3>
            <p className="text-crunch-black/70 mb-4">Join thousands of system owners already monetizing their carbon offsets.</p>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => navigate("/register")}
                className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black w-full md:w-auto group"
              >
                Sign Up Now <ArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </div>
        
        <div className="border-t border-crunch-black/10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-crunch-black/60 mb-4 md:mb-0">
            © {new Date().getFullYear()} CrunchCarbon. All rights reserved.
          </p>
          <div className="flex gap-6">
            {legalLinks.map((link) => (
              <a 
                key={link.label}
                href={link.href}
                className="text-sm text-crunch-black/60 hover:text-crunch-black relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'Facebook', icon: Facebook, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
];

const productLinks = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Calculator', href: '/calculator' },
  { label: 'For Agents', href: '/agents' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

const companyLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
];
