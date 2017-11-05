/* jslint esversion:6, unused:true */
window.settings = new function() {
	this.wander = 1;
}();
let gui;

window.onload = function() {
	gui = new dat.GUI();
	gui.add(window.settings, 'wander', 0, 10);
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
const $filterToggle = d3.select("#filter");

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

function changeDimension(name, valueA, valueB) {
	
	let o = Object.assign({}, state);

	if(valueA === "") {
		o.clusters = null;
		o[name] = null;
	} else {

		if(valueB == undefined) {
			o.clusters = organizeBy(o.data, valueA);
			o.dimensionA = valueA;
			o.dimensionB = null;
		} else {
			o.clusters = organizeBy(o.data, valueA, valueB);
			o.dimensionA = valueA;
			o.dimensionB = valueB;
		}

	}

	changeState(o);
}


// -- REDUCERS
function selectDemographic(d) {
	return (a)=> a["Tipo"] === d;
}

function organizeBy(data, keyA, keyB) {
	let clusters;

	if(keyB === undefined) {
		clusters = d3.nest()
		.key((d)=>d[keyA])
		.rollup((d)=>d.length)
		.entries(data);
	} else {
		clusters = d3.nest()
		.key((d)=>d[keyA])
		.key((d)=>d[keyB])
		.rollup((d)=>d.length)
		.entries(data);
	}

	return clusters;
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
	} else if(state.dimensionA != s.dimensionA || state.dimensionB != s.dimensionB) {
		updateLayout(s);
		updateUI(s);
	}
	window.state = s;
}


function init() {
	loadData((result)=>{
		state.result = result
		.filter((d)=>d.Tipo !=="professore" || d.Tipo !=="studente")
		.filter((d)=>d.ID!=="")

		result
		.forEach((d)=> d.Livello = d.Livello == "T" ? "Undegraduate" : "Graduate");

		// add viz properties to data
		state.result.forEach((d,i)=>{
			d.index = i;
			d.offset = Math.random();
			d.randomWalk = 0;
			d.tx = Math.random()* width;
			d.ty = Math.random()* height;
			d.sprite = new PIXI.Sprite(texture);
			d.sprite.position.x = d.tx
			d.sprite.position.y = d.ty
			d.anchor = {x:.5, y:.5};
			d.sprite.alpha = 0;
			container.addChild(d.sprite);
		});

		// init UI
		$typeToggle
		.selectAll("button")
		.on("click", function(d){
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
				let a = $dimensionA.node().selectedOptions[0].value;
				changeDimension(name, a, value)
			} else {
				changeDimension(name, value)
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
	$filterToggle.style("display", "none");
}

function updateUI(s) {
	//TODO we should have an array for these options but for now it's ok
	let optionsA = $dimensionA.selectAll("option").nodes().map(d=>d.value);
	let optionsB = $dimensionB.selectAll("option").nodes().map(d=>d.value);
	$dimensionA.node().selectedIndex = s.dimensionA ? optionsA.indexOf(s.dimensionA) : 0;
	$dimensionB.node().selectedIndex = s.dimensionB ? optionsB.indexOf(s.dimensionB) : 0;

	$filterToggle.style("display", s.dimensionA != null ? "block": "none");

}

function updateNodes(s) {
	const selection = d3.selectAll("studentparticle.p").data(s.data, (d)=>+d.index);

	selection
	.enter()
	.append("studentparticle")
	.attr("class","p")
	.each((d)=>{
		d.sprite.position.x = width*.5
		d.sprite.position.y = height*.5
	});

	
	selection
	.exit()
	.each((d)=>{
		// d.tweening = true;
		TweenMax.to(d.sprite.position, 1, {x:width*.5});
		TweenMax.to(d.sprite, 1, {alpha:0});
		// d.sprite.alpha = 0;
		// d.sprite.visible = false;
	})
	.remove();
}



function updateLayout(s) {

	if(s.clusters == null) {
		s.data.forEach((d,i)=>{d.tx= Math.random()*width; d.ty=Math.random()*height});
		updateLabels({})
		return;
	}

	

	let clustersInfo = [];
	let c = 0;
	let pIndex = 0;


	if(s.dimensionB === null) {

		pack = pack.size([width, height]).padding(height*0.1);
		clustersInfo =  pack(getHierarchy(s.clusters)).children; 
		updateLabels(clustersInfo);
		
	} else {

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
			// add labels for parent cclusters
			d.first = true;
			d.y += d.r;
			dataLabel.push(d);
			dataLabel = dataLabel.concat(d.children);
			clustersInfo = clustersInfo.concat(d.children);
		});


		updateLabels(dataLabel);


		
	}

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
		}
	}



	function updateLabels(data) {
		
		console.log(data);

		// TODO hm something is not working right
		d3.selectAll("mylabel.p")
		// .exit()
		.remove()
		.each(d=>stage.removeChild(d.cont))

		d3.selectAll("mylabel.p").each(d=>stage.removeChild(d.cont))

		let selection = d3.selectAll("mylabel.p").data(data, d=>d.name);


		selection
		.enter()
		.append("mylabel")
		.attr("class","p")
		.each((d,i)=>{
			let text = new PIXI.Text(d.data.key.toUpperCase(),{fontFamily : 'Arial', fontSize: 12, fill : 0x2B0B69, align : 'center'});
			let cont = new PIXI.Sprite();
			let g = new PIXI.Graphics();
			const tw = text.width;
			const th = text.height;
			const pw = tw *.2;
			const ph = th *.12;
			g.beginFill(d.first ? 0xff0000: 0xffffff, .8);
			g.drawRect(-pw*.5,-ph*.5, tw+pw, th+ph);
			g.endFill();
			cont.position.x = d.x - tw * .5;
			cont.position.y = d.y - th * .5;
			cont.addChild(g);
			cont.addChild(text);
			stage.addChild(cont);
			d.cont = cont;
			TweenMax.from(cont, 1, {delay:i*.01+1, alpha:0})
		});



	}
}




let time = 0;
function tick() {
	time+=0.01;
	renderer.render(stage);
	state.data.forEach((d,i)=> {
		// if(!d.sprite.visible) return;
		let speed = d.offset * .2 + .1;
		d.sprite.position.x += (d.tx-d.sprite.position.x)*speed;
		d.sprite.position.y += (d.ty-d.sprite.position.y)*speed;
		d.randomWalk += Math.random() * 2 - 1;
		let a = time * d.offset;
		let r =  d.offset * 10 * d.randomWalk * window.settings.wander * 0.01;
		d.sprite.position.x += Math.cos(a) * r;
		d.sprite.position.y += Math.sin(a) * r;
		d.sprite.alpha = (Math.sin(a * 10) * .5 + .5) * .6 + .2;

	});
	window.requestAnimationFrame(tick);
}

init();
