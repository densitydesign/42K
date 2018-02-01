/* jslint esversion:6, unused:true */

const color = d3.scaleOrdinal(["#2686FC", "#B226E4", "#F28739", "#F01F74"]).domain(["des","arc - urb - cost","ing ind - inf","ing - civ"]);

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
.extent([[50, height*.15], [width-150, height-100]]);

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

function showPath(selectedSchool) {
	let data = JSON.parse(JSON.stringify(yearsCdsDict[currentYear]));
	let nodes = data.nodes.filter(d=>d.school === selectedSchool || d.type == "liceo");
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
}

function update(originalData) {

	// quickly clone object
	let data = JSON.parse(JSON.stringify(originalData));
	console.log('puzzi')
	svg.selectAll("*").transition().duration(300).style('opacity',1e-6).remove()
	sankey(data);	

	var link = svg.append("g")
	.attr("class", "links")
	.selectAll("path")
	.data(data.links);
	
	link = link.enter()
	.append("path")
	.attr("class", "link")
	.merge(link)
	.on("mouseover", d=>{
		console.log(d.source,d.target)
	})
	.on("mousedown", d=>{
		let selectedSchool = d.source.school || d.target.school;
		showPath(selectedSchool);
	})
	
	link.transition()
	.duration(500)
	.delay(200)
	.ease(d3.easePolyInOut)
	.attr("d", d3.sankeyLinkHorizontal())
	.attr("stroke", d=>{
		return d.source.school ? color(d.source.school) : "white"
	})
	.attr("stroke-width", function(d) { return Math.max(1, d.width); });

	let node = svg.append("g")
	.attr("class", "nodes")
	.attr("font-family", "sans-serif")
	.attr("font-size", 10)
	.selectAll("g")
	.data(data.nodes)
	.enter()
	.append("g")
	// .merge(node)
	.attr("transform", d=>"translate("+d.x0 + " "+d.y0+")")

	let nodeRect = node
	.append("rect")
	.attr("fill", d=>{
		if(d.name=== "attiva triennale" || d.name=== "disattivata triennale"  || d.name=== "attiva magistrale" || d.name=== "disattivata magistrale" || d.name === "s") return "#ddd"
		return d.school ? color(d.school) : "white"
	})
	.transition()
	.duration(300)
	.ease(d3.easePolyInOut)
	.attr("height", function(d) { return d.y1 - d.y0; })
	.attr("width", function(d) { return d.x1 - d.x0; })

	let nodeText = node
	.append("text")
	.attr("class", "nodeLabel")
	.attr("x", 10)
	.attr("y", 10)
	.style('opacity', 1e-6)
	.text(d=>d.name)
	.transition()
	.duration(500)
	.delay(600)
	.style('opacity', 1)

}

function findNodeById(nodeId, array) {
	let o = array.find(d=> d.id == nodeId);
	return o;
}
