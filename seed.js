module.exports = (db) => {
	db.ensure("red", {
		order: 1,	
		name: "Red",
		hex: "#ff0000",
		clicks: 71371,
	});
	db.ensure("orange", {
		order: 2,
		name: "Orange",
		hex: "#FF6A00",
		clicks: 16506,
	});
	db.ensure("yellow", {
		order: 3,	
		name: "Yellow",
		hex: "#ffff00",
		clicks: 3456,
	});
	db.ensure("green", {
		order: 4,	
		name: "Green",
		hex: "#00ff00",
		clicks: 31115,
	});
	db.ensure("blue", {
		order: 5,
		name: "Blue",
		hex: "#0026FF",
		clicks: 119289,
	});
	db.ensure("cyan", {
		order: 6,
		name: "Cyan",
		hex: "#00FFFF",
		clicks: 10434,
	});
	db.ensure("purple", {
		order: 7,
		name: "Purple",
		hex: "#B200FF",
		clicks: 5120,
	});
	db.ensure("pink", {
		order: 8,
		name: "Pink",
		hex: "#ff00ff",
		clicks: 10605,
	});
	db.ensure("black", {
		order: 9,
		name: "Black",
		hex: "#000000",
		clicks: 700064,
	});
	db.ensure("white", {
		order: 10,
		name: "White",
		hex: "#ffffff",
		clicks: 24979,
	});
}