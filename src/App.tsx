import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import StartupLoginModal from './components/StartupLoginModal';
import Home from './pages/Home';
import Products from './pages/Products';
import AboutUs from './pages/AboutUs';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import CancellationPolicy from './pages/CancellationPolicy';
import ReturnPolicy from './pages/ReturnPolicy';
import ReplacementExchange from './pages/ReplacementExchange';
import DeleteMyAccount from './pages/DeleteMyAccount';
import Login from './pages/Login';
import OtpLogin from './pages/OtpLogin';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <StartupLoginModal />
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
            <Route path="/delete-my-account" element={<DeleteMyAccount />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/otp" element={<OtpLogin />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
