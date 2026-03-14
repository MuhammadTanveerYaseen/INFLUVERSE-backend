
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function findAllDuplicates() {
    try {
        await mongoose.connect(mongoURI);
        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
        
        const duplicates = await Order.aggregate([
            { $group: { _id: "$offer", count: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
        ]);

        console.log("Duplicate Groups Found:", duplicates.length);
        duplicates.forEach(d => {
            console.log(`Offer: ${d._id} | Count: ${d.count} | IDs: ${d.ids.join(', ')}`);
        });

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
findAllDuplicates();
