// src/models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userName: { type: String, default: "Invitado" },
  items: [
    {
      productId: String,
      nombre: String,
      precio: Number,
      quantity: Number,
    },
  ],
  total: Number,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema);
