import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import { GuestOnlyRoute, ProtectedRoute } from './components/RouteGuards';
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
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Account from './pages/Account';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import SavedAddresses from './pages/SavedAddresses';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Promotions from './pages/Promotions';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ToastProvider />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:productId" element={<ProductDetails />} />
            <Route path="/login" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/promotions" element={<ProtectedRoute><Promotions /></ProtectedRoute>} />
            <Route path="/addresses" element={<ProtectedRoute><SavedAddresses /></ProtectedRoute>} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/shipping" element={<ShippingPolicy />} />
            <Route path="/cancellation" element={<CancellationPolicy />} />
            <Route path="/returns" element={<ReturnPolicy />} />
            <Route path="/replacement-exchange" element={<ReplacementExchange />} />
            <Route path="/delete-my-account" element={<DeleteMyAccount />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
