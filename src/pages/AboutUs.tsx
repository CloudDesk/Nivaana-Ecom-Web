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
            Discover our journey in bringing you premium spiritual products
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
                To bring you the finest collection of premium incense sticks, essential oils, and spiritual home decor that enhance your sacred space and promote wellness.
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
                  Nivaana was born from a deep passion for spiritual wellness and the belief that our surroundings profoundly impact our inner peace. We understand that creating a sacred space is essential for meditation, prayer, and daily mindfulness.
                </p>
                <p>
                  Our journey began with a simple mission: to curate the finest incense sticks, essential oils, and spiritual decor that help you "Breathe in Bliss" and transform your home into a sanctuary of peace and tranquility.
                </p>
                <p>
                  Every product in our collection is carefully selected for its quality, authenticity, and ability to enhance your spiritual practice. We work directly with artisans and suppliers who share our commitment to natural ingredients and traditional craftsmanship.
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
                We source only the finest natural ingredients and work with skilled artisans to ensure every product meets our high standards.
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
                Every product is authentic and sourced from trusted suppliers who maintain traditional methods and natural ingredients.
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
                We believe in the power of aromatherapy and spiritual practices to enhance your mental, emotional, and spiritual well-being.
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
              Our carefully curated collection spans three essential categories for your spiritual journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Incense */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl mb-4">🕯️</div>
                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                  Premium Incense
                </h3>
                <p className="text-secondary-medium-gray mb-4">
                  Handcrafted incense sticks and cones made with natural ingredients for meditation and spiritual practices.
                </p>
                <ul className="text-sm text-secondary-medium-gray text-left space-y-1">
                  <li>• Sandalwood incense sticks</li>
                  <li>• Rose petal incense cones</li>
                  <li>• Jasmine fragrance blends</li>
                  <li>• Traditional Indian incense</li>
                </ul>
              </div>
            </div>

            {/* Essential Oils */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl mb-4">🌿</div>
                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                  Essential Oils
                </h3>
                <p className="text-secondary-medium-gray mb-4">
                  Pure, therapeutic-grade essential oils for aromatherapy, relaxation, and wellness.
                </p>
                <ul className="text-sm text-secondary-medium-gray text-left space-y-1">
                  <li>• Lavender for relaxation</li>
                  <li>• Eucalyptus for clarity</li>
                  <li>• Peppermint for energy</li>
                  <li>• Rosemary for focus</li>
                </ul>
              </div>
            </div>

            {/* Home Decor */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl mb-4">🏺</div>
                <h3 className="text-xl font-semibold text-secondary-dark-gray mb-3">
                  Spiritual Decor
                </h3>
                <p className="text-secondary-medium-gray mb-4">
                  Beautiful decorative elements to create a peaceful and sacred atmosphere in your home.
                </p>
                <ul className="text-sm text-secondary-medium-gray text-left space-y-1">
                  <li>• Buddha statues</li>
                  <li>• Meditation cushions</li>
                  <li>• Spiritual wall art</li>
                  <li>• Prayer bowls</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-primary-blue rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-primary-gold mb-4">
            Join Our Journey
          </h2>
          <p className="text-lg text-primary-gold/80 mb-6 max-w-2xl mx-auto">
            We're passionate about helping you create moments of peace and serenity. Join thousands of customers who have transformed their spaces with Nivaana.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/products"
              className="btn-primary"
            >
              Explore Our Products
            </a>
            <a
              href="/terms"
              className="btn-secondary"
            >
              Learn More
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
