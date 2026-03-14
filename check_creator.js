
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkCreatorView() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({ status: String, creator: mongoose.Schema.Types.ObjectId }, { strict: false }));
        const creatorId = new mongoose.Types.ObjectId('69b298986bfe46191fab6cc6');
        const orders = await Order.find({ creator: creatorId }).sort({ createdAt: -1 });
        
        console.log("CREATOR ORDERS:", orders.length);
        orders.forEach(o => console.log(`ID: ${o._id} | Status: ${o.status} | Paid: ${o.paid}`));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkCreatorView();
