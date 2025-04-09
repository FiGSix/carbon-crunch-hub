
import { cn } from '@/lib/utils';

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("bg-white border-t border-crunch-black/5 py-12", className)}>
      <div className="grid-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/lovable-uploads/850f8914-10c9-4eca-91e0-471bca63f70a.png" alt="CrunchCarbon Logo" className="h-8" />
              <span className="text-xl font-golden-age font-bold text-crunch-black">CRUNCH CARBON</span>
            </div>
            <p className="text-muted-foreground mb-4">Carbon Made Simple</p>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} CrunchCarbon. All rights reserved.</p>
          </div>
          
          <div>
            <h3 className="font-golden-age text-lg mb-4 text-crunch-black">SERVICES</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Carbon Credits</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Proposal Generation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Agent Program</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Client Portal</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-golden-age text-lg mb-4 text-crunch-black">RESOURCES</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Calculator</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">FAQ</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-golden-age text-lg mb-4 text-crunch-black">LEGAL</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-crunch-yellow transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
