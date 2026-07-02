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
                    <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Can Cancel</h3>
                    <ul className="space-y-1 text-sm text-green-700">
                      <li>Before order processing begins</li>
                      <li>Within 2 hours of order placement</li>
                      <li>If product is out of stock</li>
                      <li>Due to technical errors</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Cannot Cancel</h3>
                    <ul className="space-y-1 text-sm text-red-700">
                      <li>After order processing begins</li>
                      <li>Once order is shipped</li>
                      <li>Custom or personalized items</li>
                      <li>Orders marked as non-cancellable at purchase</li>
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
                  <li>Use the cancellation option in your order confirmation email</li>
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
                <p className="leading-relaxed mb-4">Refunds are available for:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Cancelled orders (before processing)</li>
                  <li>Defective or damaged products</li>
                  <li>Wrong items delivered</li>
                  <li>Products not matching description</li>
                  <li>Late delivery beyond promised timeframe</li>
                  <li>Duplicate orders due to technical issues</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">4. Refund Process</h2>
                <div className="space-y-4">
                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Step 1: Request Refund</h3>
                    <p className="text-sm">Contact us within 7 days of delivery with order details and reason for refund.</p>
                  </div>
                  
                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Step 2: Verification</h3>
                    <p className="text-sm">We will verify your request and may ask for additional information or photos.</p>
                  </div>
                  
                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Step 3: Processing</h3>
                    <p className="text-sm">Once approved, refund will be processed within 5-7 business days.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">5. Refund Methods</h2>
                <p className="leading-relaxed mb-4">Refunds will be processed using the same payment method used for the original purchase:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Credit/Debit Cards:</strong> 5-7 business days</li>
                  <li><strong>Net Banking:</strong> 3-5 business days</li>
                  <li><strong>Digital Wallets:</strong> 1-3 business days</li>
                  <li><strong>UPI:</strong> 1-2 business days</li>
                  <li><strong>Cash on Delivery:</strong> Bank transfer</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">6. Partial Refunds</h2>
                <p className="leading-relaxed">
                  Partial refunds may be applicable in the following cases:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Minor damage to packaging (product intact)</li>
                  <li>Missing included accessories or items</li>
                  <li>Late delivery (shipping cost refund)</li>
                  <li>Price difference due to promotional pricing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">7. Non-Refundable Items</h2>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="font-semibold text-red-800 mb-2">The following items are not eligible for refunds:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-red-700">
                    <li>Custom or personalized products</li>
                    <li>Products that have been opened and used</li>
                    <li>Items damaged due to customer misuse</li>
                    <li>Products returned after 7 days of delivery</li>
                    <li>Items marked as non-refundable at purchase, unless defective</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">8. Return Shipping</h2>
                <p className="leading-relaxed">
                  For defective or wrong items, we will arrange for pickup at no cost to you. For other returns:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Customer bears return shipping costs</li>
                  <li>Original shipping charges are non-refundable</li>
                  <li>Return shipping cost will be deducted from refund amount</li>
                  <li>Free pickup available for orders above ₹999</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">9. Timeline for Refunds</h2>
                <div className="bg-primary-gold/10 p-4 rounded-lg">
                  <ul className="space-y-2">
                    <li><strong>Order Cancellation:</strong> Immediate refund processing</li>
                    <li><strong>Defective Products:</strong> 5-7 business days after verification</li>
                    <li><strong>Wrong Items:</strong> 3-5 business days after return receipt</li>
                    <li><strong>Late Delivery:</strong> 2-3 business days after approval</li>
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
                  We reserve the right to modify this cancellation and refund policy at any time. Changes will be effective immediately upon posting on our website. Continued use of our services constitutes acceptance of the modified policy.
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
