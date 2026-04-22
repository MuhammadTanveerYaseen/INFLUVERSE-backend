
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkOnboarding() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({ creator: mongoose.Schema.Types.ObjectId }, { strict: false }));
        const CreatorProfile = mongoose.model('CreatorProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId }, { strict: false }));
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        const orderId = '69dded265f8c264024c36106';
        const order = await Order.findById(orderId);
        
        if (!order) {
            console.log("Order not found: " + orderId);
            process.exit(1);
        }

        console.log("Order found. Creator ID: " + order.creator);
        
        const profile = await CreatorProfile.findOne({ user: order.creator });
        console.log("Creator Profile found: " + (profile ? "YES" : "NO"));
        if (profile) {
            console.log("StripeConnectId: " + profile.stripeConnectId);
            console.log("Country: " + profile.country);
        }

        const user = await User.findById(order.creator);
        console.log("Creator User found: " + (user ? "YES" : "NO"));
        if (user) {
            console.log("Email: " + user.email);
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkOnboarding();
