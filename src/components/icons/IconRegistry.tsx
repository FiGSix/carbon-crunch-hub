/**
 * Centralized Icon Registry for Tree-Shaking Optimization
 * 
 * This file contains ONLY the icons actually used in the application.
 * This ensures optimal tree-shaking and prevents bundling unused icons.
 * 
 * When adding new icons:
 * 1. Import the specific icon from lucide-react
 * 2. Add it to the USED_ICONS object
 * 3. Update the IconName type
 */

import {
  // Navigation & UI
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  
  // Status & Feedback
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  CheckSquare,
  
  // User & People
  User,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  UserMinus,
  Eye,
  EyeOff,
  
  // Actions
  Plus,
  Minus,
  Search,
  Filter,
  Settings,
  Download,
  Upload,
  Play,
  Pause,
  
  // Data & Analytics
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Database,
  Activity,
  
  // Communication
  Mail,
  Phone,
  MessageSquare,
  
  // Files & Content
  FileText,
  File,
  Folder,
  Image,
  
  // Business
  Building,
  Award,
  Shield,
  ShieldCheck,
  MapPin,
  
  // Other commonly used
  Home,
  Bug,
  Info,
  WifiOff,
  Link2,
  Zap,
  RotateCcw,
  Folders,
} from 'lucide-react';

// Registry of actually used icons
export const USED_ICONS = {
  // Navigation & UI
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  
  // Status & Feedback
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  CheckSquare,
  
  // User & People
  User,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  UserMinus,
  Eye,
  EyeOff,
  
  // Actions
  Plus,
  Minus,
  Search,
  Filter,
  Settings,
  Download,
  Upload,
  Play,
  Pause,
  
  // Data & Analytics
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Database,
  Activity,
  
  // Communication
  Mail,
  Phone,
  MessageSquare,
  
  // Files & Content
  FileText,
  File,
  Folder,
  Image,
  
  // Business
  Building,
  Award,
  Shield,
  ShieldCheck,
  MapPin,
  
  // Other commonly used
  Home,
  Bug,
  Info,
  WifiOff,
  Link2,
  Zap,
  RotateCcw,
  Folders,
} as const;

// Type-safe icon names
export type IconName = keyof typeof USED_ICONS;

// Icon component props
export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Optimized Icon Component
 * 
 * Uses the centralized registry for tree-shaking optimization.
 * Only icons in USED_ICONS will be included in the bundle.
 */
export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  className = '',
  color = 'currentColor',
  ...props 
}) => {
  const IconComponent = USED_ICONS[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in registry. Add it to USED_ICONS.`);
    return null;
  }
  
  return (
    <IconComponent 
      size={size} 
      className={className} 
      color={color}
      {...props}
    />
  );
};

// Re-export individual icons for direct use (when you need specific props)
export {
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  CheckSquare,
  User,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  UserMinus,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Search,
  Filter,
  Settings,
  Download,
  Upload,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Database,
  Activity,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  File,
  Folder,
  Image,
  Building,
  Award,
  Shield,
  ShieldCheck,
  MapPin,
  Home,
  Bug,
  Info,
  WifiOff,
  Link2,
  Zap,
  RotateCcw,
  Folders,
};
