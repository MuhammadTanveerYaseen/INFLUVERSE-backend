
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkFinal() {
    try {
        await mongoose.connect(mongoURI);
        const Offer = mongoose.model('Offer', new mongoose.Schema({ status: String, price: Number }, { strict: false }));
        const offer = await Offer.findById('69b3ef618177249fec5571a9');
        console.log("OFFER 69b3ef618177249fec5571a9:", offer ? offer.status : 'NOT FOUND');
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkFinal();
