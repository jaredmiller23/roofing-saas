import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Mail, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | Job Clarity',
  description: 'Get in touch with the Job Clarity team',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-muted-foreground">
              Have questions about Job Clarity? We&apos;re here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Email</h2>
                  <p className="text-muted-foreground">Best for general inquiries</p>
                </div>
              </div>
              <a
                href="mailto:jared@claimclarityai.com"
                className="text-lg text-primary hover:underline"
              >
                jared@claimclarityai.com
              </a>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Location</h2>
                  <p className="text-muted-foreground">Where we operate</p>
                </div>
              </div>
              <p className="text-foreground">
                Tennessee, United States
              </p>
            </div>
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-card border border-border text-center">
            <h2 className="text-2xl font-semibold mb-4">Looking for a Demo?</h2>
            <p className="text-muted-foreground mb-6">
              Want to see Job Clarity in action? Reach out and we&apos;ll schedule a walkthrough
              tailored to your roofing business.
            </p>
            <a
              href="mailto:jared@claimclarityai.com?subject=Job Clarity Demo Request"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Request a Demo
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
