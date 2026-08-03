import React from 'react';

const ReplacementExchange: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Replacement Policy
          </h1>

          <div className="prose prose-lg max-w-none text-secondary-dark-gray">
            <p className="text-center text-secondary-medium-gray mb-8">
              <strong>VIP98 VENTURES LLP</strong><br />
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="space-y-8">
              <section>
                <div className="bg-primary-blue/5 border-l-4 border-primary-blue p-6 rounded-r-lg">
                  <p className="leading-relaxed text-lg">
                    Replacement eligibility depends on the applicable product Category or Subcategory policy and the
                    selected reason. Damaged-product claims must be raised within 48 hours of delivery.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">Eligible Replacement Reasons</h2>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Wrong product delivered</li>
                  <li>Damaged product</li>
                  <li>Defective product</li>
                  <li>Leakage or broken bottle</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">Replacement Process</h2>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Submit the request from the delivered order with the required product evidence.</li>
                  <li>Our team reviews evidence before approval where the selected reason requires it.</li>
                  <li>When physical return is required, an authorized Nivaana admin manually arranges reverse pickup.</li>
                  <li>Nivaana bears reverse-shipping charges, and no pickup charge is deducted from the customer.</li>
                  <li>The replacement is processed after warehouse verification where required.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">Stock Unavailable</h2>
                <p className="leading-relaxed">
                  If replacement stock is unavailable for Wrong Product, Damaged Product, Defective Product, or Leakage /
                  Broken Bottle, the request may be converted to refund and the customer will be notified.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">Contact Information</h2>
                <p className="leading-relaxed mb-4">
                  For replacement queries, please contact us:
                </p>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                  <p><strong>VIP98 VENTURES LLP</strong></p>
                  <p>516D, Lakshmi Sundaram Nagar</p>
                  <p>Narasingapuram Road, Pandiyanallore Post</p>
                  <p>Sholinghur - 631102, Tamil Nadu</p>
                  <p>Phone: +91 8925662553</p>
                  <p>Email: info@nivaana.com</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplacementExchange;
