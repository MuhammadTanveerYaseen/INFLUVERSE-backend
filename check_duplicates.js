
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkDuplicates() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
        const orders = await Order.find({ offer: new mongoose.Types.ObjectId('69b3ef7c8177249fec557260') });
        
        console.log("ORDERS FOR OFFER 69b3ef7c8177249fec557260:", orders.length);
        orders.forEach(o => console.log(`ID: ${o._id} | Paid: ${o.paid} | Status: ${o.status} | CreatedAt: ${o.createdAt}`));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkDuplicates();
