# 🛍️ EVOLYX E-Commerce Frontend - Vanilla HTML/CSS/JS

**Premium Luxury Shopping Experience** - Multi-page frontend for EVOLYX Shop

## ✅ Pages Complètes

### **PUBLIC PAGES** 
- ✅ **index.html** - Accueil + Catalogue avec filtres & pagination
- ✅ **product.html** - Détail produit avec variations (couleurs, tailles)
- ✅ **cart.html** - Panier + Création de commande + WhatsApp
- ✅ **order-tracking.html** - Suivi de commande avec timeline
- ✅ **login.html** - Connexion Admin

### **ADMIN PAGES** (À compléter)
- [ ] admin/dashboard.html
- [ ] admin/products.html
- [ ] admin/categories.html
- [ ] admin/orders.html

## 🚀 **DÉMARRAGE RAPIDE**

### 1. **Vérifier que le Backend tourne**
```bash
cd ../backend
npm run dev
# ✅ Server running on http://localhost:5000
```

### 2. **Ouvrir le Frontend**
Simplement ouvrir `index.html` dans un navigateur ou utiliser un serveur local:
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server

# Option 3: LiveServer VS Code
# Clic droit > Open with Live Server
```

Puis accéder à: **http://localhost:8000** (ou le port indiqué)

## 📋 **ARCHITECTURE**

### **Structure des Fichiers**
```
shop/
├── index.html                 # Page accueil + catalogue
├── product.html               # Détail produit
├── cart.html                  # Panier
├── order-tracking.html        # Suivi commande
├── login.html                 # Admin login
├── css/
│   └── style.css              # Design system (EVOLYX luxury)
├── js/
│   ├── api.js                 # Fetch API wrapper
│   ├── utils.js               # Helpers & utilities
│   ├── auth.js                # Admin auth
│   ├── catalog.js             # Catalog page logic
│   ├── product-detail.js      # Product detail page
│   ├── cart.js                # Shopping cart logic
│   └── order-tracking.js      # Order tracking logic
├── assets/
│   ├── products/              # Product images
│   └── placeholder.png        # Default image
└── admin/                     # Admin pages (to build)
```

## 🎨 **DESIGN SYSTEM**

### **Colors (EVOLYX Palette)**
- **Black**: `#1A1A1A` - Primary dark
- **White**: `#FFFFFF` - Primary light
- **Gold**: `#D4AF37` - Accent (luxury)
- **Grays**: Various shades for text/borders

### **Typography**
- **Display Font**: Georgia (serif) - Headings
- **Body Font**: Segoe UI - Text

### **CSS Variables**
Tous les tokens sont définis dans `:root`:
```css
--color-gold
--font-display
--size-xl
--space-8
--shadow-md
--radius-md
--transition-base
```

## 🔌 **API INTEGRATION**

### **Base URL**
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### **Endpoints Utilisés**
```javascript
// Products
API.getProducts()
API.getProduct(id)
API.searchProducts(query)
API.getFeaturedProducts()

// Categories
API.getCategories()

// Variations
API.getVariations({ product_id })
API.getVariationColors(productId)
API.getVariationSizes(productId)

// Cart (localStorage only - no backend)
Storage.getCart()
Storage.setCart(cart)

// Orders
API.createOrder(data)
API.trackOrder(id)

// Admin
API.adminLogin(password)
API.getAdminProducts()
API.getAdminOrders()
// etc...
```

## 💾 **LOCALSTORAGE SCHEMA**

### **Cart Storage**
```javascript
{
  token: null,                    // Cart token from API
  items: [
    {
      product_id: 1,
      product_name: "T-Shirt",
      price: 25000,
      quantity: 2,
      variation_id: 5,            // Optional
      variation_color: "Or",      // Optional
      variation_size: "M"         // Optional
    }
  ],
  total: 50000
}
```

### **Admin Token Storage**
```javascript
localStorage.getItem('adminToken')  // Bearer token for admin requests
```

## 🛒 **WORKFLOW CLIENT**

1. **Parcourir le catalogue** (`index.html`)
   - Lister produits avec pagination
   - Filtrer par catégorie
   - Rechercher produits

2. **Voir détails produit** (`product.html?id=1`)
   - Images produit
   - Variations (couleurs, tailles)
   - Ajouter au panier

3. **Gérer panier** (`cart.html`)
   - Modifier quantités
   - Supprimer articles
   - Voir total

4. **Créer commande**
   - Entrer infos client (nom, téléphone, adresse)
   - Lien WhatsApp préempli vers `+237654804907`
   - Affichage confirmation

