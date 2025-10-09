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
                  At VIP98 VENTURES LLP, we want you to be completely satisfied with your purchase of our premium incense sticks, essential oils, and spiritual decor products. This policy outlines the conditions and process for returns and refunds.
                </p>
                
                <div className="bg-primary-gold/10 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-primary-blue">Return Window:</p>
                  <p className="text-lg font-bold text-primary-blue">7 days from delivery date</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">2. Eligible Returns</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Eligible for Return</h3>
                    <ul className="space-y-1 text-sm text-green-700">
                      <li>Defective or damaged products</li>
                      <li>Wrong items delivered</li>
                      <li>Products not matching description</li>
                      <li>Unopened products in original packaging</li>
                      <li>Size/color mismatch (if applicable)</li>
                      <li>Missing items from order</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Not Eligible</h3>
                    <ul className="space-y-1 text-sm text-red-700">
                      <li>Opened essential oil bottles</li>
                      <li>Used incense sticks</li>
                      <li>Custom/personalized items</li>
                      <li>Items damaged by customer</li>
                      <li>Products returned after 7 days</li>
                      <li>Items without original packaging</li>
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
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Initiate Return Request</h3>
                      <p className="text-sm text-secondary-medium-gray">Contact us within 7 days of delivery with order details and reason for return.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Get Return Authorization</h3>
                      <p className="text-sm text-secondary-medium-gray">We will provide a Return Authorization Number (RAN) and return instructions.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Package Items</h3>
                      <p className="text-sm text-secondary-medium-gray">Pack items securely in original packaging with all accessories and documentation.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Ship Return</h3>
                      <p className="text-sm text-secondary-medium-gray">Send the package to our return address or arrange for pickup.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">5</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-blue mb-1">Receive Refund</h3>
                      <p className="text-sm text-secondary-medium-gray">Once verified, refund will be processed within 5-7 business days.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">4. Return Conditions</h2>
                <p className="leading-relaxed mb-4">To be eligible for return, items must:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Be in original, unopened packaging</li>
                  <li>Include all original accessories and documentation</li>
                  <li>Not show signs of use or damage</li>
                  <li>Be returned within 7 days of delivery</li>
                  <li>Have valid Return Authorization Number (RAN)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">5. Return Shipping</h2>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-primary-blue mb-2">Shipping Costs:</h3>
                  <ul className="space-y-2">
                    <li><strong>Defective/Wrong Items:</strong> Free return shipping</li>
                    <li><strong>Change of Mind:</strong> Customer pays return shipping</li>
                    <li><strong>Orders above ₹999:</strong> Free pickup service</li>
                    <li><strong>Return Shipping Cost:</strong> ₹99 (deducted from refund)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">6. Refund Processing</h2>
                <p className="leading-relaxed mb-4">Refunds will be processed using the original payment method:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Credit/Debit Cards:</strong> 5-7 business days</li>
                  <li><strong>Net Banking:</strong> 3-5 business days</li>
                  <li><strong>Digital Wallets:</strong> 1-3 business days</li>
                  <li><strong>UPI:</strong> 1-2 business days</li>
                  <li><strong>Cash on Delivery:</strong> Bank transfer within 7-10 days</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">7. Exchange Policy</h2>
                <p className="leading-relaxed">
                  We offer exchanges for:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Size or color mismatches (if applicable)</li>
                  <li>Defective products</li>
                  <li>Wrong items delivered</li>
                  <li>Products not matching description</li>
                </ul>
                
                <div className="bg-primary-gold/10 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-primary-blue">Exchange Process:</p>
                  <p className="text-sm">Follow the same return process, and we will ship the replacement item once the return is received and verified.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">8. Quality Assurance</h2>
                <p className="leading-relaxed">
                  All returned items undergo quality inspection:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Verification of product condition</li>
                  <li>Check for original packaging and accessories</li>
                  <li>Assessment of damage or defect claims</li>
                  <li>Authentication of product authenticity</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">9. Special Cases</h2>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Essential Oils</h3>
                    <p className="text-sm text-yellow-700">Due to safety and hygiene reasons, opened essential oil bottles cannot be returned unless defective.</p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Incense Sticks</h3>
                    <p className="text-sm text-yellow-700">Used incense sticks cannot be returned. Only unopened packages are eligible for return.</p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Spiritual Decor</h3>
                    <p className="text-sm text-yellow-700">Fragile decor items must be returned in original packaging with proper protection.</p>
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
                  We reserve the right to modify this return and refund policy at any time. Changes will be effective immediately upon posting on our website. Continued use of our services constitutes acceptance of the modified policy.
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
