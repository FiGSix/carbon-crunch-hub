
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  X, 
  ArrowRight, 
  Download, 
  Plus, 
  Edit 
} from "lucide-react";

const ButtonShowcase = () => {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Button Variations</h1>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Default Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="link">Link Button</Button>
          <Button variant="glass">Glass Button</Button>
        </div>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Buttons with Icons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>
            <Plus className="mr-2" /> Create
          </Button>
          <Button variant="outline">
            <Download className="mr-2" /> Export
          </Button>
          <Button variant="secondary">
            <Edit className="mr-2" /> Edit
          </Button>
          <Button variant="destructive">
            <X className="mr-2" /> Delete
          </Button>
          <Button>
            Next <ArrowRight className="ml-2" />
          </Button>
        </div>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Size Variations</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">Large Button</Button>
          <Button>Default Button</Button>
          <Button size="sm">Small Button</Button>
          <Button size="icon"><Check /></Button>
        </div>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Disabled States</h2>
        <div className="flex flex-wrap gap-4">
          <Button disabled>Disabled Default</Button>
          <Button variant="secondary" disabled>Disabled Secondary</Button>
          <Button variant="outline" disabled>Disabled Outline</Button>
        </div>
      </section>
    </div>
  );
};

export default ButtonShowcase;
