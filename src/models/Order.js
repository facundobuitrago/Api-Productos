import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    items: [
        {
            productId: String,
            nombre: String,
            precio: Number,
            quantity: Number
        }
    ],
    total: Number,
    date: { type: Date, default: Date.now }
});

export default mongoose.model("Order", orderSchema);
