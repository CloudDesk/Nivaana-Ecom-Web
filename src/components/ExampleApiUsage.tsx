// Example usage of the API service in a component

import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import type { Product } from '../types';

const ExampleComponent: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Using the common API service method
        const response = await productService.getProducts();
        
        if (response.success) {
          setProducts(response.data);
        } else {
          setError('Failed to fetch products');
        }
      } catch (err) {
        setError('Failed to fetch products');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Products ({products.length})</h2>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>Price: ₹{product.price}</p>
          <p>Category: {product.category}</p>
        </div>
      ))}
    </div>
  );
};

export default ExampleComponent;
