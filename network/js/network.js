/* jslint esversion:6, unused:true */

const NODES_INCREMENT = 10;
const SPAWN_DELAY = 10;

// -- GUI
let gui;
window.settings = new function() {
	this.distance = 2;
	this.charge = -3;
	this.radius = 3;
}();

window.onload = function() {
	gui = new dat.GUI();
	gui.add(window.settings, 'distance', 1, 100).listen().onChange(d=>{
		simulation.force("link").distance(d);
		simulation.alpha(1);
	});
	gui.add(window.settings, 'charge', -10, 10).listen().onChange(d=>{
		simulation.force("charge").strength(d);
		simulation.alpha(1);
	});

	gui.add(window.settings, 'radius', 0, 20).listen().onChange(d=>{
		simulation.force("collide").radius(d);
		simulation.alpha(1);
	});
	gui.close();
};

window.onresize = function(){
	width = document.body.clientWidth;
	height = document.body.clientHeight;
	svg.attr("width",width).attr("height", height);
};

// -- STATE
window.state = {
	isGraphView: true
};


// -- VIZ

let graph;
let zoom = d3.zoom()
.scaleExtent([.1, 10])
.on("zoom", zoomed);

let fundExtent;
let yearExtent;
let fundScale;
let yearScale;
let link;
let node;

let width = document.body.clientWidth;
let height = document.body.clientHeight;
let svg = d3.select(document.body)
.append("svg")
.attr("width",width)
.attr("height", height)

let gsvg = svg.append("g")

gsvg
.append("rect")
.attr("fill","rgba(0,0,0,0)")
.attr("width",width)
.attr("height", height)
.call(zoom);

let container = gsvg
.append("g")
// .style("visibility", "hidden");


let simulation = d3
.forceSimulation()
.force("link", d3.forceLink().id(function(d) { return d.id; }).distance(window.settings.distance))
.force("collide", d3.forceCollide().radius(d=>{
	return d.radius*.6 || window.settings.radius
}))
.force("charge", d3.forceManyBody().strength(window.settings.charge))
.force("center", d3.forceCenter(width / 2, height / 2))
.alphaDecay(0.005)

d3.json("data/171110_progetti-didattica.json", function(error, g) {
	if (error) throw error;

	graph = g;

	let projects = {};
	graph.nodes.forEach(d=>{
		// hacky way of getting the years and funding – we could get a better date out of giphy
		d.finanziamento = +d.attributes.finanziamento;
		d.type = d.finanziamento != 1.0 ? "project" : "uni";
		if(d.type == "project") {
			d.participants = 0;
			projects[d.id] = d;
		}
		let date = d.attributes.Interval;
		d.startDate = +date.substring(2,6);
		d.endDate = +date.substring(date.length-8,date.length-4);
		d.x = width*.5;
		d.y = height*.5;
	});
	
	graph.edges.forEach(d=>{
		if(projects[d.source]) projects[d.source].participants++;
	});


	fundExtent = d3.extent(graph.nodes, d=>+d.attributes.finanziamento)
	yearExtent = d3.extent(graph.nodes, d=>d.startDate);
	participantsExtent = d3.extent(graph.nodes, d=>d.participants || 0);
	fundScale = d3.scaleLinear().domain(fundExtent).range([10, 120]);
	yearScale = d3.scaleLinear().domain(yearExtent).nice().range([width*.1, width*.95]);
	// yearScale = d3.scaleLinear().domain(yearExtent).nice().range([width*.1, width*2]);

	participantsScale = d3.scaleLinear().domain(participantsExtent).range([height*.25, height*.8]);


	// cache radius
	graph.nodes.forEach(d=>{
		if(d.type == "project") d.radius = fundScale(d.finanziamento);
	});



	d3.select("#changeviewbtn").on("click", d=>{
		state.isGraphView = !state.isGraphView;
		update();
	});

	

	container
	.append("g")
	.selectAll("line")
	.data(graph.edges)
	.enter()
	.append("line")
	.attr("class", "link")
	.style("stroke-width", "0.5")
	.style("stroke", "rgba(255,255,255,.3)")
	
	container.append("g")
	.attr("class", "nodes")
	.selectAll(".node")
	.data(graph.nodes)
	.enter()
	.append("g")
	.attr("class", "node")
	.each(function(d){
		let el = d3.select(this);
		if(d.type == "uni") {
			el.append("circle").attr("r", 1).style("fill", "#FFFFFF");
		}else {
			el.append("rect").attr("width", 5).attr("height", 5).style("fill", "#F4CF78").attr("transform", "rotate(45) translate(-1 -1)"); 
			// el.append("image")
			// .attr("xlink:href", "glow.png")
			// .attr("width", d=>d.radius)
			el.append("circle")
			.style("fill", "rgba(244,207,120,0.23)")
			.attr("r", d=>d.radius*0.5)
			// .style("transform", d=>{
			// 	let w = -fundScale(d.finanziamento)*.5;
			// 	return "translate("+ w +"px, "+ w+"px)"
			// });
			// .style("transform", d=>{
			// 	let w = -fundScale(d.finanziamento)*0.7;
			// 	return "translate("+ w +"px, "+ w+"px)"
			// });
		}
	})
	.style("pointer-events", "none")
	.style("opacity", 0)
	

	let axisG = container
	.selectAll(".axis")
	.data(d3.range(yearExtent[0],yearExtent[1]+1))
	.enter()
	.append("g")
	.style("pointer-events", "none")
	.attr("class", "axis")
	.style("opacity", 0);

	axisG.append("line")
	.attr("x1", d=>yearScale(d))
	.attr("x2", d=>yearScale(d))
	.attr("y1", participantsScale.range()[0])
	.attr("y2", participantsScale.range()[1])
	.attr("stroke", "rgba(255,255,255,.2)");

	axisG.append("text")
	.attr("class", "labelAxis")
	.text(d=>d)
	.attr("x", d=>yearScale(d))
	.attr("y", participantsScale.range()[1]*1.02)

	// container
	// .selectAll(".projectName")
	// .data(graph.nodes.filter(d=>d.type=="project"))
	// .enter()
	// .append("text")
	// .style("pointer-events", "none")
	// .attr("class", "projectName")
	// .text(d=>d.label)
	// .attr("x", d=>yearScale(d.startDate) + 10)
	// .attr("y", d=>participantsScale(d.participants))
	// .style("opacity", 0);





	function checkAndAddNode(nodeId) {
		let n = graph.nodes.find(d=>d.id == nodeId);
		if(window.currentNodes.indexOf(n) === -1) window.currentNodes.push(n);
		d3.selectAll(".node").filter(d=>d.id==n.id).style("opacity",1)

	}

	function addLink() {

		let endReached = false;

		for (var i = 0; i < NODES_INCREMENT; i++) {

			let edge = graph.edges.pop();
			window.currentLinks.push(edge);

			checkAndAddNode(edge.source);
			checkAndAddNode(edge.target);
			simulation
			.nodes(window.currentNodes);
			simulation.force("link")
			.links(window.currentLinks);

			if(!graph.edges.length) {
				endReached = true;
				break;
			}
		}
		simulation.alpha(.3);

		if(!endReached) {
			setTimeout(addLink.bind(this), SPAWN_DELAY);
		} else {
			container.style("visibility", "visible");
			d3.select("#ui").style("visibility", "visible");
		}


	}

	window.currentNodes = [];
	window.currentLinks = [];
	addLink();


	window.requestAnimationFrame(ticked)

});