5. **Suivre commande** (`order-tracking.html?id=18`)
   - Timeline du statut
   - Détails commande
   - Contact support

## 🔐 **ADMIN WORKFLOW**

1. **Login** (`login.html`)
   - Entrer mot de passe admin
   - Token stocké en localStorage
   - Redirection vers dashboard

2. **Dashboard** (`admin/dashboard.html`)
   - Statistiques globales
   - Accès CRUD produits/catégories/commandes
   - Gestion variations

## ⚙️ **FONCTIONNALITÉS PRINCIPALES**

### **Catalog Page**
- ✅ Lazy loading images
- ✅ Pagination 12 items/page
- ✅ Filtres par catégorie
- ✅ Recherche texte
- ✅ Responsive grid (4→3→2→1 colonnes)
- ✅ Product cards avec hover effects

### **Product Detail Page**
- ✅ Images multiples (thumbnails)
- ✅ Variations couleur/taille
- ✅ Sélecteur quantité
- ✅ Stock disponible
- ✅ Breadcrumb navigation
- ✅ Produits relatifs (future)

### **Cart Page**
- ✅ Liste articles avec quantités
- ✅ Modifier/supprimer items
- ✅ Calcul total automatique
- ✅ Résumé commande
- ✅ Création commande avec formulaire
- ✅ Confirmation avec lien WhatsApp

### **Order Tracking**
- ✅ Recherche par ID
- ✅ Timeline statut visuelle
- ✅ Détails commande
- ✅ Contact support
- ✅ URL directe: `order-tracking.html?id=18`

## 📱 **RESPONSIVE DESIGN**

Breakpoints:
- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: < 768px

Tous les styles incluent des queries mobiles optimisées.

## 🎯 **À FAIRE (PHASE 2)**

### **Admin Pages**
```html
admin/dashboard.html      - Statistiques & overview
admin/products.html       - CRUD produits + upload
admin/categories.html     - CRUD catégories hiérarchiques
admin/orders.html         - Gestion commandes + statuts
admin/variations.html     - Gestion variations
```

### **Features Futures**
- [ ] Wishlist (localStorage)
- [ ] Product reviews
- [ ] Related products
- [ ] Search suggestions
- [x] SEO meta tags, sitemap, GA4 (consentement), voir `evolyx-shop/docs/SEO.md`
- [ ] Progressive Web App (PWA)
- [ ] Dark mode toggle
- [ ] Multi-langue

## 🧪 **TESTING**

### **Test Catalog**
1. Aller sur `index.html`
2. Filtrer par catégorie
3. Rechercher "Produit"
4. Vérifier pagination

### **Test Product Detail**
1. Cliquer sur un produit
2. Vérifier images & variations
3. Changer couleur/taille
4. Ajouter au panier

### **Test Cart**
1. Ajouter plusieurs produits
2. Modifier quantités
3. Supprimer articles
4. Créer commande
5. Cliquer lien WhatsApp

### **Test Order Tracking**
1. Aller sur `order-tracking.html`
2. Entrer ID commande existant
3. Vérifier timeline statut

## 🐛 **DEBUGGING**

### **Console Errors?**
1. Ouvrir DevTools (F12)
2. Onglet "Console"
3. Vérifier messages d'erreur
4. Vérifier URL de l'API

### **Images ne s'affichent pas?**
1. Vérifier chemin: `assets/products/{image_url}`
2. Vérifier fichiers existent dans `/backend/uploads/products/`
3. Utiliser DevTools Network tab

### **localStorage issues?**
```javascript
// Effacer localStorage
localStorage.clear()

// Vérifier contenu
console.log(localStorage)
```

## 📚 **DOCUMENTATION**

- **API**: `/backend/docs/API.md`
- **Database**: `/backend/docs/DATABASE.md`
- **Deployment**: `/backend/docs/DEPLOYMENT.md`

## 🚢 **DEPLOYMENT**

### **Frontend (Vercel/Netlify)**
1. Push code GitHub
2. Connecter Vercel/Netlify
3. Deploy automatique
4. Mettre à jour `API_BASE_URL` en production

### **Backend (Railway/Heroku)**
Voir `/backend/docs/DEPLOYMENT.md`

## 💬 **SUPPORT**

Questions? Contacter via WhatsApp: **+237 654 804 907**

---

**Built with ❤️ by EVOLYX Team**  
*Professional Vanilla Frontend - No Frameworks*