
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function fixStatuses() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({ status: String, paid: Boolean }, { strict: false }));
        
        const result = await Order.updateMany(
            { status: 'active', paid: { $ne: true } },
            { $set: { status: 'pending_payment' } }
        );
        
        console.log("Bulk update result:", result);
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
fixStatuses();
