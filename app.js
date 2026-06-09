import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import session from "express-session";
import expressEjsLayouts from "express-ejs-layouts";

import indexRouter from "./routes/index.js";
import adminRouter from "./routes/admin.js";
import voteRouter from "./routes/vote.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(expressEjsLayouts);
app.set("layout", "./layouts/pageShell");

app.use(
	session({
		secret: "your-secret-key",
		resave: false,
		saveUninitialized: false,
	}),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

app.use("/", indexRouter);
app.use("/admin", adminRouter);
app.use("/vote", voteRouter);

app.use((err, _req, res, _next) => {
	console.error(err.stack);
	res.status(500).send("Something broke!");
});

app.listen(port, () => {
	console.log("Listen on http://localhost:" + port);
});
