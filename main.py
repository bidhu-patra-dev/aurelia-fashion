from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import time
import asyncio
import os
from dotenv import load_dotenv
import urllib.request
import json

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SYSTEM_INSTRUCTION = "You are the Aurelia Concierge, a highly sophisticated, polite, and fashion-forward AI assistant for an ultra-luxury, minimalist fashion brand named 'AURELIA'. Keep your answers concise, elegant, and helpful. You recommend Italian silk and Mongolian cashmere."

app = FastAPI(title="AURELIA API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class Product(BaseModel):
    id: int
    name: str
    price: float
    image_url: str
    description: str

class CartItem(BaseModel):
    product_id: int
    quantity: int

class PaymentRequest(BaseModel):
    items: List[CartItem]
    total_amount: float
    # other payment details would go here

class ChatMessage(BaseModel):
    message: str

class ContactForm(BaseModel):
    name: str
    email: str
    inquiry_type: str
    message: str

# --- Dummy Data ---

PRODUCTS = [
    {
        "id": 1,
        "name": "Obsidian Silk Trench",
        "price": 2450.00,
        "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80",
        "description": "A lightweight, fluid trench coat crafted from pure Italian silk."
    },
    {
        "id": 2,
        "name": "Champagne Cashmere Knit",
        "price": 1200.00,
        "image_url": "https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?w=800&q=80",
        "description": "Hand-sourced Mongolian cashmere spun into an ultra-soft sweater."
    },
    {
        "id": 3,
        "name": "Aurelia Signature Handbag",
        "price": 3800.00,
        "image_url": "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&q=80",
        "description": "Minimalist structured handbag in obsidian calf leather with gold-plated hardware."
    },
    {
        "id": 4,
        "name": "Onyx Evening Dress",
        "price": 4500.00,
        "image_url": "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80",
        "description": "Floor-length evening gown featuring an asymmetrical cut and subtle draping."
    }
]

# --- Endpoints ---

@app.get("/products", response_model=List[Product])
async def get_products():
    """Returns a list of luxury items."""
    return PRODUCTS

@app.post("/process-payment")
async def process_payment(request: PaymentRequest):
    """Simulates payment processing with a 2-second delay."""
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Simulate a 2-second delay
    await asyncio.sleep(2)
    
    return {"status": "success", "message": "Payment Successful"}

@app.post("/chat")
async def chat(request_data: ChatMessage):
    """AI agent powered by Google Gemini via REST API."""
    if not GEMINI_API_KEY:
        return {"reply": "I am currently undergoing maintenance. Please configure the Gemini API Key in the backend environment."}
        
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "system_instruction": {
                "parts": {"text": SYSTEM_INSTRUCTION}
            },
            "contents": [{
                "parts": [{"text": request_data.message}]
            }]
        }
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if "candidates" in result and len(result["candidates"]) > 0:
                reply = result["candidates"][0]["content"]["parts"][0]["text"]
            else:
                reply = "I apologize, but I could not formulate a response at this time."
                
    except Exception as e:
        print(f"Gemini API Error: {e}")
        reply = "I apologize, but I am currently unable to process your request. Please try again shortly."
        
    return {"reply": reply}

@app.post("/contact-submit")
async def contact_submit(form: ContactForm):
    """Receives contact form data."""
    # In a real app, we would send an email or save to a database
    print(f"Received inquiry from {form.name} ({form.email}): {form.inquiry_type}")
    return {"status": "success", "message": "Thank you for reaching out. An Aurelia representative will contact you shortly."}

# Serve the frontend statically
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
