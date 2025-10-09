import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Products from './pages/Products';
import AboutUs from './pages/AboutUs';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import CancellationPolicy from './pages/CancellationPolicy';
import ReturnPolicy from './pages/ReturnPolicy';
import ReplacementExchange from './pages/ReplacementExchange';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/shipping" element={<ShippingPolicy />} />
            <Route path="/cancellation" element={<CancellationPolicy />} />
            <Route path="/returns" element={<ReturnPolicy />} />
            <Route path="/replacement-exchange" element={<ReplacementExchange />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
