import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "./Middleware/verifyToken.js";

// Import routers
import authRoutes from "./Routers/Users/auth.js";
import userRoutes from "./Routers/Users/users.js";
import userLogs from "./Routers/Users/logs.js";
import items from "./Routers/Items/items.js";
import itemsCategories from "./Routers/Items/itemsCategories.js";
import sales from "./Routers/Transactions/sales.js";
import receipt from "./Routers/Transactions/receipt.js";
import suppliers from "./Routers/Manunuzi/supplier.js";

// Configurations
dotenv.config();
const app = express();

// CORS Configuration (Fixed Trailing Slash Issue)
const corsParameters = {
    origin: "http://localhost:7007",
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsParameters));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use("/images", express.static("images"));
app.use(express.urlencoded({ extended: true }));

// Error Handler Middleware
app.use(errorHandler);

// Routers
app.use("/api/auth", authRoutes); 
app.use("/api/users", userRoutes);
app.use("/api/items", items);
app.use("/api/itemsCategories", itemsCategories);
app.use("/api/logs", userLogs);
app.use("/api/transactions", sales)
app.use("/api/receipt", receipt);
app.use("/api/suppliers", suppliers)



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Database Connected Successfully"))
    .catch((err) => console.log("Database Connection Error:", err));

// Server Listening
const PORT = process.env.PORT || 4004;
app.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
});