function update() {

	
	
	// var label = container.append("g")
	// .attr("class", "labels")
	// .selectAll("text")
	// .data(graph.nodes)
	// .enter().append("text")
	// .attr("class", "label")
	// .text((d)=>d.name);

	if(!state.isGraphView) {

		simulation.stop();

		container.attr("transform", "translate(0 ,0) scale(1)");

		d3.selectAll(".node")
		.each(function(d){
			let el = d3.select(this);

			if(d.type == "project") {
				let x = yearScale(d.startDate)
				let y = participantsScale(d.participants);
				el.transition().attr("transform","translate(" +x +" " + y +")");
			} else {
				el.style("opacity", 0);
			}
		})
		.style("pointer-events", "auto")


		d3.selectAll(".link")
		.transition()
		.style("opacity", 0);
		setTimeout(function(){
			d3.selectAll(".axis")
			.transition()
			.style("opacity", 1);

			d3.selectAll(".projectName")
			.transition()
			.style("opacity", 1);

			
		}, 700);

	} else {

		d3.selectAll(".node")
		.style("pointer-events", "none")
		.transition()
		.attr("transform", d=>"translate(" +d.x +" " + d.y +")")
		
		d3.selectAll(".axis")
		.transition()
		.style("opacity", 0);
		d3.selectAll(".projectName")
		.transition()
		.style("opacity", 0);
		setTimeout(function(){

			d3.selectAll(".node")
			.transition()
			.style("opacity", 1)

			d3.selectAll(".link")
			.transition()
			.style("opacity", 1)

		}, 500);
	}
	
}

function ticked() {

	if(state.isGraphView && simulation.alpha()>.01) {

		simulation.tick();
		d3.selectAll(".link")
		.attr("x1", d=>d.source.x)
		.attr("y1", d=>d.source.y)
		.attr("x2", d=>d.target.x)
		.attr("y2", d=>d.target.y);

		d3.selectAll(".node")
		.attr("transform", d=>"translate(" +d.x +" " + d.y +")");

	} 

	window.requestAnimationFrame(ticked)

}

function zoomed() {
	if(!state.isGraphView) {
		return;
		// container.attr("transform", "translate(" + d3.event.transform.x + "0) scale(1)");
	} else {
		container.attr("transform", "translate(" + d3.event.transform.x +" "+ d3.event.transform.y + ")scale(" + d3.event.transform.k + ")");
	}
}

function dragstarted(d) {
	d3.event.sourceEvent.stopPropagation();
	d3.select(this).classed("dragging", true);
}

function dragged(d) {
	d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}

function dragended(d) {
	d3.select(this).classed("dragging", false);
}


