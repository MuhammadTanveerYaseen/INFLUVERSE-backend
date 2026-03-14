
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkRecentOrders() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({ status: String, paid: Boolean }, { strict: false }));
        const Offer = mongoose.model('Offer', new mongoose.Schema({ status: String, paid: Boolean }, { strict: false }));
        
        const last5Orders = await Order.find().sort({ createdAt: -1 }).limit(5);
        const last5Offers = await Offer.find().sort({ createdAt: -1 }).limit(5);

        console.log("RECENT ORDERS (Last 5):");
        last5Orders.forEach(o => {
            console.log(`ID: ${o._id} | Status: ${o.status} | Paid: ${o.paid} | CreatedAt: ${o.createdAt}`);
        });

        console.log("\nRECENT OFFERS (Last 5):");
        last5Offers.forEach(o => {
            console.log(`ID: ${o._id} | Status: ${o.status} | Paid: ${o.paid} | CreatedAt: ${o.createdAt}`);
        });

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkRecentOrders();
