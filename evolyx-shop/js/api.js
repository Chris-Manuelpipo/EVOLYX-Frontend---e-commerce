/**
 * @fileoverview API Client - Fetch Wrapper
 * Centralized API communication with error handling
 * @author EVOLYX Team
 */

const API_BASE_URL = 'http://localhost:5000/api';
const LINK = 'http://localhost:5000/uploads/products';

/**
 * API Response Handler
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>} Parsed response
 * @throws {Error} If response not ok
 */

 
async function handleResponse(response) {
  // ✅ Gérer les réponses vides (204 No Content)
  if (response.status === 204) {
    return { success: true };
  }
  
  // ✅ Tenter de parser le JSON
  let data;
  try {
    data = await response.json();
  } catch (e) {
    console.warn('⚠️ Réponse non-JSON:', e);
    data = {};
  }
  
  // ✅ Si la réponse n'est pas OK
  if (!response.ok) {
    console.error('🔴 HTTP Error:', response.status, data);
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }
  
  // ✅ S'assurer que data est un objet
  return data || { success: true };
}
/**
 * Generic fetch wrapper
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = localStorage.getItem('adminToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    }); 

    return await handleResponse(response);
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

// ============================================
// API OBJECT
// ============================================

const API = {
  // ============================================
  // PUBLIC API
  // ============================================

  // Categories
  getCategories: () => apiCall('/categories'),
  getCategory: (id) => apiCall(`/categories/${id}`),

  // Products
  getProducts: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/products${queryString ? '?' + queryString : ''}`);
  },
  getProduct: (id) => apiCall(`/products/${id}`),
  getProductsByCategory: (categoryId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/products/category/${categoryId}${queryString ? '?' + queryString : ''}`);
  },
  searchProducts: (query, params = {}) => {
    const queryString = new URLSearchParams({ q: query, ...params }).toString();
    return apiCall(`/products/search?${queryString}`);
  },
  getFeaturedProducts: () => apiCall('/products/featured'),

  // Variations - ✅ CORRIGÉ
  getVariations: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/variations${queryString ? '?' + queryString : ''}`);
  },
  getVariation: (id) => apiCall(`/variations/${id}`),
  checkVariationStock: (id, quantity) => apiCall(`/variations/${id}/check-stock?quantity=${quantity}`),
  
  // ✅ Méthodes spécifiques pour couleurs et tailles
  getProductColors: (productId) => {
    return apiCall(`/variations/product/${productId}/colors`);
  },
  getProductSizes: (productId) => {
    return apiCall(`/variations/product/${productId}/sizes`);
  },
  getVariationStock: (variationId, quantity) => {
    return apiCall(`/variations/${variationId}/check-stock?quantity=${quantity}`);
  },

  // Cart
  createCart: () => apiCall('/cart', { method: 'POST' }),
  getCart: (token) => apiCall(`/cart/${token}`),
  addToCart: (cartToken, data) => apiCall(`/cart/${cartToken}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCartItem: (cartToken, itemId, quantity) => apiCall(`/cart/${cartToken}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  }),
  removeFromCart: (cartToken, itemId) => apiCall(`/cart/${cartToken}/items/${itemId}`, {
    method: 'DELETE',
  }),
  clearCart: (cartToken) => apiCall(`/cart/${cartToken}`, { method: 'DELETE' }),

  // Orders
  createOrder: (data) => apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getOrder: (id) => apiCall(`/orders/${id}`),
  trackOrder: (id) => apiCall(`/orders/${id}/track`),

  // ============================================
  // ADMIN API
  // ============================================

  // Admin Auth
  adminLogin: (email, password) => apiCall('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  adminLogout: () => apiCall('/admin/logout', { method: 'POST' }),

  // Admin Products - ✅ CORRIGÉ pour FormData
  // Dans api.js, modifiez getAdminProducts :

getAdminProducts: async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/admin/products${queryString ? '?' + queryString : ''}`;
  
  console.log('🔍 URL appelée:', url);
  
  try {
    const response = await apiCall(url);
    
    // ✅ La réponse a maintenant une structure standardisée
    if (response?.data?.products) {
      return {
        products: response.data.products,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      };
    }
    
    return response;
  } catch (error) {
    console.error('❌ Erreur getAdminProducts:', error);
    return { products: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
},

  createProduct: async (productData) => {
  console.log('📦 Création produit:', productData);
  
  try {
    const response = await apiCall('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    
    console.log('✅ Réponse création:', response);
    
    // ✅ Retourner directement la réponse
    return response;
    
  } catch (error) {
    console.error('❌ Erreur création produit:', error);
    throw error;
  }
},

  updateProduct: async (id, productData) => {
  console.log('📦 Mise à jour produit', id, ':', productData);
  
  const response = await apiCall(`/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
  
  return response;
},

  deleteProduct: (id) => apiCall(`/admin/products/${id}`, { method: 'DELETE' }),
  uploadProductImage: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    const headers = {};
    const token = localStorage.getItem('adminToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}/admin/products/${id}/images`, {
      method: 'POST',
      body: formData,
      headers,
    }).then(handleResponse);
  },

  // Admin Categories
  getAdminCategories: () => apiCall('/admin/categories'),
  createCategory: (data) => apiCall('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCategory: (id, data) => apiCall(`/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCategory: (id) => apiCall(`/admin/categories/${id}`, { method: 'DELETE' }),

  // Admin Variations
  getAdminVariations: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/admin/variations${queryString ? '?' + queryString : ''}`);
  },
  createVariation: (data) => apiCall('/admin/variations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateVariation: (id, data) => apiCall(`/admin/variations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateVariationStock: (id, stock) => apiCall(`/admin/variations/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  }),
  deleteVariation: (id) => apiCall(`/admin/variations/${id}`, { method: 'DELETE' }),

  // Admin Orders
  getAdminOrders: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/admin/orders${queryString ? '?' + queryString : ''}`);
  },
  getAdminOrder: (id) => apiCall(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) => apiCall(`/admin/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),

  // Admin Dashboard
  getDashboardStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/admin/stats${queryString ? '?' + queryString : ''}`);
  },
};

// Export for use
window.API = API;