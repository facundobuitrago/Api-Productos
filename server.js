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
import Product from "./src/models/Product.js";
import Order from "./src/models/Order.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

conectarDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Session
app.use(
  session({
    secret: "helado",
    resave: false,
    saveUninitialized: true,
  })
);

// Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.userName = req.session.userName || "Invitado";
  next();
});

// Rutas API
app.use("/api/products", productsRoutes);
app.use("/api/carts", cartsRoutes);

// Login
app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

app.post("/login", (req, res) => {
  const { name } = req.body;
  if (name?.trim()) req.session.userName = name.trim();
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Home
app.get("/", async (req, res) => {
  const productos = await Product.find().lean();
  res.render("home", { title: "Lista de Productos", products: productos });
});

// Real Time
app.get("/real-time-products/", async (req, res) => {
  const productos = await Product.find().lean();
  res.render("realTimeProducts", { title: "Productos en Tiempo Real", products: productos });
});

// Agregar al carrito + descontar stock
app.post("/add-to-cart", async (req, res) => {
  try {
    const productId = req.body.productId;
    const product = await Product.findById(productId);

    if (!product) return res.send("Producto no encontrado");
    if (product.stock <= 0)
      return res.send(`<script>alert("Sin stock disponible"); window.location.href="/";</script>`);

    // Descontar stock en Mongo
    product.stock -= 1;
    await product.save();

    io.emit("stock-actualizado", {
      productId: product._id.toString(),
      newStock: product.stock,
    });

    // Carrito en sesión
    if (!req.session.cart) req.session.cart = [];
    const item = req.session.cart.find((p) => p._id === productId);

    if (item) item.quantity += 1;
    else
      req.session.cart.push({
        _id: product._id.toString(),
        nombre: product.nombre,
        precio: product.precio,
        quantity: 1,
      });

    res.redirect("/cart");
  } catch (error) {
    console.error(error);
    res.send("Error al agregar al carrito");
  }
});

// Carrito
app.get("/cart", (req, res) => {
  const cart = req.session.cart || [];

  const grouped = {};

  cart.forEach((item) => {
    if (!grouped[item._id]) {
      grouped[item._id] = {
        _id: item._id,
        nombre: item.nombre,
        precio: item.precio,
        quantity: item.quantity,
      };
    } else {
      grouped[item._id].quantity += item.quantity;
    }
  });

  const cartGrouped = Object.values(grouped);
  const total = cartGrouped.reduce((acc, item) => acc + item.precio * item.quantity, 0);

  res.render("cart", { cart: cartGrouped, total });
});

// Eliminar 1 unidad
app.post("/remove-item", async (req, res) => {
  try {
    const { productId } = req.body;

    if (!req.session.cart) req.session.cart = [];

    const index = req.session.cart.findIndex((p) => p._id === productId);
    if (index === -1) return res.redirect("/cart");

    const productoMongo = await Product.findById(productId);

    if (productoMongo) {
      productoMongo.stock += 1;
      await productoMongo.save();

      io.emit("stock-actualizado", {
        productId: productoMongo._id.toString(),
        newStock: productoMongo.stock,
      });
    }

    if (req.session.cart[index].quantity > 1) {
      req.session.cart[index].quantity -= 1;
    } else {
      req.session.cart.splice(index, 1);
    }

    res.redirect("/cart");
  } catch (error) {
    console.error(error);
    res.redirect("/cart");
  }
});

// Finalizar compra REAL
app.post("/finish-order", async (req, res) => {
  try {
    if (!req.session.cart?.length) return res.redirect("/cart");

    const items = req.session.cart.map((item) => ({
      productId: item._id,
      name: item.nombre,
      price: item.precio,
      quantity: item.quantity,
    }));

    const total = items.reduce((t, p) => t + p.price * p.quantity, 0);

    await Order.create({
      userName: req.session.userName || "Invitado",
      items,
      total,
      date: new Date(),
    });

    req.session.cart = [];

    res.send(`
      <script>
        alert("Compra finalizada con éxito!");
        window.location.href = "/orders";
      </script>
    `);
  } catch (error) {
    console.error("Error finalizando compra:", error);
    res.redirect("/cart");
  }
});

// Historial
app.get("/orders", async (req, res) => {
  const userName = req.session.userName || "Invitado";
  const orders = await Order.find({ userName }).sort({ date: -1 }).lean();
  res.render("orders", { title: "Historial de compras", orders });
});

// Handlebars
app.engine("hbs", handlebars.engine({ extname: ".hbs" }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "src", "views"));

// WebSocket
io.on("connection", async (socket) => {
  console.log("Cliente conectado.");

  // Enviar productos al conectarse
  const productos = await Product.find().lean();
  socket.emit("productos-actuales", productos);

  // Agregar producto
  socket.on("add-product", async (newProduct) => {
    try {
      const product = new Product(newProduct);
      await product.save();

      const productosActualizados = await Product.find().lean();
      io.emit("productos-actuales", productosActualizados);
    } catch (error) {
      console.error("Error agregando producto:", error);
    }
  });

  // Eliminar producto
  socket.on("delete-product", async (productId) => {
    try {
      await Product.deleteOne({ _id: productId });
      const productosActualizados = await Product.find().lean();
      io.emit("productos-actuales", productosActualizados);
    } catch (error) {
      console.error("Error eliminando producto:", error);
    }
  });
});


const port = 3000;
server.listen(port, () => console.log(`Servidor en http://localhost:${port}`));
