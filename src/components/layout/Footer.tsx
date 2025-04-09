
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
              <Dialog key={link.label}>
                <DialogTrigger asChild>
                  <button 
                    className="text-sm text-crunch-black/60 hover:text-crunch-black relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow transition-all duration-300 group-hover:w-full"></span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>{link.label}</DialogTitle>
                    <DialogDescription>
                      Last updated: April 9, 2025
                    </DialogDescription>
                  </DialogHeader>
                  
                  {link.id === "privacy" && (
                    <div className="text-sm space-y-4 mt-4">
                      <p>
                        This Privacy Policy explains how Crunch Carbon collects, shares, and uses any information that relates to you when you use our Site, engage with us on social media, or otherwise interact with us (your "Personal Data"). This Privacy Policy also explains the rights you have concerning the Personal Data that we process and how you can exercise these rights.
                      </p>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Principles</h3>
                        <p>Crunch Carbon manifests its commitment to privacy and data protection by embracing the following principles.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>Crunch Carbon uses Personal Data lawfully, fairly, and in a transparent manner.</li>
                          <li>Crunch Carbon collects no more Personal Data than necessary, and only for a legitimate purpose.</li>
                          <li>Crunch Carbon retains no more data than necessary or for a longer period than needed.</li>
                          <li>Crunch Carbon protects Personal Data with appropriate security measures.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Data We Collect</h3>
                        <p>This policy applies only to information collected on our website. We collect two types of information from visitors to our websites:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>Personal Data.</li>
                          <li>Non-personal Data.</li>
                        </ul>
                        <p className="mt-2">"Personal Data" is information that identifies you personally and that you provide to us, such as your name, address, telephone number, email address, and sometimes your Internet Protocol (IP) address. We may collect this information when you enter a business agreement with us, visit our website, or complete an enquiry form.</p>
                        <p className="mt-2">"Non-personal Data" can be technical in nature. It does not identify you personally. Examples of non-Personal Data may include (but are not limited to) cookies, web beacons etc.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Usage Data</h3>
                        <p>To improve your experience with our Site we may also collect information on how you navigate the Site, information about your connection, and the technical means you use to access our Site. This data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Site that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Location Data</h3>
                        <p>We may use and store information about your location if you give us permission to do so. We use this data to improve and customize your website experience. You can enable or disable location services at any time by way of your device settings.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Tracking & Cookies Data</h3>
                        <p>We use cookies and similar tracking technologies to track the activity on our Site and we hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. Cookies are sent to your browser from our Site and stored on your device. See Cookie Declaration for more info.</p>
                        <p className="mt-2">Other tracking technologies are also used such as beacons, tags, and scripts to collect and track information and to improve and analyze our Site and interaction with it. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Site.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Data Use</h3>
                        <p>Crunch Carbon uses the collected data for various purposes including:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>To provide and maintain our service</li>
                          <li>To notify you about changes in policies and order details</li>
                          <li>To provide customer support</li>
                          <li>To gather analysis or valuable information so that we can improve our Site and services</li>
                          <li>To monitor the propriety of Site usage</li>
                          <li>To detect, prevent and address technical issues; and</li>
                          <li>To provide you with news, special offers and general information about other goods, services and events which we offer that are similar to those that you have already purchased or enquired about unless you have opted not to receive such information</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Data Storage, Transfer, and Retention</h3>
                        <p>The Personal Data that we collected from you is stored within South Africa.</p>
                        <p className="mt-2">Your information, including Personal Data, may be transferred to, and maintained on, computers or other data storage devices.</p>
                        <p className="mt-2">If you are located outside South Africa and choose to provide information to us, please note that we transfer the data, including Personal Data, to and process it in South Africa.</p>
                        <p className="mt-2">Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.</p>
                        <p className="mt-2">Crunch Carbon will take all the steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy and no transfer of your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of your data and other personal information.</p>
                        <p className="mt-2">We will hold on to your information for as long as we are required to keep it to ensure we meet our legal requirements.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Data Access</h3>
                        <p>Your Personal Data is available and accessible only by those who need the data to accomplish the intended processing purpose. To the extent necessary, your Personal Data may be shared with suppliers and subcontractors (processors and sub-processors) carrying out certain tasks on Crunch Carbon's behalf and with independent third-parties, including, but not limited to, using personal information you share with us or that we indirectly collect to verify your identity and for fraud prevention purposes.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Data Security</h3>
                        <p>The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Data Disclosure</h3>
                        <p>Under certain circumstances, Crunch Carbon may be required to disclose your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Legal Requirements</h3>
                        <p>Crunch Carbon may disclose your Personal Data in good faith where such action is, in Crunch Carbon's opinion, necessary:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>To comply with a legal obligation;</li>
                          <li>To protect and defend the rights or property of Crunch Carbon;</li>
                          <li>To prevent or investigate possible wrongdoing in connection with the website,</li>
                          <li>To protect the personal safety of users of the Site or the public; or</li>
                          <li>To protect against legal liability.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Your Data Protection Rights</h3>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>ask what personal information we hold about you;</li>
                          <li>ask what information was sent to our suppliers, service providers or any other third party;</li>
                          <li>ask us to update, correct or delete any out-of-date or incorrect personal information we hold about you;</li>
                          <li>unsubscribe from any direct marketing communications we may send you;</li>
                          <li>object to the processing of your personal information.</li>
                        </ul>
                        <p className="mt-2">If you want us to delete all personal information we have about you, you will probably have to terminate all agreements you have with us. We cannot maintain our relationship with you without having some of your personal information. We can refuse to delete your information if we are required by law to retain it or if we need it to protect our rights.</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">Exercise Your Rights (Contact Us)</h3>
                        <p>We take data protection very seriously and therefore we have a dedicated Technology Officer to handle your requests in relation to your rights stated above. You can always reach us at info@crunchcarbon.com.</p>
                      </div>
                    </div>
                  )}
                  
                  {link.id === "terms" && (
                    <div className="text-sm space-y-4 mt-4">
                      <h3 className="font-bold text-lg mb-2">Terms of Service</h3>
                      <p>These Terms of Service govern your use of the website located at crunchcarbon.com and any related services provided by Crunch Carbon.</p>
                      <p className="mt-2">By accessing crunchcarbon.com, you agree to abide by these Terms of Service and to comply with all applicable laws and regulations. If you do not agree with these Terms of Service, you are prohibited from using or accessing this website or using any other services provided by Crunch Carbon.</p>
                      <p className="mt-2">We, Crunch Carbon, reserve the right to review and amend any of these Terms of Service at our sole discretion. Upon doing so, we will update this page. Any changes to these Terms of Service will take effect immediately from the date of publication.</p>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Limitations of Use</h3>
                        <p>By using this website, you warrant on behalf of yourself, your users, and other parties you represent that you will not:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>modify, copy, prepare derivative works of, decompile, or reverse engineer any materials and software contained on this website;</li>
                          <li>remove any copyright or other proprietary notations from any materials and software on this website;</li>
                          <li>transfer the materials to another person or "mirror" the materials on any other server;</li>
                          <li>knowingly or negligently use this website or any of its associated services in a way that abuses or disrupts our networks or any other service Crunch Carbon provides;</li>
                          <li>use this website or its associated services to transmit or publish any harassing, indecent, obscene, fraudulent, or unlawful material;</li>
                          <li>use this website or its associated services in violation of any applicable laws or regulations;</li>
                          <li>use this website in conjunction with sending unauthorized advertising or spam;</li>
                          <li>harvest, collect, or gather user data without the user's consent; or</li>
                          <li>use this website or its associated services in such a way that may infringe the privacy, intellectual property rights, or other rights of third parties.</li>
                        </ul>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Intellectual Property</h3>
                        <p>The intellectual property in the materials contained in this website are owned by or licensed to Crunch Carbon and are protected by applicable copyright and trademark law. We grant our users permission to download one copy of the materials for personal, non-commercial transitory use.</p>
                        <p className="mt-2">This constitutes the grant of a license, not a transfer of title. This license shall automatically terminate if you violate any of these restrictions or the Terms of Service, and may be terminated by Crunch Carbon at any time.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Liability</h3>
                        <p>Our website and the materials on our website are provided on an 'as is' basis. To the extent permitted by law, Crunch Carbon makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property, or other violation of rights.</p>
                        <p className="mt-2">In no event shall Crunch Carbon or its suppliers be liable for any consequential loss suffered or incurred by you or any third party arising from the use or inability to use this website or the materials on this website, even if Crunch Carbon or an authorized representative has been notified, orally or in writing, of the possibility of such damage.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Accuracy of Materials</h3>
                        <p>The materials appearing on our website are not comprehensive and are for general information purposes only. Crunch Carbon does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on this website, or otherwise relating to such materials or on any resources linked to this website.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Links</h3>
                        <p>Crunch Carbon has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement, approval, or control by Crunch Carbon of the site. Use of any such linked site is at your own risk and we strongly advise you make your own investigations with respect to the suitability of those sites.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Governing Law</h3>
                        <p>Any claim related to Crunch Carbon's website shall be governed by the laws of South Africa without regards to its conflict of law provisions.</p>
                      </div>
                    </div>
                  )}
                  
                  {link.id === "cookies" && (
                    <div className="text-sm space-y-4 mt-4">
                      <h3 className="font-bold text-lg mb-2">Cookie Policy</h3>
                      <p>This Cookie Policy explains how Crunch Carbon uses cookies and similar technologies to recognize you when you visit our website at crunchcarbon.com. It explains what these technologies are and why we use them, as well as your rights to control our use of them.</p>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">What are cookies?</h3>
                        <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
                        <p className="mt-2">Cookies set by the website owner (in this case, Crunch Carbon) are called "first-party cookies." Cookies set by parties other than the website owner are called "third-party cookies." Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics). The parties that set these third-party cookies can recognize your computer both when it visits the website in question and also when it visits certain other websites.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Why do we use cookies?</h3>
                        <p>We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Website. Third parties serve cookies through our Website for advertising, analytics, and other purposes.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">How can I control cookies?</h3>
                        <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager. The Cookie Consent Manager allows you to select which categories of cookies you accept or reject. Essential cookies cannot be rejected as they are strictly necessary to provide you with services.</p>
                        <p className="mt-2">The Cookie Consent Manager can be found in the notification banner and on our website. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted. You may also set or amend your web browser controls to accept or refuse cookies.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Types of cookies we use</h3>
                        <p>The specific types of first and third-party cookies served through our Website and the purposes they perform are described below:</p>
                        
                        <div className="mt-2">
                          <h4 className="font-semibold text-base">Essential cookies</h4>
                          <p>These cookies are strictly necessary to provide you with services available through our Website and to use some of its features, such as access to secure areas. Because these cookies are strictly necessary to deliver the Website, you cannot refuse them without impacting how our Website functions.</p>
                        </div>
                        
                        <div className="mt-2">
                          <h4 className="font-semibold text-base">Performance and functionality cookies</h4>
                          <p>These cookies are used to enhance the performance and functionality of our Website but are non-essential to their use. However, without these cookies, certain functionality may become unavailable.</p>
                        </div>
                        
                        <div className="mt-2">
                          <h4 className="font-semibold text-base">Analytics and customization cookies</h4>
                          <p>These cookies collect information that is used either in aggregate form to help us understand how our Website is being used or how effective our marketing campaigns are, or to help us customize our Website for you in order to enhance your experience.</p>
                        </div>
                        
                        <div className="mt-2">
                          <h4 className="font-semibold text-base">Advertising cookies</h4>
                          <p>These cookies are used to make advertising messages more relevant to you. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed for advertisers, and in some cases selecting advertisements that are based on your interests.</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">What about other tracking technologies?</h3>
                        <p>Cookies are not the only way to recognize or track visitors to a website. We may use other, similar technologies from time to time, like web beacons (sometimes called "tracking pixels" or "clear gifs"). These are tiny graphics files that contain a unique identifier that enables us to recognize when someone has visited our Website. This allows us, for example, to monitor the traffic patterns of users from one page within our Website to another, to deliver or communicate with cookies, to understand whether you have come to our Website from an online advertisement displayed on a third-party website, to improve site performance, and to measure the success of email marketing campaigns. In many instances, these technologies are reliant on cookies to function properly, and so declining cookies will impair their functioning.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">How often will you update this Cookie Policy?</h3>
                        <p>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.</p>
                        <p className="mt-2">The date at the top of this Cookie Policy indicates when it was last updated.</p>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="font-bold text-lg mb-2">Where can I get further information?</h3>
                        <p>If you have any questions about our use of cookies or other technologies, please email us at info@crunchcarbon.com.</p>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
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
  { label: 'Privacy Policy', id: 'privacy', href: '/privacy' },
  { label: 'Terms of Service', id: 'terms', href: '/terms' },
  { label: 'Cookie Policy', id: 'cookies', href: '/cookies' },
];
