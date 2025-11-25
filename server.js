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
import Order from "./src/models/Order.js";


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

        // Buscar producto en Mongo
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Producto no encontrado");

        // Validar stock
        if (product.stock <= 0) {
            return res.send(`
                <script>
                    alert("Sin stock disponible");
                    window.location.href = "/";
                </script>
            `);
        }

        // Descontar stock en Mongo
        product.stock -= 1;
        await product.save();
        io.emit("stock-actualizado", {
    productId: product._id.toString(),
    newStock: product.stock
});


        // Crear carrito si no existe
        if (!req.session.cart) req.session.cart = [];

        // Ver si ya está en carrito
        const item = req.session.cart.find(p => p._id === productId);

        if (item) {
            item.quantity += 1;
        } else {
            req.session.cart.push({
                _id: product._id.toString(),
                nombre: product.nombre,
                precio: product.precio,
                quantity: 1
            });
        }

        res.redirect("/cart");

    } catch (error) {
        console.error("Error al agregar al carrito:", error);
        res.status(500).send("Error interno del servidor");
    }
});


app.get("/cart", (req, res) => {

    const cart = req.session.cart || [];

    // Agrupar productos por _id
    const grouped = {};

    cart.forEach(item => {
        if (!grouped[item._id]) {
            grouped[item._id] = {
                _id: item._id,
                nombre: item.nombre,
                precio: item.precio,
                quantity: item.quantity || 1
            };
        } else {
            grouped[item._id].quantity += (item.quantity || 1);
        }
    });

    const cartGrouped = Object.values(grouped);

    const total = cartGrouped.reduce(
        (acc, item) => acc + item.precio * item.quantity,
        0
    );

    res.render("cart", {
        cart: cartGrouped,
        total
    });
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

app.post("/remove-item", async (req, res) => {
    try {
        const { productId } = req.body;

        if (!req.session.cart) req.session.cart = [];

        // Buscar item en carrito
        const index = req.session.cart.findIndex(p => p._id === productId);

        if (index === -1) return res.redirect("/cart");

        // Actualizar stock en Mongo
        const productoMongo = await Product.findById(productId);

        if (productoMongo) {
            productoMongo.stock += 1;
            await productoMongo.save();
        }
        io.emit("stock-actualizado", {
    productId: productoMongo._id.toString(),
    newStock: productoMongo.stock
});


        // Restar cantidad o eliminar item
        if (req.session.cart[index].quantity > 1) {
            req.session.cart[index].quantity -= 1;
        } else {
            req.session.cart.splice(index, 1);
        }

        res.redirect("/cart");

    } catch (error) {
        console.error("Error al eliminar item:", error);
        res.redirect("/cart");
    }
});

app.post("/checkout", async (req, res) => {
    try {
        if (!req.session.cart || req.session.cart.length === 0) {
            return res.redirect("/cart");
        }

        const items = req.session.cart.map(p => ({
            productId: p._id,
            nombre: p.nombre,
            precio: p.precio,
            quantity: p.quantity || 1
        }));

        const total = items.reduce(
            (acc, item) => acc + item.precio * item.quantity,
            0
        );

        // Guardar orden en Mongo
        await Order.create({ items, total });

        // Vaciar carrito
        req.session.cart = [];

        // Mostrar mensaje de éxito
        res.send(`
            <script>
                alert("¡Compra finalizada con éxito!");
                window.location.href = "/";
            </script>
        `);

    } catch (error) {
        console.error("Error al finalizar compra:", error);
        res.redirect("/cart");
    }
});




const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});