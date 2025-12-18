require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path"); 
const { resourceLimits } = require("worker_threads");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

const app = express();

//middleware for CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

//Database Connection
connectDB();

//Middleware for JSON
app.use(express.json());

//Routes
app.use("/api/auth", require("./routes/authRoutes"));
// app.use("//api/tasks", require("./routes/taskRoutes"));
// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/reports", require("./routes/reportRoutes"));

//Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


