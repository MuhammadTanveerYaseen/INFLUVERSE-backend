
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkOffer() {
    try {
        await mongoose.connect(mongoURI);
        const Offer = mongoose.model('Offer', new mongoose.Schema({}, { strict: false }));
        const offer = await Offer.findById('69b3ef7c8177249fec557260');
        console.log(JSON.stringify(offer, null, 2));
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkOffer();
