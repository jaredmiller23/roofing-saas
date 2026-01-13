import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata = {
  title: 'Terms of Service | Job Clarity',
  description: 'Terms of Service for Job Clarity CRM',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using Job Clarity (&ldquo;the Service&rdquo;), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground">
                Job Clarity is a customer relationship management (CRM) platform designed for roofing
                contractors. The Service includes contact management, pipeline tracking, e-signatures,
                territory mapping, communication tools, and related features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Account Responsibilities</h2>
              <p className="text-muted-foreground mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring that your use complies with applicable laws</li>
                <li>The accuracy of information you provide</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Violate any applicable laws or regulations (including TCPA for communications)</li>
                <li>Transmit malware or harmful code</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service to send unsolicited communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Payment Terms</h2>
              <p className="text-muted-foreground">
                Paid subscriptions are billed monthly in advance. You authorize us to charge your
                payment method for all fees incurred. Subscription fees are non-refundable except
                as required by law. We reserve the right to change pricing with 30 days notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Data Ownership</h2>
              <p className="text-muted-foreground">
                You retain ownership of all data you submit to the Service. You grant us a limited
                license to use this data solely to provide the Service to you. We will not sell
                your data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
              <p className="text-muted-foreground">
                We strive to maintain high availability but do not guarantee uninterrupted service.
                We may perform maintenance that temporarily affects availability. We are not liable
                for any downtime or service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, Job Clarity and its affiliates shall not be
                liable for any indirect, incidental, special, consequential, or punitive damages,
                or any loss of profits or revenues. Our total liability shall not exceed the amount
                you paid us in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <p className="text-muted-foreground">
                You may cancel your subscription at any time. We may suspend or terminate your
                account if you violate these terms. Upon termination, your right to use the
                Service ceases immediately. You may request export of your data before termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may modify these terms at any time. We will notify you of material changes via
                email or through the Service. Continued use after changes constitutes acceptance
                of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms are governed by the laws of the State of Tennessee, without regard to
                conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, contact us at:{' '}
                <a href="mailto:jared@claimclarityai.com" className="text-primary hover:underline">
                  jared@claimclarityai.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
