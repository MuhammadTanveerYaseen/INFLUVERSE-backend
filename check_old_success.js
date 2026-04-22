
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkOldOrder() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({ creator: mongoose.Schema.Types.ObjectId, paid: Boolean }, { strict: false }));
        const CreatorProfile = mongoose.model('CreatorProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId }, { strict: false }));

        const orderId = '69dd03597151b65fd4a4eb63';
        const order = await Order.findById(orderId);
        
        if (!order) {
            console.log("Order not found: " + orderId);
            process.exit(1);
        }

        console.log("Order found. Paid: " + order.paid + ", Creator ID: " + order.creator);
        
        const profile = await CreatorProfile.findOne({ user: order.creator });
        if (profile) {
            console.log("StripeConnectId: " + profile.stripeConnectId);
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkOldOrder();
