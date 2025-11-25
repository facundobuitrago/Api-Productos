import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Conexión a la base de datos
const conectarDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://facundobuitrago:facundo123@cluster0.zenfdcl.mongodb.net/?appName=Cluster0");
    } catch (error) {
        console.error("Error al conectar con MongoDB:", error);
        process.exit(1);
    }
};

const productSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    precio: Number,
    stock: Number,
});

productSchema.plugin(mongoosePaginate);

const Product = mongoose.model('Product', productSchema);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const obtenerProductosDesdeArchivo = () => {
    const filePath = path.join(__dirname, '..', 'data', 'products.json');
    const productos = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return productos;
};

const agregarProductos = async () => {
    try {
        await conectarDB();
        const productos = obtenerProductosDesdeArchivo();
        await Product.insertMany(productos);
        console.log('Productos agregados a la base de datos');
    } catch (error) {
        console.error('Error al agregar productos:', error);
    }
};

agregarProductos();

export default Product;