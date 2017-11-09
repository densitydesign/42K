/* jslint esversion:6, unused:true */
window.settings = new function() {
	this.wander = 3.1;
}();
let gui;

window.onload = function() {
	gui = new dat.GUI();
	gui.add(window.settings, 'wander', 0, 10).listen();
	gui.close();
};

window.state = {
	result: {},
	data: {},
	clusters: null,
	type: null,
	dimensionA: null,
	dimensionB: null,
	dimensionC: null
};


// -- VIZ
let width = document.body.clientWidth;
let height = document.body.clientHeight;
let pack = d3.pack();


// -- PIXI
let container = new PIXI.Container();
let stage = new PIXI.Container();
let axisGraphics = new PIXI.Graphics();
stage.addChild(axisGraphics);
stage.addChild(container);

let renderer = new PIXI.WebGLRenderer(width, height, {resolution:2, transparent:true});
document.body.appendChild(renderer.view);

let canvas = d3.select(renderer.view);
canvas.style("width", width).style("height",height);
let texture = PIXI.Texture.fromImage('assets/particle@2x.png');

// -- UI
const $typeToggle = d3.select("#type");
const $dimensionA = d3.select("#dimensionA");
const $dimensionB = d3.select("#dimensionB");
const $dimensionC = d3.select("#dimensionC");

// -- ACTIONS
function changeDemographic(d) {
	let o = Object.assign({}, state);
	o.data = o.result.filter(selectDemographic(d));
	o.type = d;
	o.dimensionA = null;
	o.dimensionB = null;
	o.dimensionC = null;
	o.clusters = null;
	changeState(o);
}

function changeDimension(valueA, valueB, valueC) {
	
	let o = Object.assign({}, state);

	if(valueA === "" && valueA !== undefined) {
		o.clusters = null;
		o.dimensionA = null;
		o.dimensionB = null;
		o.dimensionC = null;
	} else {

		if(valueB === undefined) {
			o.dimensionA = valueA;
			o.dimensionB = null;
			o.clusters = d3.nest()
			.key((d)=>d[valueA])
			.rollup((d)=>d.length)
			.entries(o.data);
		} else if(valueB !== undefined && valueC === undefined) {
			o.dimensionA = valueA;
			o.dimensionB = valueB;
			o.dimensionC = null;
			o.clusters = d3.nest()
			.key((d)=>d[valueA])
			.key((d)=>d[valueB])
			.rollup((d)=>d.length)
			.entries(o.data);
		} else if(valueB !== undefined && valueC !== undefined) {
			o.dimensionA = valueA;
			o.dimensionB = valueB;
			o.dimensionC = valueC;
			o.clusters = d3.nest()
			.key((d)=>d[valueA])
			.key((d)=>d[valueB])
			.key((d)=>d[valueC])
			.rollup((d)=>d.length)
			.entries(o.data);
		} else {
			throw new Error("wrong number of dimensions");
		}

	}
	changeState(o);
}


// -- REDUCERS
function selectDemographic(d) {
	return (a)=> a["Tipo"] === d;
}


// -- ACCESSORS

function loadData(callback) {
	d3.tsv("assets/data/dati-studenti-professori.tsv", ( error, data)=>{
		if(error) throw new Error(error.target.response);
		callback(data);
	});
}

function changeState(s){
	console.log("previous state", state);
	console.log("current state", s);
	
	if(state.type != s.type) {
		updateNodes(s);
		resetUI(s.type);
		updateLayout(s);
	} else if(state.dimensionA != s.dimensionA || state.dimensionB != s.dimensionB || state.dimensionC != s.dimensionC) {
		updateLayout(s);
		updateUI(s);
	}
	window.state = s;
}


