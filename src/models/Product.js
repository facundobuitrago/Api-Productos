import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// Esquema del producto
const productSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  precio: Number,
  stock: Number
});

// Paginación opcional
productSchema.plugin(mongoosePaginate);

const Product = mongoose.model("Product", productSchema);

export default Product;
