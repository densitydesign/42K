/* jslint esversion:6, unused:true */


let width = document.body.clientWidth;
let height = document.body.clientHeight;

var svg = d3.select("body")
.append("svg")
.attr("width",width)
.attr("height",height);

let sankey = d3.sankey()
.nodeWidth(4)
.nodePadding(10)
.nodeAlign(d3.sankeyLeft)
.extent([[150, height*.15], [width-150, height-100]]);


let years = ["170725_studenti-inizio-2011","171115_studenti-inizio-2012", "171115_studenti-inizio-2013"];
let yearsDict = {};
let loadedCount =0;

loadJson();

function loadJson() {
	d3.json("data/"+years[loadedCount] +".json", (data)=>{
		yearsDict[years[loadedCount]] = data;
		loadedCount++;
		(loadedCount < years.length) ? loadJson() : init();
	})
}



function init() {
	d3.select("#selectyears")
	.on("change", function() {
		let sel = d3.select(this).node()
		update(yearsDict[sel.options[sel.selectedIndex].value]);
	})
	.selectAll("option")
	.data(years)
	.enter()
	.append("option")
	.attr("value", d=>d)
	.text(d=>d);

	update(yearsDict[years[0]])
}

function update(data) {
	console.log(data)

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
		console.log("source",d.source)
		console.log("target",d.target)
		// console.table(d.source.source.name,d.source.source.type, d.target.target.name,d.target.target.type)
	})

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
