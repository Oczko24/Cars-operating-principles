const expr = "maxZ + 0.05";
const datum = { maxZ: 1.0 };
const evalFunc = new Function(...Object.keys(datum), "return " + expr);
console.log(evalFunc(...Object.values(datum)));
