import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg max-w-none text-secondary-dark-gray">
            <p className="text-center text-secondary-medium-gray mb-8">
              <strong>VIP98 VENTURES LLP</strong><br />
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">1. Introduction</h2>
                <p className="leading-relaxed">
                  At VIP98 VENTURES LLP, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase from us.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">2. Information We Collect</h2>
                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">Personal Information</h3>
                <p className="leading-relaxed mb-4">
                  We may collect the following personal information:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Name and contact information (email, phone number)</li>
                  <li>Billing and shipping addresses</li>
                  <li>Payment information (processed securely through our payment partners)</li>
                  <li>Order history and preferences</li>
                  <li>Communication preferences</li>
                </ul>

                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3 mt-6">Non-Personal Information</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Browser type and version</li>
                  <li>IP address and device information</li>
                  <li>Website usage patterns and analytics</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">3. How We Use Your Information</h2>
                <p className="leading-relaxed mb-4">We use your information for the following purposes:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Processing and fulfilling your orders</li>
                  <li>Providing customer support and service</li>
                  <li>Sending order confirmations and shipping updates</li>
                  <li>Improving our website and services</li>
                  <li>Sending marketing communications (with your consent)</li>
                  <li>Complying with legal obligations</li>
                  <li>Preventing fraud and ensuring security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">4. Information Sharing</h2>
                <p className="leading-relaxed">
                  We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>With trusted service providers who assist in our operations</li>
                  <li>With shipping carriers for order delivery</li>
                  <li>With payment processors for transaction processing</li>
                  <li>When required by law or legal process</li>
                  <li>To protect our rights and prevent fraud</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">5. Data Security</h2>
                <p className="leading-relaxed">
                  We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>SSL encryption for data transmission</li>
                  <li>Secure servers and databases</li>
                  <li>Regular security assessments</li>
                  <li>Limited access to personal information</li>
                  <li>Employee training on data protection</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">6. Cookies and Tracking</h2>
                <p className="leading-relaxed">
                  We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and personalize content. You can control cookie settings through your browser preferences.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">7. Your Rights</h2>
                <p className="leading-relaxed mb-4">You have the following rights regarding your personal information:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Access and review your personal data</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Data portability</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">8. Data Retention</h2>
                <p className="leading-relaxed">
                  We retain your personal information only as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">9. Children's Privacy</h2>
                <p className="leading-relaxed">
                  Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">10. International Transfers</h2>
                <p className="leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">11. Contact Information</h2>
                <p className="leading-relaxed">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg mt-4">
                  <p><strong>VIP98 VENTURES LLP</strong></p>
                  <p>516D, Lakshmi Sundaram Nagar</p>
                  <p>Narasingapuram Road, Pandiyanallore Post</p>
                  <p>Sholinghur - 631102, Tamil Nadu</p>
                  <p>Phone: +91 8925662553</p>
                  <p>Email: privacy@nivaana.com</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">12. Changes to Privacy Policy</h2>
                <p className="leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
