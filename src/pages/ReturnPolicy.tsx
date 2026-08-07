import React from 'react';

const ReturnPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Return and Refund Policy
          </h1>

          <div className="prose prose-lg max-w-none text-secondary-dark-gray">
            <p className="text-center text-secondary-medium-gray mb-8">
              <strong>VIP98 VENTURES LLP</strong><br />
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">1. Return Policy Overview</h2>
                <p className="leading-relaxed">
                  At VIP98 VENTURES LLP, we want you to be completely satisfied with your purchase. Return,
                  replacement, missing-item, and refund eligibility is evaluated by the applicable product
                  Category or Subcategory policy and the reason selected for the request.
                </p>

                <div className="bg-primary-gold/10 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-primary-blue">Eligibility Window:</p>
                  <p className="text-lg font-bold text-primary-blue">Based on the product policy and selected reason</p>
                  <p className="mt-1 text-sm text-secondary-medium-gray">
                    Damaged-product claims must be raised within 48 hours of delivery.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">2. Eligible Returns</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Eligible for Return</h3>
                    <ul className="space-y-1 text-sm text-green-700">
                      <li>Wrong product delivered</li>
                      <li>Damaged products</li>
                      <li>Missing items from an order</li>
                      <li>Defective products</li>
                      <li>Leakage or broken bottle claims</li>
                      <li>Changed-mind returns for unopened packages where the policy allows it</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Not Eligible</h3>
                    <ul className="space-y-1 text-sm text-red-700">
                      <li>Changed-mind returns after the package has been opened</li>
                      <li>Used products</li>
                      <li>Items damaged by the customer</li>
                      <li>Requests raised after the applicable policy or reason deadline</li>
                      <li>Requests without required product, package, or video evidence</li>
                      <li>Requests where eligible quantity is already consumed by another active request</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">3. Return Process</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Initiate Request</h3>
                      <p className="text-sm text-secondary-medium-gray">
                        Open the delivered order, choose the eligible item, select a reason and resolution, and submit
                        the request with required evidence.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Evidence Review</h3>
                      <p className="text-sm text-secondary-medium-gray">
                        Our team reviews submitted photos or videos according to the selected reason's evidence rules.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Approval and Pickup</h3>
                      <p className="text-sm text-secondary-medium-gray">
                        When a physical return is required, an authorized Nivaana admin manually arranges reverse pickup
                        after review and approval.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Warehouse Verification</h3>
                      <p className="text-sm text-secondary-medium-gray">
                        Returned products are received and inspected before refund or replacement closure where
                        verification is required.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">5</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Resolution</h3>
                      <p className="text-sm text-secondary-medium-gray">
                        The approved resolution is completed as a refund, replacement, missing-item shipment, partial
                        refund, or complete return depending on the selected reason and policy.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">4. Return Conditions</h2>
                <p className="leading-relaxed mb-4">To be eligible for return, items must:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Be in original packaging when the selected reason requires it</li>
                  <li>Include all original accessories and documentation where applicable</li>
                  <li>Not show signs of use or customer-caused damage</li>
                  <li>Be within the applicable product policy and reason-specific deadline</li>
                  <li>Include the required evidence for the selected reason</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">5. Return Shipping</h2>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-primary-blue mb-2">Shipping Costs:</h3>
                  <ul className="space-y-2">
                    <li><strong>Reverse Shipping:</strong> Nivaana bears reverse-shipping charges for approved pickup-based return and replacement requests.</li>
                    <li><strong>No Refund Deduction:</strong> Reverse-shipping charges are not deducted from the customer's refund.</li>
                    <li><strong>Manual Pickup:</strong> Pickup is arranged by an authorized Nivaana admin after review and approval when the selected reason and resolution require physical return.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">6. Refund Processing</h2>
                <p className="leading-relaxed mb-4">
                  Approved refunds are processed using the allowed refund method for the applicable policy:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Original Payment:</strong> Processed after approval and required verification</li>
                  <li><strong>Wallet:</strong> Processed when wallet refund is allowed by the policy</li>
                  <li><strong>Partial Refund:</strong> Used for approved missing-product or partial-resolution cases where applicable</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">7. Replacement Policy</h2>
                <p className="leading-relaxed">
                  We offer replacements where the selected product policy and reason allow it:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Wrong product delivered</li>
                  <li>Damaged products</li>
                  <li>Defective products</li>
                  <li>Leakage or broken bottle cases</li>
                </ul>

                <div className="bg-primary-gold/10 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-primary-blue">Replacement Stock:</p>
                  <p className="text-sm">
                    If replacement stock is unavailable for eligible reasons, the request may be converted to refund and
                    the customer will be notified.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">8. Quality Assurance</h2>
                <p className="leading-relaxed">
                  All returned items undergo quality inspection where physical return is required:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Verification of product condition</li>
                  <li>Check for original packaging and accessories where applicable</li>
                  <li>Assessment of damage, defect, wrong-product, or leakage claims</li>
                  <li>Warehouse rejection stops refund or replacement and the customer is notified</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">9. Special Cases</h2>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Opened Packages</h3>
                    <p className="text-sm text-yellow-700">
                      Changed-mind requests are accepted only for unopened packaged products. Other reasons follow the
                      selected reason's configured package-condition rule.
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Missing Product</h3>
                    <p className="text-sm text-yellow-700">
                      Missing-product requests may be resolved through missing-item shipment, partial refund, or complete
                      return depending on approval. Pickup is required only for complete return.
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Evidence</h3>
                    <p className="text-sm text-yellow-700">
                      At least one photo is required for customer return, replacement, and refund claims. Some reasons
                      also require package photos or videos.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">10. Contact Information</h2>
                <p className="leading-relaxed">
                  For return requests and queries, please contact us:
                </p>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg mt-4">
                  <p><strong>VIP98 VENTURES LLP</strong></p>
                  <p>516D, Lakshmi Sundaram Nagar</p>
                  <p>Narasingapuram Road, Pandiyanallore Post</p>
                  <p>Sholinghur - 631102, Tamil Nadu</p>
                  <p>Phone: +91 8925662553</p>
                  <p>Email: returns@nivaana.com</p>
                  <p>Customer Service Hours: 9 AM - 6 PM (Mon-Sat)</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">11. Policy Updates</h2>
                <p className="leading-relaxed">
                  We reserve the right to modify this return and refund policy at any time. Changes will be effective
                  immediately upon posting. Continued use of our services constitutes acceptance of the modified policy.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnPolicy;
