import React from 'react';

const CancellationPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Cancellation and Refund Policy
          </h1>

          <div className="prose prose-lg max-w-none text-secondary-dark-gray">
            <p className="text-center text-secondary-medium-gray mb-8">
              <strong>VIP98 VENTURES LLP</strong><br />
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">1. Order Cancellation</h2>
                <p className="leading-relaxed">
                  You may cancel your order under the following conditions:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Can Cancel</h3>
                    <ul className="space-y-1 text-sm text-green-700">
                      <li>Before order processing begins</li>
                      <li>Within the allowed cancellation window</li>
                      <li>If product is out of stock</li>
                      <li>Due to technical errors</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Cannot Cancel</h3>
                    <ul className="space-y-1 text-sm text-red-700">
                      <li>After order processing begins</li>
                      <li>Once order is shipped</li>
                      <li>Orders marked as non-cancellable at purchase</li>
                      <li>Orders already delivered, which follow the return and replacement policy</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">2. How to Cancel an Order</h2>
                <p className="leading-relaxed mb-4">To cancel your order, you can:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Call our customer service at +91 8925662553</li>
                  <li>Email us at support@nivaana.com</li>
                  <li>Use the available cancellation action in your order flow where shown</li>
                </ul>

                <div className="bg-primary-gold/10 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-primary-blue">Required Information:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Order number</li>
                    <li>Customer name and contact details</li>
                    <li>Reason for cancellation</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">3. Refund Eligibility</h2>
                <p className="leading-relaxed mb-4">Refunds may be available for:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Cancelled orders before fulfilment restrictions apply</li>
                  <li>Wrong product claims approved under the return policy</li>
                  <li>Damaged product claims raised within 48 hours and approved</li>
                  <li>Defective product claims approved after evidence and inspection where required</li>
                  <li>Leakage or broken bottle claims approved under the return policy</li>
                  <li>Missing-product requests approved for partial refund or complete return</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">4. Refund Process</h2>
                <div className="space-y-4">
                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Step 1: Request Refund</h3>
                    <p className="text-sm">
                      For delivered items, submit the return, replacement, or missing-product request from the order flow
                      within the applicable product policy and reason deadline.
                    </p>
                  </div>

                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Step 2: Verification</h3>
                    <p className="text-sm">
                      We verify the request, required photos or videos, and warehouse inspection results where physical
                      return is required.
                    </p>
                  </div>

                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Step 3: Processing</h3>
                    <p className="text-sm">
                      Once approved and verified, the refund is processed using an allowed refund method for the
                      applicable policy.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">5. Refund Methods</h2>
                <p className="leading-relaxed mb-4">
                  Refunds are processed using a method allowed by the applicable policy:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Original Payment:</strong> Used where supported by the order payment method and policy</li>
                  <li><strong>Wallet:</strong> Used where wallet refund is allowed</li>
                  <li><strong>Manual Reference:</strong> Captured where an offline refund reference is required</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">6. Partial Refunds</h2>
                <p className="leading-relaxed">
                  Partial refunds may be applicable for approved missing-product or partial-resolution cases where the
                  policy allows that outcome.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">7. Non-Refundable Cases</h2>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="font-semibold text-red-800 mb-2">The following cases are not eligible for refunds:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-red-700">
                    <li>Products opened for changed-mind requests</li>
                    <li>Products that have been used</li>
                    <li>Items damaged due to customer misuse</li>
                    <li>Requests raised after the applicable product policy or reason deadline</li>
                    <li>Requests missing required evidence, unless an exception is approved by Nivaana</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">8. Return Shipping</h2>
                <p className="leading-relaxed">
                  Nivaana bears reverse-shipping charges for approved pickup-based return and replacement requests.
                  Reverse-shipping charges are not deducted from the customer's refund.
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Pickup is manually arranged by an authorized Nivaana admin after approval where required.</li>
                  <li>Missing-product requests require pickup only when the approved outcome is complete return.</li>
                  <li>Warehouse-rejected products stop refund or replacement processing and the customer is notified.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">9. Timeline for Refunds</h2>
                <div className="bg-primary-gold/10 p-4 rounded-lg">
                  <ul className="space-y-2">
                    <li><strong>Order Cancellation:</strong> Processed after cancellation approval</li>
                    <li><strong>Evidence-Based Claims:</strong> Processed after evidence review and approval</li>
                    <li><strong>Pickup-Based Returns:</strong> Processed after warehouse receipt and verification where required</li>
                    <li><strong>Replacement Stock Unavailable:</strong> Converted to refund where the selected reason allows fallback</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">10. Dispute Resolution</h2>
                <p className="leading-relaxed">
                  If you are not satisfied with our refund decision, you can:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Escalate to our customer service manager</li>
                  <li>Provide additional evidence or documentation</li>
                  <li>Request a second review of your case</li>
                  <li>Contact us for alternative resolution options</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">11. Contact Information</h2>
                <p className="leading-relaxed">
                  For cancellation and refund requests, please contact us:
                </p>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg mt-4">
                  <p><strong>VIP98 VENTURES LLP</strong></p>
                  <p>516D, Lakshmi Sundaram Nagar</p>
                  <p>Narasingapuram Road, Pandiyanallore Post</p>
                  <p>Sholinghur - 631102, Tamil Nadu</p>
                  <p>Phone: +91 8925662553</p>
                  <p>Email: support@nivaana.com</p>
                  <p>Customer Service Hours: 9 AM - 6 PM (Mon-Sat)</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">12. Policy Updates</h2>
                <p className="leading-relaxed">
                  We reserve the right to modify this cancellation and refund policy at any time. Changes will be
                  effective immediately upon posting. Continued use of our services constitutes acceptance of the
                  modified policy.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;
