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
        
        const product = await Product.findById(req.params.pid);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const existingProduct = cart.products.find(p => p.product.equals(product._id));
        
        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            cart.products.push({ product: product._id, quantity: 1 });
        }
        
        console.log('Carrito actualizado:', cart);
        await cart.save();
        const savedCart = await Cart.findById(cart._id);
console.log("Carrito guardado en MongoDB:", savedCart);

        res.json(cart);
        
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
