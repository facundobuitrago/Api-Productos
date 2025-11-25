import { Router } from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const router = Router();

router.get("/", async (req, res) => {
  try {
    const carts = await Cart.find().populate("products.product").lean();
    res.json(carts);
  } catch (error) {
    console.error("Error obteniendo carritos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/cart/:cid
// GET /api/cart/:cid
router.get("/:cid", async (req, res) => {  // <- Cambia "cartRouter" por "router"
  const { cid } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return res.status(400).json({ message: "Debe proporcionar un ID válido" });
    }

    const cart = await Cart.findById(cid).populate("products.product");

    if (!cart) {
      return res.status(404).json({ message: "El carrito no existe" });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error("Error al obtener el carrito:", error);
    res.status(500).json({ message: error.message });
  }
});



// Crear un nuevo carrito
router.post('/', async (req, res) => {
    try {
        const newCart = new Cart({ products: [] });
        await newCart.save();
        res.status(201).json(newCart);
    } catch (error) {
        console.error('Error creando carrito:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener un carrito por ID
router.get('/:cid', async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.cid).populate('products.product').lean();
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }
        res.json(cart);
    } catch (error) {
        console.error('Error obteniendo carrito:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Agregar un producto a un carrito
router.post('/:cid/product/:pid', async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.cid);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }
        
        // Buscar producto
const productDB = await Product.findById(productId);

if (!productDB) {
    return res.status(404).send("Producto no encontrado");
}

// Reducir stock SI hay stock disponible
if (productDB.stock > 0) {
    productDB.stock -= 1;
    await productDB.save();
} else {
    return res.send("Sin stock disponible");
}

// Pasar a objeto simple para usarlo en sesión
const product = productDB.toObject();
        
    } catch (error) {
        console.error('Error agregando producto al carrito:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar un producto del carrito
router.delete('/:cid/product/:pid', async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.cid);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }
        
        cart.products = cart.products.filter(p => !p.product.equals(req.params.pid));
        await cart.save();
        res.json(cart);
    } catch (error) {
        console.error('Error eliminando producto del carrito:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;
