
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function testOrderCreation() {
    try {
        await mongoose.connect(mongoURI);
        const offerId = '69b3ef7c8177249fec557260';
        
        const Offer = mongoose.model('Offer', new mongoose.Schema({ status: String, brand: mongoose.Schema.Types.ObjectId, creator: mongoose.Schema.Types.ObjectId, price: Number, deliverables: String, packageDetails: Object }, { strict: false }));
        const Order = mongoose.model('Order', new mongoose.Schema({
            offer: mongoose.Schema.Types.ObjectId,
            brand: { type: mongoose.Schema.Types.ObjectId, required: true },
            creator: { type: mongoose.Schema.Types.ObjectId, required: true },
            price: { type: Number, required: true },
            platformFee: { type: Number, required: true },
            totalAmount: { type: Number, required: true },
            status: { type: String, default: 'pending_payment' },
            paid: { type: Boolean, default: false }
        }, { strict: false }));

        const offer = await Offer.findById(offerId);
        if (!offer) {
            console.log("Offer not found");
            return;
        }

        console.log("Offer details:", {
            brand: offer.brand,
            creator: offer.creator,
            price: offer.price
        });

        const platformFee = Number((offer.price * 0.15).toFixed(2));
        const totalAmount = Number((offer.price + platformFee).toFixed(2));

        try {
            const order = await Order.create({
                offer: offer._id,
                brand: offer.brand,
                creator: offer.creator,
                price: offer.price,
                platformFee,
                totalAmount,
                status: 'pending_payment',
                paid: false
            });
            console.log("Order created successfully:", order._id);
        } catch (createErr) {
            console.error("Order creation failed:", createErr.message);
            if (createErr.errors) {
                console.log("Validation Errors:", Object.keys(createErr.errors).map(key => `${key}: ${createErr.errors[key].message}`));
            }
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
testOrderCreation();
