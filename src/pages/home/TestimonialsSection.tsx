
import { motion } from "framer-motion";
interface Testimonial {
  name: string;
  location: string;
  quote: string;
}
export const TestimonialsSection = () => {
  return <section className="py-20 bg-crunch-black/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-crunch-black">
              What Our Users Are Saying
            </h2>
            <p className="text-xl text-crunch-black/70 max-w-3xl mx-auto">Join thousands of system owners already monetising their clean energy.</p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => <TestimonialCard key={index} testimonial={testimonial} index={index} />)}
        </div>
      </div>
    </section>;
};

interface TestimonialCardProps {
  testimonial: Testimonial;
  index: number;
}
const TestimonialCard = ({
  testimonial,
  index
}: TestimonialCardProps) => {
  return <motion.div className="group" initial={{
    opacity: 0,
    y: 20
  }} whileInView={{
    opacity: 1,
    y: 0
  }} viewport={{
    once: true
  }} transition={{
    duration: 0.5,
    delay: 0.1 * index
  }} whileHover={{
    y: -5
  }}>
      <div className="bg-white p-8 rounded-lg shadow-md border border-crunch-black/10 h-full transition-all group-hover:shadow-lg">
        <div className="flex items-center mb-4">
          {[...Array(5)].map((_, i) => <svg key={i} className="w-5 h-5 text-crunch-yellow fill-current" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
            </svg>)}
        </div>
        <p className="text-crunch-black/80 mb-6 italic">"{testimonial.quote}"</p>
        <div className="flex items-center">
          <div className="w-12 h-12 bg-crunch-black/10 rounded-full flex items-center justify-center text-crunch-black font-bold mr-4">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-crunch-black">{testimonial.name}</h4>
            <p className="text-sm text-crunch-black/70">{testimonial.location}</p>
          </div>
        </div>
      </div>
    </motion.div>;
};

// Testimonial data
const testimonials: Testimonial[] = [{
  name: "JH Kruger",
  location: "California",
  quote: "With Crunch Carbon's support, our clients have been able to leverage their renewable energy systems to not only reduce emissions but also earn from their commitment to sustainability."
}, {
  name: "Sarah T.",
  location: "Colorado",
  quote: "After 3 years of having solar panels, I finally found a way to make them even more valuable. The quarterly deposits feel like getting a bonus four times a year!"
}, {
  name: "David K.",
  location: "Texas",
  quote: "My first thought was 'this sounds too good to be true.' Six months and two payments later, I'm glad I took the leap. Incredibly simple process."
}];
