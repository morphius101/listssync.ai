// Script to create Stripe products and prices for ListsSync.ai
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createStripeProducts() {
  try {
    console.log('Creating Stripe products and prices...');

    // Create Professional Plan
    const professionalProduct = await stripe.products.create({
      name: 'Professional Plan',
      description: 'For growing businesses - Up to 100 checklists, 10 team members, real-time sync',
      metadata: {
        tier: 'professional',
        features: 'Up to 100 checklists, 10 team members, Real-time sync, 15 language translations, 50GB storage'
      }
    });

    const professionalPrice = await stripe.prices.create({
      unit_amount: 4900, // $49.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      product: professionalProduct.id,
      lookup_key: 'professional_monthly'
    });

    // Create Enterprise Plan
    const enterpriseProduct = await stripe.products.create({
      name: 'Enterprise Plan',
      description: 'For enterprise needs - Unlimited checklists, unlimited users, custom deployment',
      metadata: {
        tier: 'enterprise',
        features: 'Unlimited checklists, Unlimited users, All languages, Custom deployment, Enterprise SLA'
      }
    });

    const enterprisePrice = await stripe.prices.create({
      unit_amount: 29900, // $299.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      product: enterpriseProduct.id,
      lookup_key: 'enterprise_monthly'
    });

    console.log('✅ Products and prices created successfully!');
    console.log('');
    console.log('Add these to your environment variables:');
    console.log(`STRIPE_PROFESSIONAL_PRICE_ID=${professionalPrice.id}`);
    console.log(`STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrice.id}`);
    console.log('');
    console.log('Product Details:');
    console.log(`Professional: ${professionalProduct.id} (${professionalPrice.id})`);
    console.log(`Enterprise: ${enterpriseProduct.id} (${enterprisePrice.id})`);

  } catch (error) {
    console.error('Error creating Stripe products:', error);
  }
}

// Run the script
createStripeProducts();