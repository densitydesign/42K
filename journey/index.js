const json2csv = require('json2csv');
const util = require('util')
const d3 = require('d3');
const fs = require('fs');


let name = "170725_studenti-inizio-2011";
// let name = "171115_studenti-inizio-2012";

fs.readFile("csv/"+name+".csv", "utf8", function(error, data) {
	
	data = d3.csvParse(data);

	let links;
	let nodes;
	let nodesDict;

	// Liceo > Scuola Triennale > Carriera Triennale > Scuola Magistrale > Carriera Magistrale
	const dimensionsOverview = ["Liceo", "Scuola Triennale", "Carriera Triennale", "Scuola Magistrale", "Carriera Magistrale"];
	const dimensionsCds = ["Liceo", "CDS Triennale", "Carriera Triennale", "CDS Magistrale", "Carriera Magistrale"];


	createStructure(dimensionsOverview, "");
	createStructure(dimensionsCds, "_cds");

	function createStructure(dimensions, suffix) {
		
		links = [];
		nodes = [];
		nodesDict = {};


		dimensions.forEach((d,i)=>{

			if(i > 0) {
				let dimensionA = dimensions[i-1];
				let dimensionB = dimensions[i];

				let n = d3.nest()
				.key(d=>d[dimensionA]).sortKeys(d3.ascending)
				.key(d=>d[dimensionB])
				.entries(data);
				
				n.forEach(d=>addNode(dimensionA, dimensionB, d));

			}
		});


		fs.writeFile("app/data/"+name.slice(-4) + suffix + ".json", JSON.stringify({nodes, links}), function(err){
			if(err) {
				return console.log(err);
			}
			console.log(name.slice(-4) + suffix +".json saved!");
		}); 

		fs.writeFile("app/data/"+name.slice(-4) + ".csv", json2csv({ data: data}), function(err){
			console.log(name.slice(-4) + suffix +".csv saved!");
		})

	}





	function addToDictionary(a,d) {
		
		// don't add nodes with incorrect values
		if(d.key === "" || d.key == "undefined" ||  d.key === "0" || d.key === "no" || d.key === "D" || d.key == "#N/A" ) return null;
		
		// set the key as a combination of the two dimensions as there are common names between them
		let newKey = a + d.key;

		if(nodesDict[newKey] == undefined) {
			
			// add school to nodes so we can filter them in the CdS viz
			let nodeId = nodes.length;
			nodes.push({
				id: nodeId,
				name: d.key.toLowerCase(),
				type: a,
				school: a == "Liceo" ? "Liceo" : d.values[0]['Scuola Triennale'] 
			});
			nodesDict[newKey] = nodeId;
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
				value: dd.values.length
			});
		});

	}

});

