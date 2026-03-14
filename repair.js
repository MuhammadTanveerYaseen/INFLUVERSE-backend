
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function repair() {
    try {
        await mongoose.connect(mongoURI);
        const offerId = '69b3ef7c8177249fec557260';
        const orderId = '69b3f2e226936b903a1367eb';
        
        const Offer = mongoose.model('Offer', new mongoose.Schema({ order: mongoose.Schema.Types.ObjectId }, { strict: false }));
        await Offer.findByIdAndUpdate(offerId, { order: orderId });
        
        console.log("REPAIR COMPLETE: Offer 69b3ef7c8177249fec557260 linked to Order 69b3f2e226936b903a1367eb");
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
repair();
