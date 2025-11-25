import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import handlebars from "express-handlebars";
import session from "express-session";
import productsRoutes from "./src/routes/products.js";
import cartsRoutes from "./src/routes/carts.js";
import conectarDB from "./config/db.js";
import Product from './src/models/Product.js';
import Cart from "./src/models/Cart.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

conectarDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(
  session({
    secret: "helado",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/products", productsRoutes);
app.use("/api/carts", cartsRoutes);

app.use(async (req, res, next) => {
    if (!req.session.cartId) {
        const newCart = await Cart.create({ products: [] });
        req.session.cartId = newCart._id;
        console.log("🛒 Carrito creado:", req.session.cartId);
    }
    next();
});


app.get("/", async (req, res) => {
  try {
    const productos = await Product.find();
    res.render("home", {
      title: "Lista de Productos",
      products: productos
    });
  } catch (error) {
    console.error("Error al obtener los productos:", error);
    res.status(500).send("Error al cargar los productos");
  }
});

app.get("/real-time-products/", async (req, res) => {
  try {
    const productos = await Product.find().lean();
    res.render("realTimeProducts", { title: "Productos en Tiempo Real", products: productos });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).send("Error al cargar productos");
  }
});

app.post("/add-to-cart", async (req, res) => {
  try {
    const productId = req.body.productId;
    const cartId = req.session.cartId;

    const cart = await Cart.findById(cartId);

    const existing = cart.products.find(p => p.product.equals(productId));

    if (existing) {
      existing.quantity++;
    } else {
      cart.products.push({ product: productId, quantity: 1 });
    }

    await cart.save();

    res.redirect("/cart");
  } catch (error) {
    console.error("Error al agregar al carrito:", error);
    res.status(500).send("Error al agregar al carrito");
  }
});

app.get("/cart", async (req, res) => {
    try {
        const cartId = req.session.cartId;

        const cart = await Cart.findById(cartId).populate("products.product").lean();

        let total = 0;
        const items = cart.products.map(p => {
            total += p.product.precio * p.quantity;
            return {
                nombre: p.product.nombre,
                precio: p.product.precio,
                quantity: p.quantity,
                id: p.product._id
            };
        });

        res.render("cart", { cart: items, total });
    } catch (error) {
        console.error("Error cargando carrito:", error);
        res.status(500).send("Error al cargar carrito");
    }
});

app.engine(
  "hbs",
  handlebars.engine({
    extname: ".hbs",
    defaultLayout: "main.hbs",
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    }
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "src", "views"));

io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado");

  (async () => {
    const productos = await Product.find().lean();
    socket.emit("productos-actuales", productos);
  })();

  app.post("/remove-item", async (req, res) => {
    try {
        const { productId } = req.body;
        const cart = await Cart.findById(req.session.cartId);

        cart.products = cart.products.filter(p => !p.product.equals(productId));

        await cart.save();
        res.redirect("/cart");
    } catch (err) {
        console.error("Error eliminando item:", err);
        res.status(500).send("Error eliminando item");
    }
});


  const createProductElement = (producto) => {
    const li = document.createElement("li");
    li.dataset.productId = producto._id;
    li.className = "product";
    li.innerHTML = `
      <h2>${producto.nombre}</h2>
      <p>${producto.descripcion}</p>
      <p>Precio: $${producto.precio}</p>
      <p>Stock: ${producto.stock}</p>
      <button class="add-to-cart-btn" data-product-id="${producto._id}">Agregar</button>
      <button class="delete-btn" data-product-id="${producto._id}">Eliminar</button>
    `;
    return li;
  };

  socket.on("add-product", async (newProduct) => {
    try {
      const product = new Product(newProduct);
      await product.save();
      const productos = await Product.find().lean();
      io.emit("productos-actuales", productos);
    } catch (error) {
      console.error("Error al agregar producto:", error);
      socket.emit("error", "Error al agregar producto");
    }
  });

 // Manejar el evento de eliminar un producto
 socket.on("delete-product", async (productId) => {
  try {
      console.log("Eliminando producto con ID:", productId); 
      console.log(typeof productId); 

      const result = await Product.deleteOne({ _id: productId });

      console.log("Resultado de la eliminación:", result); 

      if (result.deletedCount === 0) {
          console.log("No se encontró el producto para eliminar:", productId);
          return;
      }

      const productos = await Product.find().lean();
      io.emit("productos-actuales", productos); 
  } catch (error) {
      console.error("Error al eliminar producto:", error); 
      socket.emit("error", "Error al eliminar producto");
  }
});
  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});