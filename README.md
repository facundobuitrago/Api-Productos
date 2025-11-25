📦 API de Productos
Proyecto Full Stack con Node.js, Express, MongoDB y WebSockets

Desarrollado por Facundo Buitrago para su portfolio profesional.

🚀 Tecnologías utilizadas
Backend

🟩 Node.js

⚡ Express

🍃 MongoDB + Mongoose

🔌 Socket.IO (tiempo real)

🧵 express-session

🔧 Handlebars (templating engine)

Frontend

🎨 HTML / CSS

🛠 JavaScript Vanilla

🔄 Socket.IO Client

📁 Estructura del proyecto
ProyectoFinal-Backend/
├── src/
│   ├── models/
│   ├── routes/
│   ├── views/
│   │   ├── home.hbs
│   │   ├── cart.hbs
│   │   ├── realTimeProducts.hbs
│   │   ├── orders.hbs
│   │   └── layouts/main.hbs
├── public/
├── config/
│   └── db.js
├── server.js
├── package.json
└── README.md

🧩 Funcionalidades principales
🛒 Carrito de compras con sesión

Agregar productos

Items repetidos se agrupan automáticamente

Aumenta o disminuye cantidad

Stock real descontado desde Mongo

Devolver stock si se elimina del carrito

🔄 Actualización en tiempo real (WebSockets)

Eliminación de productos sincronizada en todos los clientes

Actualización instantánea del stock

Broadcast global automático

🧾 Historial de órdenes

Cada compra queda registrada en Mongo:

{
  "userName": "Facu",
  "items": [
    { "productId": "...", "name": "...", "price": 50000, "quantity": 1 }
  ],
  "total": 50000,
  "date": "2025-11-25"
}

💾 Modelos de datos (Mongoose)
🟩 Product
{
  nombre: String,
  descripcion: String,
  precio: Number,
  stock: Number
}

🟦 Order
{
  userName: String,
  items: Array,
  total: Number,
  date: Date
}

🛠 Instalación y ejecución local
1️⃣ Clonar el repositorio
git clone https://github.com/facundobuitrago/Api-Productos.git
cd Api-Productos

2️⃣ Instalar dependencias
npm install

3️⃣ Crear archivo .env
MONGO_URI=tu_conexion_mongo
PORT=3000

4️⃣ Ejecutar el proyecto
npm start


Abrir en:
👉 http://localhost:3000

🌐 Deploy

El backend está deployado en Render, con WebSockets completamente funcionales.
Las variables de entorno se manejan desde el panel de Render.

📸 Capturas del proyecto

(Podés agregar screenshots cuando quieras)

👨‍💻 Autor

Facundo Buitrago
💻 Desarrollador Web
📧 facundobuitrago@gmail.com

🔗 LinkedIn: https://www.linkedin.com/in/facundo-buitrago

⭐ Objetivo del proyecto

Este proyecto fue creado para demostrar capacidades en:

Node.js + Express

CRUD profesional

Mongoose y MongoDB

WebSockets

Sesiones y manejo de carrito

Estructura MVC

Handlebars templates

Deploy completo

