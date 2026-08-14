import React from 'react';

const ShippingPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-4xl font-bold text-secondary-dark-gray mb-6 text-center">
            Shipping Policy
          </h1>
          
          <div className="prose prose-lg max-w-none text-secondary-dark-gray">
            <p className="text-center text-secondary-medium-gray mb-8">
              <strong>VIP98 VENTURES LLP</strong><br />
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">1. Shipping Areas</h2>
                <p className="leading-relaxed">
                  We currently ship eligible Nivaana products across India. We are committed to delivering your orders safely to your doorstep.
                </p>
                <div className="bg-primary-gold/10 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-primary-blue">Shipping Coverage:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>All major cities and towns in India</li>
                    <li>Remote areas with standard delivery times</li>
                    <li>Express delivery available for select locations</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">2. Processing Time</h2>
                <p className="leading-relaxed mb-4">
                  All orders are processed within 1-2 business days from the date of order confirmation. Processing time may be extended during:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Festival seasons and peak shopping periods</li>
                  <li>Custom orders or special requests</li>
                  <li>High-demand periods for specific products</li>
                  <li>Weather-related delays</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">3. Shipping Methods and Delivery Times</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Standard Shipping</h3>
                    <ul className="space-y-1 text-sm">
                      <li><strong>Metro Cities:</strong> 3-5 business days</li>
                      <li><strong>Tier 2 Cities:</strong> 5-7 business days</li>
                      <li><strong>Other Locations:</strong> 7-10 business days</li>
                      <li><strong>Cost:</strong> ₹150 per order unless an eligible free-shipping promotion applies</li>
                    </ul>
                  </div>
                  
                  <div className="bg-secondary-extra-light-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary-blue mb-2">Express Shipping</h3>
                    <ul className="space-y-1 text-sm">
                      <li><strong>Metro Cities:</strong> 1-2 business days</li>
                      <li><strong>Tier 2 Cities:</strong> 2-3 business days</li>
                      <li><strong>Other Locations:</strong> 3-5 business days</li>
                      <li><strong>Cost:</strong> ₹150 additional</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">4. Shipping Costs</h2>
                <div className="bg-primary-gold/10 p-4 rounded-lg">
                  <ul className="space-y-2">
                    <li><strong>Free Shipping:</strong> Available through eligible promotions</li>
                    <li><strong>Standard Shipping:</strong> ₹150 per order</li>
                    <li><strong>Express Shipping:</strong> ₹150 additional charge</li>
                    <li><strong>Cash on Delivery:</strong> ₹50 additional charge</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">5. Special Handling for Fragile Products</h2>
                <p className="leading-relaxed">
                  Certain products may require special care during shipping:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Liquid products are packaged in leak-resistant containers where applicable</li>
                  <li>Delicate products are wrapped in protective materials</li>
                  <li>Fragile items are packed with extra cushioning</li>
                  <li>Temperature-sensitive products are handled with care</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">6. Order Tracking</h2>
                <p className="leading-relaxed">
                  Once your order is shipped, you will receive:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Shipping confirmation email with tracking number</li>
                  <li>SMS updates on your registered mobile number</li>
                  <li>Real-time tracking through our website</li>
                  <li>Delivery notifications</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">7. Delivery Attempts</h2>
                <p className="leading-relaxed">
                  Our delivery partners will make up to 3 delivery attempts. If delivery is unsuccessful:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Package will be held at the nearest delivery center</li>
                  <li>You will be notified via SMS/email</li>
                  <li>You can reschedule delivery or pick up from the center</li>
                  <li>Package will be returned after 7 days if unclaimed</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">8. Address Accuracy</h2>
                <p className="leading-relaxed">
                  Please ensure your shipping address is complete and accurate. We are not responsible for delays or failed deliveries due to:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Incorrect or incomplete addresses</li>
                  <li>Missing apartment/building numbers</li>
                  <li>Incorrect PIN codes</li>
                  <li>Inaccessible delivery locations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">9. Damaged or Lost Packages</h2>
                <p className="leading-relaxed">
                  In the rare event of damaged or lost packages:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Report the issue within 48 hours of delivery</li>
                  <li>Provide photos of damaged products</li>
                  <li>We will investigate and provide appropriate resolution</li>
                  <li>Replacement or refund will be processed as per our policy</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">10. Weather and Force Majeure</h2>
                <p className="leading-relaxed">
                  Delivery may be delayed due to circumstances beyond our control, including:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Natural disasters and extreme weather conditions</li>
                  <li>Transportation strikes or disruptions</li>
                  <li>Government restrictions or lockdowns</li>
                  <li>Pandemic-related restrictions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">11. Contact Information</h2>
                <p className="leading-relaxed">
                  For shipping-related queries or concerns, please contact us:
                </p>
                <div className="bg-secondary-extra-light-gray p-4 rounded-lg mt-4">
                  <p><strong>VIP98 VENTURES LLP</strong></p>
                  <p>516D, Lakshmi Sundaram Nagar</p>
                  <p>Narasingapuram Road, Pandiyanallore Post</p>
                  <p>Sholinghur - 631102, Tamil Nadu</p>
                  <p>Phone: +91 8925662553</p>
                  <p>Email: shipping@nivaana.com</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-primary-blue mb-4">12. Policy Updates</h2>
                <p className="leading-relaxed">
                  We reserve the right to modify this shipping policy at any time. Changes will be effective immediately upon posting on our website. Continued use of our services constitutes acceptance of the modified policy.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicy;
