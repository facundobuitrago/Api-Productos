import mongoose from "mongoose";

const conectarDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://facundobuitrago:facundo123@cluster0.zenfdcl.mongodb.net/?appName=Cluster0");
    console.log("Conexión exitosa a MongoDB");
  } catch (error) {
    console.error("Error al conectar a MongoDB", error);
    process.exit(1);
  }
};

export default conectarDB;



