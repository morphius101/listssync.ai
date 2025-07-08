// Script to check existing Stripe products and prices
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkStripeProducts() {
  try {
    console.log('Checking existing Stripe products...');
    
    // List all products
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });
    
    console.log(`Found ${products.data.length} active products:`);
    console.log('');
    
    for (const product of products.data) {
      console.log(`Product: ${product.name}`);
      console.log(`  ID: ${product.id}`);
      console.log(`  Description: ${product.description}`);
      
      // Get all prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true
      });
      
      console.log(`  Prices:`);
      for (const price of prices.data) {
        const amount = price.unit_amount / 100;
        const currency = price.currency.toUpperCase();
        const interval = price.recurring?.interval || 'one-time';
        console.log(`    ${price.id}: ${currency} $${amount}/${interval}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('Error checking Stripe products:', error);
  }
}

checkStripeProducts();