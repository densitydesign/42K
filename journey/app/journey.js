/* jslint esversion:6, unused:true */


let width = document.body.clientWidth;
let height = document.body.clientHeight;

var svg = d3.select("body")
.append("svg")
.attr("width",width)
.attr("height",height);

let sankey = d3.sankey()
.nodeWidth(4)
.nodeId(d=>d.id)
.nodePadding(10)
.nodeAlign(d3.sankeyLeft)
.extent([[150, height*.15], [width-150, height-100]]);

let years = ["2011","2012","2013","2014","2015","2016"];
let yearsDict = {};
let yearsCdsDict = {};
let loadedCount =0;
let currentYear;

loadJson();

function loadJson() {
	d3.json("data/"+years[loadedCount] +".json", (data)=>{
		yearsDict[years[loadedCount]] = data;

		d3.json("data/"+years[loadedCount] +"_cds.json", (dataCds)=>{
			yearsCdsDict[years[loadedCount]] = dataCds;
			loadedCount++;
			(loadedCount < years.length) ? loadJson() : init();
		});

	})

}



function init() {
	d3.select("#selectyears")
	.on("change", function() {
		let sel = d3.select(this).node()
		currentYear = sel.options[sel.selectedIndex].value;
		update(yearsDict[currentYear]);
	})
	.selectAll("option")
	.data(years)
	.enter()
	.append("option")
	.attr("value", d=>d)
	.text(d=>d);

	currentYear = years[0];
	update(yearsDict[currentYear]);
}

function update(originalData) {

	// quickly clone object
	let data = JSON.parse(JSON.stringify(originalData));
	svg.selectAll("*").remove()
	sankey(data);	

	var link = svg.append("g")
	.attr("class", "links")
	.attr("fill", "none")
	.attr("stroke", "#000")
	.attr("stroke-opacity", 0.2)
	.selectAll("path")
	.data(data.links)
	.enter()
	.append("path")
	.attr("class", "link")
	.attr("d", d3.sankeyLinkHorizontal())
	.attr("stroke-width", function(d) { return Math.max(1, d.width); })
	.on("mouseover", d=>{
		let selectedSchool = d.source.school || d.target.school;
	})
	.on("mousedown", d=>{
		
		let selectedSchool = d.source.school || d.target.school;
		
		let data = JSON.parse(JSON.stringify(yearsCdsDict[currentYear]));
		let nodes = data.nodes.filter(d=>d.school === selectedSchool || d.school == "Liceo" || d.name == "l");
		let links = data.links.filter(d=>{
			let a = findNodeById(d.source, nodes);
			let b = findNodeById(d.target, nodes);
			return a && b;
		});
		// remove nodes without links
		nodes = nodes.filter(d=>{
			return links.find(dd=>dd.source == d.id || dd.target == d.id);
		});
		update({nodes, links});
	});

	let node = svg.append("g")
	.attr("class", "nodes")
	.attr("font-family", "sans-serif")
	.attr("font-size", 10)
	.selectAll("g")
	.data(data.nodes)
	.enter()
	.append("g")
	.attr("transform", d=>"translate("+d.x0 + " "+d.y0+")")

	node
	.append("rect")
	.attr("fill", "white")
	.attr("height", function(d) { return d.y1 - d.y0; })
	.attr("width", function(d) { return d.x1 - d.x0; })

	node
	.append("text")
	.attr("class", "nodeLabel")
	.attr("x", 10)
	.attr("y", 10)
	.text(d=>d.name)

}

function findNodeById(nodeId, array) {
	let o = array.find(d=> d.id == nodeId);
	return o;
}
