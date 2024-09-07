const express = require('express');
const app = express()
	.use("/api", require('cors')())
	.use(express.static(require("path").join(__dirname, "public")))
	.set("view engine", "ejs");

const Enmap = require('enmap');
const db = new Enmap({
	name: "db",
	dataDir: "./db"
});
require("./seed")(db);

app.get("/", (_, res) => {
	const colors = db.keyArray().map((key) => ({ id: key, ...db.get(key) })).sort((a, b) => a.order - b.order)
	return res.render("pages/index", {
		colors
	})
});

app.get("/:id", (req, res, next) => {
	const { id } = req.params	
	if(!db.has(id)) return next();

	const color = db.get(id);
	return res.render("pages/single", {
		color: {
			id,	
			...color
		}
	})
});

app.get("/compare", (req, res) => {
	const colors = db.keyArray().map((key) => ({ id: key, ...db.get(key) })).sort((a, b) => a.order - b.order);
	return res.render("pages/compare-select", {
		colors
	})
});

app.get("/compare/:id1/:id2", (req, res, next) => {
	const { id1, id2 } = req.params	
	if(!db.has(id1) || !db.has(id2)) return next();

	const color1 = db.get(id1);
	const color2 = db.get(id2);
	return res.render("pages/compare", {
		color1: {
			id: id1,	
			...color1
		},
		color2: {
			id: id2,	
			...color2
		}
	})
});

app.get("/api/top", (_, res) => {
	const colors = db.keyArray().map((key) => ({ id: key, ...db.get(key) })).sort((a, b) => b.clicks - a.clicks);
	return res.json(colors)
})

app.get("/api/color/:id", (req, res, next) => {
	const { id } = req.params;
	if(!db.has(id)) return next()
	
	const color = db.get(id);

	return res.json({
		id,	
		name: color.name,
		hex: color.hex,
		clicks: color.clicks,	
	})
});

app.post("/api/color/:id", (req, res, next) => {
	const { id } = req.params;
	if(!db.has(id)) return next()
	
	db.math(id, "+", 1, "clicks");

	return res.sendStatus(204)
});

app.delete("/api/color/:id", (req, res, next) => {
	const { id } = req.params;
	if(!db.has(id)) return next()
	
	db.math(id, "-", 1, "clicks");

	return res.sendStatus(204)
});

app.listen(3000, () => console.log("Listening on port 3000."))