
import { cn } from '@/lib/utils';

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("bg-carbon-gray-50 border-t border-carbon-gray-100 py-8", className)}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-carbon-green-500 text-white font-bold p-2 rounded-md">CC</div>
              <span className="text-xl font-bold text-carbon-gray-900">CrunchCarbon</span>
            </div>
            <p className="text-carbon-gray-600 mb-4">Carbon Made Simple</p>
            <p className="text-sm text-carbon-gray-500">© {new Date().getFullYear()} CrunchCarbon. All rights reserved.</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-carbon-gray-900 mb-3">Services</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Carbon Credits</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Proposal Generation</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Agent Program</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Client Portal</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-carbon-gray-900 mb-3">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Blog</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Calculator</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">FAQ</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-carbon-gray-900 mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Privacy Policy</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Terms of Service</a></li>
              <li><a href="#" className="text-carbon-gray-600 hover:text-carbon-green-600">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