function init() {

	d3.select("#ui").style("visibility", "hidden");

	loadData((result)=>{
		state.result = result
		.filter((d)=>d.Tipo !=="professore" || d.Tipo !=="studente")
		.filter((d)=>d.ID!=="")

		result
		.forEach((d)=> d.Livello = d.Livello == "T" ? "Undergraduate" : "Graduate");

		const screenRadius = Math.sqrt(width*width + height*height) / 2;

		// add viz properties to data
		state.result.forEach((d,i)=>{
			let x = Math.random()*width;
			let y = Math.random()*height;
			let dx = x - width*.5;
			let dy = y - height*.5;
			let dir = Math.atan2(dy,dx);
			let l = Math.sqrt(dx*dx + dy*dy) + screenRadius;
			let nx = Math.cos(dir)*l + width*.5;
			let ny = Math.sin(dir)*l + height*.5;
			
			// random initial position
			d.sx = x;
			d.sy = y;
			// out of screen position
			d.ox = nx;
			d.oy = ny;

			d.sprite = new PIXI.Sprite(texture);

			d.index = i;
			d.offset = Math.random();
			d.randomWalk = 0;

			d.oAlpha =.6;
			
			
			container.addChild(d.sprite);
		});

		// init UI
		d3.select("#ui").style("visibility", "visible");
		
		$typeToggle
		.selectAll("button")
		.on("click", function(){
			changeDemographic(d3.select(this).attr("name"));
		});
		
		// drawers		
		d3
		.selectAll("#dimensionsDrawers select")
		.on("change", function() {

			const el = d3.select(this);
			const name = el.attr("name");
			const value = el.node().selectedOptions[0].value;
			if(name == "dimensionB") {
				changeDimension(state.dimensionA, value);
			} else {
				changeDimension(value);
			}

		});

		// toggle
		$dimensionC
		.selectAll("button")
		.on("click", function(){
			
			const el = d3.select(this);
			const isDisabled = el.classed("disabled");

			if(!isDisabled) {
				changeDimension(state.dimensionA, state.dimensionB);
			} else {
				changeDimension(state.dimensionA, state.dimensionB, el.attr("name"));
			}

		});

		changeDemographic("studente");

		window.requestAnimationFrame(tick);
	});
}


function resetUI(type) {
	$typeToggle
	.selectAll("button")
	.classed("disabled", function(d){
		return d3.select(this).attr("name") != type;
	});

	$typeToggle
	.selectAll("button")
	.classed("disabled", function(d){
		return d3.select(this).attr("name") != type;
	});

	$dimensionA.node().selectedIndex = 0;
	$dimensionB.node().selectedIndex = 0;
	$dimensionC.style("display", "none");
}

function updateUI(s) {
	//TODO we should have an array for these options but for now it's ok
	let optionsA = $dimensionA.selectAll("option").nodes().map(d=>d.value);
	let optionsB = $dimensionB.selectAll("option").nodes().map(d=>d.value);
	$dimensionA.node().selectedIndex = s.dimensionA ? optionsA.indexOf(s.dimensionA) : 0;
	$dimensionB.node().selectedIndex = s.dimensionB ? optionsB.indexOf(s.dimensionB) : 0;

	let isSecondDimension = s.dimensionA !== null && s.dimensionB !== null;

	$dimensionC.style("display", isSecondDimension ? "block": "none");
	
	if(isSecondDimension) {
		$dimensionC.selectAll("button").each(function(){
			const el = d3.select(this);
			el.classed("disabled", el.attr("name") !== s.dimensionC);
		});
	}
}

function updateNodes(s) {
	const selection = d3.selectAll("studentparticle.p").data(s.data, (d)=>+d.index);

	selection
	.enter()
	.append("studentparticle")
	.attr("class","p")
	.each((d)=>{
		d.sprite.position.x = d.ox;
		d.sprite.position.y = d.oy;
		d.tx = d.sx;
		d.ty = d.sy;
		TweenMax.to(d.sprite, 2, {alpha:d.oAlpha});
	});

	selection
	.exit()
	.each((d)=>{
		// d.tweening = true;
		TweenMax.to(d.sprite.position, 2, {x:d.ox, y:d.oy});
		TweenMax.to(d.sprite, 2, {alpha:0});
	})
	.remove();
}



