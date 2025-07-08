// Script to find price ID for a specific product
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function findPriceId(productId) {
  try {
    console.log(`Finding price ID for product: ${productId}`);
    
    // Get the product details
    const product = await stripe.products.retrieve(productId);
    console.log(`Product Name: ${product.name}`);
    console.log(`Product Description: ${product.description}`);
    
    // Get all prices for this product
    const prices = await stripe.prices.list({
      product: productId,
      active: true
    });
    
    console.log(`\nFound ${prices.data.length} active prices:`);
    
    for (const price of prices.data) {
      const amount = price.unit_amount / 100;
      const currency = price.currency.toUpperCase();
      const interval = price.recurring?.interval || 'one-time';
      console.log(`\n📋 Price ID: ${price.id}`);
      console.log(`   Amount: ${currency} $${amount}/${interval}`);
      console.log(`   Active: ${price.active}`);
      console.log(`   Created: ${new Date(price.created * 1000).toLocaleDateString()}`);
    }
    
  } catch (error) {
    console.error('Error finding price ID:', error.message);
  }
}

// Use the product ID you mentioned
findPriceId('prod_Se2NgMjHGzQvpQ');