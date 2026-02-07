import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata = {
  title: 'Data Processing Agreement | Job Clarity',
  description: 'Data Processing Agreement (DPA) for Job Clarity CRM — outlining how Clarity AI LLC processes customer data as a data processor.',
};

export default function DpaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Data Processing Agreement</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Definitions</h2>
              <p className="text-muted-foreground mb-4">
                This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the Terms of Service
                between the customer (&ldquo;Data Controller&rdquo; or &ldquo;Controller&rdquo;) and
                Clarity AI LLC (&ldquo;Data Processor&rdquo; or &ldquo;Processor&rdquo;), operating
                the Job Clarity platform.
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  <strong>Data Controller</strong> &mdash; The customer who determines the purposes and means
                  of processing personal data through the Job Clarity platform.
                </li>
                <li>
                  <strong>Data Processor</strong> &mdash; Clarity AI LLC, which processes personal data on
                  behalf of the Data Controller to provide the Job Clarity platform and services.
                </li>
                <li>
                  <strong>Personal Data</strong> &mdash; Any information relating to an identified or
                  identifiable natural person that is processed through the platform.
                </li>
                <li>
                  <strong>Subprocessor</strong> &mdash; A third-party service provider engaged by the
                  Processor to assist in processing personal data.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Scope of Processing</h2>
              <p className="text-muted-foreground mb-4">
                The Processor processes personal data solely for the purpose of providing the Job Clarity
                CRM platform to the Controller. The categories of data processed include:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  <strong>Contact information</strong> &mdash; Names, email addresses, phone numbers,
                  mailing addresses of the Controller&apos;s customers and leads.
                </li>
                <li>
                  <strong>Project details</strong> &mdash; Job site addresses, project descriptions,
                  inspection data, measurements, and status information.
                </li>
                <li>
                  <strong>Communication logs</strong> &mdash; Records of calls, SMS messages, and emails
                  sent through the platform.
                </li>
                <li>
                  <strong>Financial data</strong> &mdash; Estimates, invoices, payment records, and
                  expense tracking associated with projects.
                </li>
                <li>
                  <strong>Employee data</strong> &mdash; Names, roles, and activity logs for the
                  Controller&apos;s team members using the platform.
                </li>
                <li>
                  <strong>Documents and media</strong> &mdash; Photos, contracts, inspection reports,
                  and other files uploaded to the platform.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Obligations of the Processor</h2>
              <p className="text-muted-foreground mb-4">
                The Processor shall:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Process personal data only on documented instructions from the Controller.</li>
                <li>Ensure that persons authorized to process personal data are bound by confidentiality obligations.</li>
                <li>Implement appropriate technical and organizational security measures as described in Section 6.</li>
                <li>Assist the Controller in responding to data subject requests.</li>
                <li>Assist the Controller in ensuring compliance with breach notification obligations.</li>
                <li>Delete or return all personal data upon termination of services, subject to the retention policy in Section 5.</li>
                <li>Make available all information necessary to demonstrate compliance with this DPA.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Subprocessors</h2>
              <p className="text-muted-foreground mb-4">
                The Controller authorizes the Processor to engage the following subprocessors. The
                Processor will notify the Controller at least 30 days before adding or replacing
                a subprocessor.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-muted-foreground text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 pr-4 font-semibold text-foreground">Subprocessor</th>
                      <th className="text-left py-3 pr-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-3 font-semibold text-foreground">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">Supabase Inc.</td>
                      <td className="py-3 pr-4">Database hosting, authentication, and real-time services</td>
                      <td className="py-3">United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">Vercel Inc.</td>
                      <td className="py-3 pr-4">Application hosting and edge delivery</td>
                      <td className="py-3">United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">Stripe Inc.</td>
                      <td className="py-3 pr-4">Payment processing and billing</td>
                      <td className="py-3">United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">Twilio Inc.</td>
                      <td className="py-3 pr-4">SMS and voice communication services</td>
                      <td className="py-3">United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">Resend Inc.</td>
                      <td className="py-3 pr-4">Transactional email delivery</td>
                      <td className="py-3">United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">OpenAI LLC</td>
                      <td className="py-3 pr-4">AI-powered features (summarization, suggestions)</td>
                      <td className="py-3">United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">Google LLC</td>
                      <td className="py-3 pr-4">Calendar integration and geocoding services</td>
                      <td className="py-3">United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 pr-4">Sentry (Functional Software Inc.)</td>
                      <td className="py-3 pr-4">Application error monitoring and performance tracking</td>
                      <td className="py-3">United States</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                The Processor retains personal data according to the following policy:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  <strong>Active subscription</strong> &mdash; All data is retained for the duration of the
                  Controller&apos;s active subscription and is available for export at any time.
                </li>
                <li>
                  <strong>Subscription cancellation</strong> &mdash; Upon cancellation, data is retained
                  for 90 calendar days to allow for reactivation or data export. After 90 days, all
                  personal data is permanently deleted from production systems.
                </li>
                <li>
                  <strong>Backups</strong> &mdash; Encrypted backups containing personal data may persist
                  for up to 30 additional days beyond the retention period before being automatically purged.
                </li>
                <li>
                  <strong>Immediate deletion</strong> &mdash; The Controller may request immediate deletion
                  of all data at any time by contacting the Processor. The Processor will complete the
                  deletion within 30 days of the request.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Security Measures</h2>
              <p className="text-muted-foreground mb-4">
                The Processor implements the following technical and organizational measures to protect
                personal data:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  <strong>Encryption at rest</strong> &mdash; All data stored in the database is encrypted
                  at rest using AES-256 encryption.
                </li>
                <li>
                  <strong>Encryption in transit</strong> &mdash; All data transmitted between clients and
                  servers is encrypted using TLS 1.2 or higher.
                </li>
                <li>
                  <strong>Tenant isolation</strong> &mdash; Row Level Security (RLS) policies enforce strict
                  data isolation between tenants at the database level. Each tenant&apos;s data is logically
                  separated and inaccessible to other tenants.
                </li>
                <li>
                  <strong>Authentication and access control</strong> &mdash; Multi-factor authentication (MFA)
                  is available for all user accounts. Role-based access control restricts data access based
                  on user permissions.
                </li>
                <li>
                  <strong>Audit logging</strong> &mdash; Security-relevant events are logged for audit and
                  compliance purposes.
                </li>
                <li>
                  <strong>Vulnerability management</strong> &mdash; Application dependencies are regularly
                  updated and monitored for known vulnerabilities.
                </li>
                <li>
                  <strong>Error monitoring</strong> &mdash; Automated error tracking detects and alerts on
                  anomalous behavior without exposing personal data in reports.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Data Breach Notification</h2>
              <p className="text-muted-foreground mb-4">
                In the event of a personal data breach, the Processor shall:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  Notify the Controller without undue delay and in any event within <strong>72 hours</strong> of
                  becoming aware of the breach.
                </li>
                <li>
                  Provide the Controller with sufficient information to enable the Controller to meet
                  any obligations to report or inform data subjects of the breach.
                </li>
                <li>
                  Cooperate with the Controller and take reasonable commercial steps to assist in the
                  investigation, mitigation, and remediation of the breach.
                </li>
                <li>
                  Not inform any third party of the breach without first obtaining the Controller&apos;s
                  written consent, unless required by law.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Data Subject Rights</h2>
              <p className="text-muted-foreground mb-4">
                The Controller&apos;s customers and contacts (&ldquo;data subjects&rdquo;) have the following
                rights, which the Controller can fulfill through the Job Clarity admin panel:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  <strong>Right of access</strong> &mdash; Data subjects may request a copy of their personal
                  data. The Controller can export individual contact records from the platform.
                </li>
                <li>
                  <strong>Right to rectification</strong> &mdash; Data subjects may request correction of
                  inaccurate data. The Controller can update records directly in the platform.
                </li>
                <li>
                  <strong>Right to erasure</strong> &mdash; Data subjects may request deletion of their
                  personal data. The Controller can delete individual records from the platform.
                </li>
                <li>
                  <strong>Right to data portability</strong> &mdash; Data subjects may request their data
                  in a portable format. The Controller can export data in standard formats (CSV, JSON).
                </li>
                <li>
                  <strong>Right to object</strong> &mdash; Data subjects may object to processing of their
                  data. The Controller should contact the Processor for assistance with objection requests.
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                The Processor will assist the Controller in responding to data subject requests within
                the timeframes required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Cross-Border Data Transfers</h2>
              <p className="text-muted-foreground mb-4">
                Personal data is primarily processed and stored in the United States. Where personal data
                is transferred across international borders:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  The Processor ensures that appropriate safeguards are in place, including EU Standard
                  Contractual Clauses (SCCs) where applicable.
                </li>
                <li>
                  Subprocessors are contractually required to maintain equivalent data protection standards.
                </li>
                <li>
                  The Controller may request information about the specific safeguards in place for any
                  cross-border transfer.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Amendments</h2>
              <p className="text-muted-foreground">
                The Processor may update this DPA from time to time to reflect changes in processing
                activities, subprocessors, or applicable law. The Processor will provide the Controller
                with at least <strong>30 days&apos; notice</strong> of any material changes. Continued use
                of the platform after the notice period constitutes acceptance of the updated DPA. The
                Controller may terminate the agreement if they do not accept the changes by providing
                written notice before the effective date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="text-muted-foreground">
                This DPA is governed by the laws of the State of Tennessee, consistent with the
                Terms of Service. Where the Controller is subject to the GDPR or other data protection
                regulations, the provisions of this DPA shall be interpreted in a manner consistent
                with those regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
              <p className="text-muted-foreground">
                For questions about this Data Processing Agreement or to exercise data protection
                rights, contact us at:{' '}
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
