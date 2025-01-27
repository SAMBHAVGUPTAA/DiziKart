const { Order } = require("../models/order.model");
const { Payment } = require("../models/payment.model");
const { deleteCart } = require("./cart.controller");
const stripe = require("stripe")(process.env.stripe_secret);

exports.webhook = async (req, res) => {
	const endpointSecret = process.env.endpoint_secret;
	const sig = req.headers["stripe-signature"];

	let event;

	try {
		event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
	} catch (err) {
		console.error(`Webhook Error: ${err.message}`);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}
	switch (event.type) {
		case "charge.succeeded":
			const paymentIntent = event.data.object;

			// Update the order in MongoDB
			const payment_id = paymentIntent.metadata.payment_id;
			const user_id = paymentIntent.metadata.user_id;
			//Update payment status in Payment Collection
			const payment = await Payment.findOneAndUpdate(
				{ _id: payment_id },
				{ $set: { payment_status: "succeeded" } },
				{ new: true }
			);
			const products = payment["products"];
			products.forEach(async (product) => {
				const order = new Order({
					user_id,
					payment_id,
					product,
				});
				await order.save();
			});
			await deleteCart(user_id);

			break;
	}

	// Return a response to acknowledge receipt of the event
	res.json({ received: true });
};

exports.createPaymentIntent = async (req, res) => {
	try {
		const { amount, products } = req.body;
		const user_id = req.id;

		// Minimum amount to charge in INR
		const minimumAmountInRupees = 37.50;

		// Check if the amount is less than the minimum required
		if (amount < minimumAmountInRupees) {
			return res.status(400).json({
				error: `The minimum amount for a transaction is ₹${minimumAmountInRupees}. Please adjust your order.`,
			});
		}

		// Create a new payment record in MongoDB
		const payment = new Payment({ user_id, amount });
		await payment.save();
		const payment_id = payment._id.toString();

		// Create a payment intent with Stripe
		const paymentIntent = await stripe.paymentIntents.create({
			amount: parseInt(amount * 100), // Convert to smallest currency unit (paise)
			currency: "inr",
			payment_method_types: ["card"],
			metadata: {
				payment_id: payment_id,
				user_id: user_id.toString(), // Convert ObjectId to string
			},
		});
		const stripe_id = paymentIntent.id;

		// Update the payment record with Stripe ID and products
		await Payment.findOneAndUpdate(
			{ _id: payment_id },
			{ $set: { stripe_id: stripe_id, products: products } }
		);
		return res.status(201).json({ pi: paymentIntent });
	} catch (err) {
		console.log(err);
		return res.status(500).json(err.message);
	}
};