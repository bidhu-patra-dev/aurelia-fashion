// script.js

const API_BASE_URL = 'http://localhost:8001';

// Initialize Cart
let cart = JSON.parse(localStorage.getItem('aurelia_cart')) || [];

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initHeaderScroll();
    updateCartCount();
    setupCartDrawer();
    setupChatUI();
    initWardrobeAnimation();
    initMouseAura();
    
    // Page specific initialization
    if (document.getElementById('product-grid')) {
        loadProducts();
    }
    
    if (document.getElementById('checkout-items')) {
        renderCheckout();
        setupCheckoutForm();
    }
    
    if (document.getElementById('contact-form')) {
        setupContactForm();
    }
});

// --- Scroll Animations (Intersection Observer) ---
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(element => {
        observer.observe(element);
    });
}

// --- Header Scroll Effect ---
function initHeaderScroll() {
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// --- Cart Logic ---
function updateCartCount() {
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countElement.textContent = totalItems;
    }
}

function addToCart(product) {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1
        });
    }
    saveCart();
    renderCartDrawer();
    openCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product_id !== productId);
    saveCart();
    renderCartDrawer();
    if (document.getElementById('checkout-items')) {
        renderCheckout();
    }
}

function saveCart() {
    localStorage.setItem('aurelia_cart', JSON.stringify(cart));
    updateCartCount();
}

// --- Cart Drawer UI ---
function setupCartDrawer() {
    const cartIcon = document.getElementById('cart-icon');
    const closeCartBtn = document.getElementById('close-cart');
    const overlay = document.getElementById('overlay');
    
    if (cartIcon) cartIcon.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);
    
    renderCartDrawer();
}

function openCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('overlay');
    if (drawer && overlay) {
        drawer.classList.add('open');
        overlay.classList.add('active');
    }
}

function closeCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('overlay');
    if (drawer && overlay) {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function renderCartDrawer() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total-price');
    
    if (!cartItemsContainer || !cartTotalElement) return;
    
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">$${item.price.toFixed(2)} (x${item.quantity})</p>
                    <span class="cart-item-remove" onclick="removeFromCart(${item.product_id})">Remove</span>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
    }
    
    cartTotalElement.textContent = `$${total.toFixed(2)}`;
}

// --- Products Fetching ---
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    
    grid.innerHTML = '<p>Loading collections...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const products = await response.json();
        grid.innerHTML = '';
        
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card fade-in';
            card.innerHTML = `
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">$${product.price.toFixed(2)}</p>
                <button class="btn-secondary" onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&#39;")})'>Add to Cart</button>
            `;
            grid.appendChild(card);
        });
        
        // Re-initialize animations for new elements
        initScrollAnimations();
        
    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = '<p>Unable to load collections at this time.</p>';
    }
}

// --- Chat UI & Logic ---
function setupChatUI() {
    const fab = document.getElementById('chat-fab');
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    
    if (fab && chatWindow) {
        fab.addEventListener('click', () => {
            chatWindow.classList.toggle('open');
        });
    }
    
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            if (!message) return;
            
            appendChatMessage(message, 'user');
            input.value = '';
            
            try {
                const response = await fetch(`${API_BASE_URL}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: message })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    appendChatMessage(data.reply, 'bot');
                } else {
                    appendChatMessage('I am currently unavailable. Please try again later.', 'bot');
                }
            } catch (error) {
                console.error('Chat error:', error);
                appendChatMessage('Connection error. Please try again.', 'bot');
            }
        });
    }
}

function appendChatMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const msgElement = document.createElement('div');
    msgElement.className = `message ${sender}`;
    msgElement.textContent = text;
    
    messagesContainer.appendChild(msgElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --- Checkout Logic ---
function renderCheckout() {
    const itemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');
    
    if (!itemsContainer || !subtotalEl || !totalEl) return;
    
    itemsContainer.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p>Your cart is empty. <a href="index.html">Return to shop</a>.</p>';
        document.getElementById('checkout-btn').disabled = true;
    } else {
        document.getElementById('checkout-btn').disabled = false;
        cart.forEach(item => {
            total += item.price * item.quantity;
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">$${item.price.toFixed(2)} (x${item.quantity})</p>
                    <span class="cart-item-remove" onclick="removeFromCart(${item.product_id})">Remove</span>
                </div>
            `;
            itemsContainer.appendChild(itemElement);
        });
    }
    
    subtotalEl.textContent = `$${total.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;
}

function setupCheckoutForm() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (!checkoutBtn) return;
    
    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) return;
        
        checkoutBtn.textContent = 'Processing...';
        checkoutBtn.disabled = true;
        
        let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        try {
            const response = await fetch(`${API_BASE_URL}/process-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: cart, total_amount: total })
            });
            
            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                cart = [];
                saveCart();
                window.location.href = 'index.html';
            } else {
                alert('Payment processing failed. Please try again.');
                checkoutBtn.textContent = 'Place Order';
                checkoutBtn.disabled = false;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('An error occurred. Please try again later.');
            checkoutBtn.textContent = 'Place Order';
            checkoutBtn.disabled = false;
        }
    });
}

// --- Contact Form Logic ---
function setupContactForm() {
    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-contact');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                inquiry_type: document.getElementById('inquiry').value,
                message: document.getElementById('message').value
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/contact-submit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    alert(data.message);
                    form.reset();
                } else {
                    alert('Failed to send message. Please try again.');
                }
            } catch (error) {
                console.error('Contact error:', error);
                alert('An error occurred. Please try again later.');
            } finally {
                submitBtn.textContent = 'Send Inquiry';
                submitBtn.disabled = false;
            }
        });
    }
}

// --- Wardrobe Animation Logic ---
function initWardrobeAnimation() {
    const wardrobe = document.getElementById('wardrobe-landing');
    if (wardrobe) {
        // Prevent body from scrolling while wardrobe is closed
        document.body.style.overflow = 'hidden';
        
        wardrobe.addEventListener('click', () => {
            wardrobe.classList.add('opened');
            // Allow scrolling after doors start opening
            setTimeout(() => {
                document.body.style.overflow = 'auto';
                document.body.style.overflowX = 'hidden'; // preserve horizontal hidden
            }, 500);
            
            // Remove from view completely after animation finishes
            setTimeout(() => {
                wardrobe.style.display = 'none';
            }, 1500);
        });
    }
}

// --- Mouse Aura Logic ---
function initMouseAura() {
    const aura = document.createElement('div');
    aura.className = 'mouse-aura';
    document.body.appendChild(aura);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let auraX = mouseX;
    let auraY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        // Smoothly follow the mouse (liquid easing effect)
        auraX += (mouseX - auraX) * 0.08;
        auraY += (mouseY - auraY) * 0.08;

        aura.style.transform = `translate(${auraX}px, ${auraY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
    }
    animate();
    
    // Add interaction effect on clickable elements
    document.querySelectorAll('a, button, .product-card, .cart-icon-wrapper').forEach(el => {
        el.addEventListener('mouseenter', () => {
            aura.style.width = '400px';
            aura.style.height = '400px';
            aura.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(197, 160, 89, 0) 70%)';
        });
        el.addEventListener('mouseleave', () => {
            aura.style.width = '300px';
            aura.style.height = '300px';
            aura.style.background = 'radial-gradient(circle, rgba(197, 160, 89, 0.4) 0%, rgba(197, 160, 89, 0) 70%)';
        });
    });
}