function updateLayout(s) {

	let clustersInfo = [];
	let c = 0;
	let pIndex = 0;

	// quick reset
	s.data.forEach(d=>d.sprite.tint = 0xffffff);
	updateAxis({});
	

	if(s.dimensionA !== null && s.dimensionB === null) {
		window.settings.wander = 3.1;


		pack = pack.size([width, height]).padding(height*0.1);
		clustersInfo =  pack(getHierarchy(s.clusters)).children; 
		
		positionNodesInCircles();
		updateLabels(clustersInfo);
		
	} else if(s.dimensionC === null && s.dimensionB !== null) {
		window.settings.wander = 3.1;

		pack = pack.size([width, height]).padding(height*0.05);

		// TODO we may not need to change data structure 
		s.clusters.forEach((d)=>d.children = d.values);
		
		let h = d3.hierarchy({children:s.clusters}).sum(d=>{
			if(d.values) {
				return d.values.map(d=>d.value).reduce((a,b)=>a+b);
			} else {
				return d.value;
			}
		});

		let p = pack(h).children;
		let dataLabel = [];

		p.forEach(d=>{
			// add labels for parent clusters
			d.first = true;
			d.y += d.r;
			dataLabel.push(d);
			dataLabel = dataLabel.concat(d.children);
			clustersInfo = clustersInfo.concat(d.children);
		});

		positionNodesInCircles();
		updateLabels(dataLabel);

	} else if(s.dimensionC !== null) {

		window.settings.wander = 0.2;

		console.log(s.dimensionC)
		switch(s.dimensionC) {
			case "Genere":
			butterflyChart();

			break;
			case "Anno di nascita":
			histogram();
			
			break;
			case "Valutazione":
			// matrix (treemap packing?)

			break;
		}



	} else {
		updateLabels({});
		return;
	}

	function histogram() {
		window.settings.wander = 0.0;

		let allClusters = [];
		let years = [];
		s.clusters.forEach(d=>d.values.forEach(d=>{
			allClusters.push(d.key);
			d.values.forEach(d=>{
				years.push(d);
			});
		}));
		
		// years extent
		let ae = d3.extent(years, (d)=>+d.key);
		// max frequency 
		let mf = d3.max(years, (d)=>+d.value);

		
		let xss = d3.scaleLinear().domain(ae).range([width*.25, width*.75]);
		let yss = d3.scaleLinear().domain([0, allClusters.length-1]).range([height*.1, height*.9]);
		let y2s = d3.scaleLinear().domain([0, mf]).range([0, (yss(1)-yss.range()[0])*.5]);


		let row = 0;
		let c = 0;

		let labelsData = [];
		s.clusters.forEach((first)=>{

			labelsData.push({
				data:{
					key:first.key
				},
				y: yss(row),
				x: width*0.9,
				labelLeftAligned: true,
				first: true
			});

			first.values.forEach((second)=> {
				labelsData.push({
					data:{
						key:second.key
					},
					labelLeftAligned: true,
					y:yss(row),
					x: width*0.8
				});
				second.values.forEach((third)=> {

					d3.range(third.value).forEach((d, i)=>{
						s.data[c].tx = xss(+third.key) ;
						s.data[c].ty = -y2s(i) + yss(row);
						c++;
					});
				});
				row++;

			});
		});

		updateLabels(labelsData);
	}


	function matrix() {

	}

	function butterflyChart() {

		// max value of all records
		let mv = d3.max(s.clusters, (d)=>d3.max(d.values, (d)=>d3.max(d.values, (d)=>d.value)));
		

		const xs = d3.scaleLinear().domain([0, s.clusters.length-1]).range([width*.25, width*.75]);
		const ys = d3.scaleLinear().domain([0, s.clusters[0].values.length-1]).range([height*.25, height*.75]);
		// vertical layout
		const columnWidth = (width*.5) / s.clusters.length;
		let c = 0;
		let labelsData = [];
		let axisData = [];


		s.clusters.forEach((first, col)=>{

			let ix = xs(col);

			first.values.sort((a,b)=> {
				return (b.values[0].value + b.values[1].value) - (a.values[0].value + a.values[1].value);
			});

			axisData.push({x1:xs(col), y1:ys(0), x2:xs(col), y2:ys.range()[1]+40});


			first.values.forEach((second, row)=>{
				let iy = ys(row);
				labelsData.push({
					data:{
						key:first.key
					},
					first: true,
					y: ys.range()[0] - 40,
					x: ix
				});

				second.values.forEach((third)=>{
					let xw = (third.value / mv) * (columnWidth * 0.25);
					xw *= (third.key === "M" ? -1 : 1);

					labelsData.push({
						data:{
							key:second.key
						},
						y: iy + 60,
						x: ix
					});

					d3.range(0,third.value).forEach((n)=>{
						s.data[c].tx = ix +(n/third.value)*xw;
						s.data[c].tx += (third.key === "M" ? -5 : 5);
						s.data[c].ty = iy + Math.random()*30 ;
						s.data[c].sprite.tint = third.key === "M" ? 0x2864C7 : 0xC4256A;
						c++;
					});
				});
			});
		});

		updateLabels(labelsData);
		updateAxis(axisData);
	}

	function positionNodesInCircles() {
		// position nodes
		s.data.forEach((d,i)=>{
			const cl = clustersInfo[pIndex];
			if(c > cl.value) {
				pIndex++;
				c = 0;
			}

			let p = sampleCircle(cl.r, cl.x, cl.y)
			d.tx = p.x;
			d.ty = p.y;

			c++;
		});
	}
	
	function getHierarchy(n) {
		let p = n.map(d=>({key:d.key, value:d.value}));
		return d3.hierarchy({children:p}).sum(d=>d.value);
	}
	
	function sampleCircle(cr, cx, cy) {
		let or = cr * cr;
		let r = Math.sqrt(Math.random() * or);
		let angle = Math.random() * Math.PI * 2;

		return {
			x: Math.cos(angle) * r + cx,
			y: Math.sin(angle) * r + cy		
		};
	}

	function updateLabels(data) {
		

		// TODO hm something is not working right in the join so I remove everything here
		d3.selectAll("mylabel.p")
		// .exit()
		.remove()
		.each(d=>stage.removeChild(d.cont));

		d3.selectAll("mylabel.p").each(d=>stage.removeChild(d.cont));

		let selection = d3.selectAll("mylabel.p").data(data, d=>d.name);

		const fontSize = 12;
		const pw = fontSize * 0.8;
		const ph = fontSize * 0.7;


		selection
		.enter()
		.append("mylabel")
		.attr("class","p")
		.each((d,i)=>{
			let text = new PIXI.Text(d.data.key.toUpperCase(),{fontFamily : 'Arial', fontSize: fontSize, fill : 0x2B0B69});
			let cont = new PIXI.Sprite();
			let g = new PIXI.Graphics();
			const tw = text.width;
			const th = text.height;
			g.beginFill(d.first ? 0xff0000: 0xffffff, .8);
			g.drawRect(-pw*.5,-ph*.5, tw+pw, th+ph);
			g.endFill();
			cont.position.x = d.x;
			cont.position.y = d.y;
			if(!d.labelLeftAligned) {
				cont.position.x -= tw * .5;
				cont.position.y -= th * .5;
			} 
			cont.addChild(g);
			cont.addChild(text);
			stage.addChild(cont);
			d.cont = cont;
			TweenMax.from(cont, 1, {delay:i*.01+1, alpha:0})
		});
	}

	function updateAxis(data) {

		axisGraphics.clear();
		axisGraphics.lineStyle(1,0xffffff);

		if(!data.length) return;

		data.forEach(d=>{
			axisGraphics.moveTo(d.x1,d.y1);
			axisGraphics.lineTo(d.x2,d.y2);
		});
	}
}




let time = 0;
function tick() {
	time+=0.01;
	renderer.render(stage);
	state.data.forEach((d,i)=> {
		let speed = d.offset * .2 + .1;
		d.sprite.position.x += (d.tx-d.sprite.position.x)*speed;
		d.sprite.position.y += (d.ty-d.sprite.position.y)*speed;
		d.randomWalk += Math.random() * 2 - 1;
		let a = time * d.offset;
		let r =  d.offset * 10 * d.randomWalk * window.settings.wander * 0.01;
		d.sprite.position.x += Math.cos(a) * r;
		d.sprite.position.y += Math.sin(a) * r;
		// d.sprite.alpha = (Math.sin(a * 10) * .5 + .5) * .6 + .2;

	});
	window.requestAnimationFrame(tick);
}

init();
