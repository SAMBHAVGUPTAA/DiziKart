const express = require("express");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config({ path: ".env.prod" });
const connectDB = require("./config/db");
const routes = require("./routes/app.routes");
const paymentController = require("./controllers/payment.controller");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
const path = require('path');

process.env.PORT
	? console.log("")
	: require("dotenv").config();

var app = express();
app.use(compression());

const _dirname = path.resolve();

app.use(
	cors({
		origin: [
			"http://localhost:4200",
		],
		credentials: true,
	})
);

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

const apiLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 1 minutes)
	standardHeaders: "draft-7", // Set `RateLimit` and `RateLimit-Policy` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(
    session({
        secret: process.env.session_secret || 'default_secret', // Provide a default secret
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true },
    })
);
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
	app.post(
		"/webhook",
		express.raw({ type: "application/json" }),
		paymentController.webhook
	);
	app.use(express.json());
	app.use("/api", routes);
	app.use("/api", apiLimiter);

    app.use(express.static(path.join(_dirname, "/frontend/dist")));
	app.get('*',(_,res)=>{
		res.sendFile(path.resolve(_dirname, "frontend", "dist", "index.html"));
	})

	app.get("/", (req, res) => {
		res.send("Welcome to E-Commerce Backend");
	});
	app.listen(PORT, () => {
		console.log(`🚀Server is running on port ${PORT}`);
	});
});
