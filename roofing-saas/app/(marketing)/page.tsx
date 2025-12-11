import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Users,
  BarChart3,
  MessageSquare,
  MapPin,
  FileSignature,
  Mic,
  CheckCircle2,
  ArrowRight,
  Star,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-glow" />
            <span className="text-sm text-muted-foreground">
              Now with AI Voice Assistant
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
            The Complete CRM for
            <span className="text-gradient-purple block mt-2">
              Roofing Contractors
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up">
            Manage leads, close more deals, and streamline your operations with
            the only platform built specifically for roofing professionals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
            <Link href="/login">
              <Button size="lg" className="glow-purple text-lg px-8 h-12">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 h-12">
                See Features
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-16 flex flex-col items-center gap-4 animate-fade-in-up">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <p className="text-muted-foreground">
              Trusted by <span className="text-foreground font-semibold">500+</span> roofing contractors
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Grow
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform to manage your entire roofing business, from first contact to final invoice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover-lift transition-all"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.iconBg}`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-gradient-purple mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by Contractors
            </h2>
            <p className="text-xl text-muted-foreground">
              See what roofing professionals are saying about Ridgeline.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-foreground mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {testimonial.name[0]}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border ${
                  plan.featured
                    ? 'bg-primary/5 border-primary glow-purple'
                    : 'bg-card border-border'
                }`}
              >
                {plan.featured && (
                  <div className="text-primary text-sm font-semibold mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button
                    className={`w-full ${plan.featured ? 'glow-purple' : ''}`}
                    variant={plan.featured ? 'default' : 'outline'}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Grow Your Roofing Business?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of contractors who have transformed their operations with Ridgeline.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="glow-purple text-lg px-8 h-12">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 h-12">
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Data
const features = [
  {
    title: 'Contact Management',
    description: 'Keep all your leads and customers organized with smart tagging, notes, and complete interaction history.',
    icon: Users,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-500',
  },
  {
    title: 'Sales Pipeline',
    description: 'Visual Kanban board to track deals from first contact to closed job. Never lose a lead again.',
    icon: BarChart3,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
  },
  {
    title: 'Communication Hub',
    description: 'Send texts, emails, and log calls all from one place. Automated follow-ups keep leads warm.',
    icon: MessageSquare,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-500',
  },
  {
    title: 'Territory Mapping',
    description: 'Plan door-knocking routes, drop pins, and track field activity with our mobile-first mapping tools.',
    icon: MapPin,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
  },
  {
    title: 'E-Signatures',
    description: 'Send contracts and get them signed digitally. Legally binding and professionally formatted.',
    icon: FileSignature,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    title: 'AI Voice Assistant',
    description: 'Ask questions, create contacts, and update deals using natural voice commands. Hands-free CRM.',
    icon: Mic,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
];

const stats = [
  { value: '500+', label: 'Active Contractors' },
  { value: '$2.4M', label: 'Deals Tracked Monthly' },
  { value: '98%', label: 'Customer Satisfaction' },
  { value: '4.9', label: 'App Store Rating' },
];

const testimonials = [
  {
    quote: 'Ridgeline replaced three different apps we were using. The AI assistant alone saves me 2 hours a day.',
    name: 'Mike Johnson',
    company: 'Johnson Roofing Co.',
  },
  {
    quote: 'Finally a CRM that understands roofing. The pipeline view is exactly how I think about my deals.',
    name: 'Sarah Martinez',
    company: 'Peak Performance Roofing',
  },
  {
    quote: 'My door knockers love the mobile app. They can log visits and take photos even without cell service.',
    name: 'David Chen',
    company: 'Apex Storm Services',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 49,
    description: 'Perfect for solo contractors',
    features: [
      'Up to 500 contacts',
      'Basic pipeline management',
      'Email & SMS (100/mo)',
      'Mobile app access',
      'Email support',
    ],
    featured: false,
  },
  {
    name: 'Professional',
    price: 99,
    description: 'For growing teams',
    features: [
      'Unlimited contacts',
      'Advanced pipeline & automation',
      'Email & SMS (1,000/mo)',
      'E-signatures included',
      'AI Voice Assistant',
      'Priority support',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 199,
    description: 'For large operations',
    features: [
      'Everything in Professional',
      'Unlimited users',
      'Custom integrations',
      'Dedicated account manager',
      'Custom training',
      'SLA guarantee',
    ],
    featured: false,
  },
];
