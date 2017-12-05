/* jslint esversion:6, unused:true */


function getNestedData(dimensions, data) {

	let nestedData = {};

	if(dimensions.length == 1) {

		nestedData = d3.nest()
		.key(d=>d[dimensions[0]])
		.rollup(d=>d.length)
		.entries(data);

	} else if(dimensions.length == 2) {

		let ic = dimensions.indexOf("Cittadinanza");
		if(ic != -1 && ic != 1) {
			let o = dimensions[1];
			dimensions[1] = "Cittadinanza";
			dimensions[0] = o;
			data = aggregateNationality(data, 200);
		}

		nestedData = d3.nest()
		.key(d=>d[dimensions[0]])
		.key(d=>d[dimensions[1]])
		.rollup(d=>d.length)
		.entries(data);

		if(ic != -1) {
			
			nestedData.forEach(d=>{
				d.values.forEach(dd=>{
					if(dd.value < 40) {
						dd.key = "ALTRO"
					}
				})
			})


			nestedData.forEach(d=>{
				d.newValues = [];
				let otherCounter = 0;
				d.values.forEach(dd=>{
					if(dd.key === "ALTRO") {
						otherCounter += dd.value;
					} else {
						d.newValues.push(dd)
					}
				});
				d.newValues.push({
					key: "ALTRO",
					value: otherCounter
				})
				d.values = d.newValues;
				delete d.newValues;
			})
		}


	} else if(dimensions.length == 3) {

		

		let ic = dimensions.indexOf("Cittadinanza");
		if(ic != -1) {
			if(ic != 0) {	
				let o = dimensions[0];
				dimensions[0] = "Cittadinanza";
				dimensions[1] = o;
			}
			data = aggregateNationality(data, 100);
		}
		
		nestedData = d3.nest()
		.key(d=>d[dimensions[0]])
		.key(d=>d[dimensions[1]])
		.key(d=>d[dimensions[2]])
		.rollup(d=>d.length)
		.entries(data);

	} else {
		throw new Error("wrong number of dimensions");
	}

	return nestedData;

}

function aggregateNationality(myData, threshold) {
	let nd = d3.nest()
	.key(d=>d["Cittadinanza"])
	.rollup(d=>d.length)
	.entries(myData);

	console.log(nd)

	return myData.map(d=>{
		let y =false;
		nd.forEach(n=>{
			if(d.Cittadinanza == n.key && n.value < threshold) {
				y = true;
			}	
		});
		let k = Object.assign(d, {});
		if(y) {
			k.Cittadinanza = "Altro";
		}
		return k;
	});
}

