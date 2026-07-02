import React from 'react';

const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-extra-light-gray">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark-gray mb-2">
            About Nivaana
          </h1>
          <p className="text-lg text-secondary-medium-gray">
            Discover our journey in bringing thoughtfully curated Nivaana products to your home
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mission Section */}
        <section className="mb-16">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-secondary-dark-gray mb-4">
                Our Mission
              </h2>
              <p className="text-xl text-secondary-medium-gray max-w-3xl mx-auto">
                To bring you a refined collection of home fragrance, freshness, gifting, and lifestyle products that make everyday spaces feel more inviting.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-secondary-dark-gray mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-secondary-medium-gray">
                <p>
                  Nivaana was born from a deep passion for thoughtful living and the belief that our surroundings shape how we feel each day. We understand that fragrance, freshness, and carefully chosen products can make a space feel calm, welcoming, and personal.
                </p>
                <p>
                  Our journey began with a simple mission: to curate quality products that help you "Breathe in Bliss" and transform everyday routines into moments of comfort.
                </p>
                <p>
                  Every product in our collection is carefully selected for quality, usability, and customer value. We work with trusted suppliers who share our commitment to dependable products and responsible service.
                </p>
              </div>
            </div>
            <div className="bg-primary-blue rounded-xl p-8 text-center">
              <div className="text-primary-gold text-6xl mb-4">🕯️</div>
              <h3 className="text-2xl font-bold text-primary-gold mb-4">
                Breathe in Bliss
              </h3>
              <p className="text-primary-gold/80">
                Our tagline reflects our commitment to helping you create moments of peace and serenity in your daily life.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-dark-gray mb-4">
              Our Values
            </h2>
            <p className="text-lg text-secondary-medium-gray max-w-2xl mx-auto">
              These core principles guide everything we do at Nivaana
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Quality */}
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <div className="bg-primary-gold/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                Premium Quality
              </h3>
              <p className="text-secondary-medium-gray">
                We work with trusted suppliers and review products carefully so each listing meets our quality standards.
              </p>
            </div>

            {/* Authenticity */}
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <div className="bg-primary-gold/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                Authenticity
              </h3>
              <p className="text-secondary-medium-gray">
                Every product is sourced from trusted partners and listed with clear details so customers can shop with confidence.
              </p>
            </div>

            {/* Wellness */}
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <div className="bg-primary-gold/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                Spiritual Wellness
              </h3>
              <p className="text-secondary-medium-gray">
                We believe thoughtfully chosen products can make daily routines more comfortable, fresh, and meaningful.
              </p>
            </div>
          </div>
        </section>

        {/* Product Categories */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-dark-gray mb-4">
              What We Offer
            </h2>
            <p className="text-lg text-secondary-medium-gray max-w-2xl mx-auto">
              Our carefully curated collection focuses on products currently available through the Nivaana store
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Incense */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl mb-4">🕯️</div>
                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                  Home Fragrance
                </h3>
                <p className="text-secondary-medium-gray mb-4">
                  Fragrance-led products selected to help homes, rooms, and daily routines feel fresh and inviting.
                </p>
                <ul className="text-sm text-secondary-medium-gray text-left space-y-1">
                  <li>• Premium incense sticks</li>
                  <li>• Room freshness products</li>
                  <li>• Fragrance blends</li>
                  <li>• Wardrobe sachets</li>
                </ul>
              </div>
            </div>

            {/* Essential Oils */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl mb-4">🌿</div>
                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                  Car & Room Fresheners
                </h3>
                <p className="text-secondary-medium-gray mb-4">
                  Everyday freshness products designed for cars, rooms, wardrobes, and personal spaces.
                </p>
                <ul className="text-sm text-secondary-medium-gray text-left space-y-1">
                  <li>• Premium room mist</li>
                  <li>• Fragrance sachets</li>
                  <li>• Diffuser oils</li>
                  <li>• Freshness essentials</li>
                </ul>
              </div>
            </div>

            {/* Home Decor */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl mb-4">🏺</div>
                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                  Gift Collections
                </h3>
                <p className="text-secondary-medium-gray mb-4">
                  Giftable and decorative products selected for thoughtful everyday occasions.
                </p>
                <ul className="text-sm text-secondary-medium-gray text-left space-y-1">
                  <li>• Home decor</li>
                  <li>• Table decor</li>
                  <li>• Gift-ready products</li>
                  <li>• Curated selections</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="bg-primary-blue rounded-xl p-8 text-center scroll-mt-32">
          <h2 className="text-3xl font-bold text-primary-gold mb-4">
            Contact Us
          </h2>
          <div className="mx-auto mb-6 max-w-2xl space-y-2 text-primary-gold/85">
            <p className="font-semibold text-primary-gold">VIP98 VENTURES LLP</p>
            <p>516D, Lakshmi Sundaram Nagar, Narasingapuram Road, Pandiyanallore Post</p>
            <p>Sholinghur - 631102, Tamil Nadu</p>
            <p>Phone: +91 8925662553</p>
            <p>Email: support@nivaana.com</p>
            <p>Customer Service Hours: 9 AM - 6 PM (Mon-Sat)</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/products"
              className="btn-primary"
            >
              Explore Our Products
            </a>
            <a
              href="mailto:support@nivaana.com"
              className="btn-secondary"
            >
              Email Support
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
