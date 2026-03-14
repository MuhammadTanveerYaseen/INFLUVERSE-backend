
const mongoose = require('mongoose');
const mongoURI = 'mongodb://areejfatima2817_db_user:bZWg3gq5C0aZcy7V@ac-7z5xfku-shard-00-00.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-01.nssgort.mongodb.net:27017,ac-7z5xfku-shard-00-02.nssgort.mongodb.net:27017/?ssl=true&replicaSet=atlas-ode6jt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkId() {
    try {
        await mongoose.connect(mongoURI);
        const searchId = '69b3ef7c8177249fec557260';
        
        const Offer = mongoose.model('Offer', new mongoose.Schema({}, { strict: false }));
        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

        const offer = await Offer.findById(searchId);
        const orderById = await Order.findById(searchId);
        const orderByOffer = await Order.findOne({ offer: searchId });

        console.log("SEARCH RESULTS FOR:", searchId);
        console.log("Found in Offer:", !!offer);
        if (offer) {
            console.log("Offer Status:", offer.status);
            console.log("Offer.order field:", offer.order);
        }
        
        console.log("Found in Order (as ID):", !!orderById);
        console.log("Found in Order (referencing Offer):", !!orderByOffer);
        if (orderByOffer) {
            console.log("Referencing Order ID:", orderByOffer._id);
            console.log("Referencing Order Status:", orderByOffer.status);
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkId();
