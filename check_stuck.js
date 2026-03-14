
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkStuck() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
        const stuck = await Order.find({ paymentIntentId: { $exists: true }, paid: false });
        
        console.log("STUCK ORDERS (PI exists but Paid is false):", stuck.length);
        stuck.forEach(o => console.log(`ID: ${o._id} | PI: ${o.paymentIntentId} | Status: ${o.status}`));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkStuck();
