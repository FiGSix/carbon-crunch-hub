
import { motion } from 'framer-motion';
import { Instagram, Linkedin } from 'lucide-react';

const socialLinks = [
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/crunch-carbon/' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/crunch_carbon/' },
];

export function SocialLinks() {
  return (
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
  );
}
