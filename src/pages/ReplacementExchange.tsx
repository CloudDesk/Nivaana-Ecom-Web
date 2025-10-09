import React from 'react';

const ReplacementExchange: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Replacement and Exchange Policy
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
                    For any replacement or exchange kindly contact us within 2 days from the date of delivery and the new item will be delivered within 3 to 5 working days to your address.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">Contact Information</h2>
                <p className="leading-relaxed mb-4">
                  To initiate a replacement or exchange request, please contact us:
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

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">Important Notes</h2>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Replacement or exchange requests must be made within 2 days from the date of delivery</li>
                  <li>The product should be unused, in original packaging, and in the same condition as received</li>
                  <li>Please have your order number ready when contacting us</li>
                  <li>The new item will be delivered within 3 to 5 working days after the request is approved</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplacementExchange;

