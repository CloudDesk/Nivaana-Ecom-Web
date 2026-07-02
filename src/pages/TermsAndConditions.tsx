import React from 'react';

const TermsAndConditions: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Terms and Conditions
          </h1>
          
          <div className="prose prose-lg max-w-none text-secondary-dark-gray">
            <p className="text-center text-secondary-medium-gray mb-8">
              <strong>VIP98 VENTURES LLP</strong><br />
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">1. Acceptance of Terms</h2>
                <p className="leading-relaxed">
                  By accessing and using Nivaana's website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">2. Company Information</h2>
                <p className="leading-relaxed">
                  <strong>Business Name:</strong> VIP98 VENTURES LLP<br />
                  <strong>Address:</strong> 516D, Lakshmi Sundaram Nagar, Narasingapuram Road, Pandiyanallore Post, Sholinghur - 631102, Tamil Nadu<br />
                  <strong>Phone:</strong> +91 8925662553<br />
                  <strong>Website:</strong> https://nivaana.in
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">3. Products and Services</h2>
                <p className="leading-relaxed">
                  Nivaana offers curated fragrance, home, gifting, and lifestyle products through its ecommerce website. Our catalog may include:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Home fragrance and freshness products</li>
                  <li>Gifting and decor products</li>
                  <li>Lifestyle and wellness-oriented products</li>
                  <li>Other products listed as available on the website</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">4. Ordering and Payment</h2>
                <p className="leading-relaxed">
                  All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason. Payment must be received in full before order processing begins.
                </p>
                <p className="leading-relaxed mt-2">
                  We accept various payment methods including credit cards, debit cards, net banking, and digital wallets. All transactions are processed securely through our payment gateway partners.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">5. Pricing and Taxes</h2>
                <p className="leading-relaxed">
                  All prices displayed on our website are in Indian Rupees (INR) and include applicable taxes unless otherwise stated. We reserve the right to modify prices at any time without prior notice.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">6. Shipping and Delivery</h2>
                <p className="leading-relaxed">
                  We ship our products across India. Delivery times may vary depending on the location and shipping method selected. We are not responsible for delays caused by shipping carriers or circumstances beyond our control.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">7. Product Quality and Authenticity</h2>
                <p className="leading-relaxed">
                  We work to ensure the authenticity and quality of products listed on our website. Product details, specifications, availability, and usage instructions are provided on the respective product pages.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">8. Intellectual Property</h2>
                <p className="leading-relaxed">
                  All content on this website, including text, graphics, logos, images, and software, is the property of VIP98 VENTURES LLP and is protected by copyright and other intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">9. Limitation of Liability</h2>
                <p className="leading-relaxed">
                  VIP98 VENTURES LLP shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our products or services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">10. Governing Law</h2>
                <p className="leading-relaxed">
                  These terms and conditions are governed by the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Tamil Nadu, India.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">11. Contact Information</h2>
                <p className="leading-relaxed">
                  For any questions regarding these terms and conditions, please contact us at:
                </p>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg mt-4">
                  <p><strong>VIP98 VENTURES LLP</strong></p>
                  <p>516D, Lakshmi Sundaram Nagar</p>
                  <p>Narasingapuram Road, Pandiyanallore Post</p>
                  <p>Sholinghur - 631102, Tamil Nadu</p>
                  <p>Phone: +91 8925662553</p>
                  <p>Email: info@nivaana.com</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">12. Changes to Terms</h2>
                <p className="leading-relaxed">
                  We reserve the right to modify these terms and conditions at any time. Changes will be effective immediately upon posting on our website. Your continued use of our services constitutes acceptance of the modified terms.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
