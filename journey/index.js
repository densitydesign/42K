var d3 = require('d3');
var fs = require('fs');
let name = "171115_studenti-inizio-2012";

fs.readFile("csv/"+name+".csv", "utf8", function(error, data) {
	
	// Liceo > Scuola Triennale > Carriera Triennale > Scuola Magistrale > Carriera Magistrale
	// 2nd dimension  = Cds
	const dimensions = ["Liceo", "Scuola Triennale", "Carriera Triennale", "Scuola Magistrale", "Carriera Magistrale"];

	let links = [];
	let nodes = [];
	let nodesDict = {};

	data = d3.csvParse(data);
	data = d3.shuffle(data);
	// create nodes for sankey
	dimensions.forEach((d,i)=>{

		if(i > 0) {
			let dimensionA = dimensions[i-1];
			let dimensionB = dimensions[i];

			let n = d3.nest()
			.key(d=>d[dimensionA]).sortKeys(d3.ascending)
			.key(d=>d[dimensionB])
			.rollup(d=>d.length)
			.entries(data)

			n.forEach(d=>addNode(dimensionA, dimensionB, d));

		}
	});


	fs.writeFile("app/data/"+name.slice(-4)+".json", JSON.stringify({nodes, links}), function(err){
		if(err) {
			return console.log(err);
		}

		console.log(name.slice(-4)+".json saved!");
	}); 


	function addToDictionary(a,d) {
		if(d.key === "" || d.key == "undefined" ||  d.key === "0" || d.key === "no" || d.key === "D" || d.key == "#N/A" ) return null;
		let newKey = a + d.key;
		if(nodesDict[newKey] == undefined) {
			nodes.push({
				name: d.key.toLowerCase(),
				type: a
			});
			nodesDict[newKey] = nodes.length-1;
		}
		return 1;
	}

	function addNode(a, b, d) {

		// if invalid node don't add children nodes
		if(addToDictionary(a, d) == null) return;

		// add children 
		d.values.forEach(dd=>{
			if(addToDictionary(b, dd) == null) return;
			links.push({
				source: nodesDict[a+d.key],
				target: nodesDict[b+dd.key],
				value: dd.value
			});
		});

	}

});

