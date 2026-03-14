
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function findOrphans() {
    try {
        await mongoose.connect(mongoURI);
        const Offer = mongoose.model('Offer', new mongoose.Schema({ status: String, order: mongoose.Schema.Types.ObjectId }, { strict: false }));
        const orphans = await Offer.find({ status: 'accepted', order: { $exists: false } });
        const orphansNull = await Offer.find({ status: 'accepted', order: null });
        
        console.log("ORPHANED OFFERS (Accepted but no Order link):", orphans.length + orphansNull.length);
        [...orphans, ...orphansNull].forEach(o => console.log(o._id));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
findOrphans();
