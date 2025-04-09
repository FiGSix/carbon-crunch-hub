
interface FooterLink {
  label: string;
  href: string;
}

interface LinkGroupProps {
  title: string;
  links: FooterLink[];
}

export function LinkGroup({ title, links }: LinkGroupProps) {
  return (
    <>
      <h3 className="font-bold text-lg mb-4 text-crunch-black">{title}</h3>
      <ul className="space-y-3">
        {links.map((link) => (
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
    </>
  );
}
