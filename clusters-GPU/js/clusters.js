/* jslint esversion:6, unused:true */

const FONTSIZE = 11;


// -- GUI
let gui;

window.settings = new function() {
	this.wander = 0.8;
	this.speed = 1;
}();

window.onload = function() {
	gui = new dat.GUI();
	gui.add(window.settings, 'wander', 0, 1).listen();
	gui.add(window.settings, 'speed', 1, 100).listen();
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
let time = 0;


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

// -- START
init();


// -- ACCESSORS

function loadData(callback) {
	d3.tsv("assets/dati-studenti-professori.tsv", ( error, data)=>{
		if(error) throw new Error(error.target.response);
		callback(data);
	});
}

function changeDemographic(d) {
	let o = Object.assign({}, state);
	o.data = o.result.filter((a)=> a["Tipo"] === d);
	o.type = d;
	o.dimensionA = null;
	o.dimensionB = null;
	o.dimensionC = null;
	o.nestedData = null;
	updateState(o);
}

function changeDimension(valueA, valueB, valueC){

	let o = Object.assign({}, state);
	
	//TODO this can be optimized	
	if(valueA === "" && valueA !== undefined) {
		o.dimensionA = null;
		o.dimensionB = null;
		o.dimensionC = null;
		o.nestedData = null;
	} else if(valueB === undefined && valueC === undefined) {
		o.dimensionA = valueA;
		o.dimensionB = null;
		o.dimensionC = null;
		o.nestedData = getNestedData([valueA], o.data);
	} else if(valueB !== undefined && valueC === undefined) {
		o.dimensionA = valueA;
		o.dimensionB = valueB;
		o.dimensionC = null;
		o.nestedData = getNestedData([valueA, valueB], o.data);
	} else if(valueB !== undefined && valueC !== undefined) {
		o.dimensionA = valueA;
		o.dimensionB = valueB;
		o.dimensionC = valueC;
		o.nestedData = getNestedData([valueA, valueB, valueC], o.data);
	}

	updateState(o);
}

function updateState(s){
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
		.map(d=>{
			if(!d.Valutazione || d.Valutazione === "") d.Valutazione = 0;
			d.Valutazione = Math.round(+d.Valutazione);
			return d;
		});

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
		setTimeout(()=>d3.select("#ui").style("visibility", "visible"), 1500);

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

			if(name == "dimensionA") {
				changeDimension(value, undefined, undefined);
			} else if(name == "dimensionB") {
				changeDimension(state.dimensionA, value, state.dimensionC || undefined);
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
	$dimensionA.node().selectedIndex = s.dimensionA ? optionsA.indexOf(s.dimensionA) : 0;

	// remove selected dimension A from dimension B select
	let optionsB = $dimensionA.selectAll("option").nodes().filter((d,i)=> !d.selected);
	$dimensionB.selectAll("option").remove();

	$dimensionB.selectAll("option")
	.data(optionsB)
	.enter()
	.append("option").
	attr("value", d=>d.value).
	attr("selected", d=>d.value == s.dimensionB ? true : null)
	.text(d=>d.textContent);

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
	updateAxes({});


	if(s.dimensionA !== null && s.dimensionB === null) {
		window.settings.wander = 0.8;


		pack = pack.size([width, height]).padding(height*0.1);
		clustersInfo =  pack(getHierarchy(s.nestedData)).children; 

		positionNodesInCircles();
		updateLabels(clustersInfo.map(d=>({
			first:true,
			text: d.data.key,
			x: d.x,
			y: d.y + d.r  + FONTSIZE *.5,
		})));

	} else if(s.dimensionC === null && s.dimensionB !== null) {
		window.settings.wander = 0.4;

		let dataLabels = [];
		const offsetX = width*.25;
		let size = height;
		let offsetY = 0;
		if(s.nestedData.length < 3) {
			size *= 1.2;
			offsetY = size * .1;
		}
		// pack each cluster
		pack = pack.padding(d=>{
			return d.depth == 1 ? 10 : d.depth == 0 ? 0 : 40
		}).size([size, size]);

		s.nestedData.forEach(d=>{
			d.children = d.values;
		});
		let h = d3.hierarchy({children:s.nestedData}).sum(d=>d.value);
		let packed = pack(h);

		packed.children
		.forEach(d=>{

			dataLabels.push({
				first: true,
				x: d.x + offsetX,
				y: d.y + d.r*.9 - offsetY,
				text: d.data.key
			});

			d.children
			.forEach(dd=>{

				dd.x += offsetX;
				dd.y -= offsetY;

				dataLabels.push({
					x: dd.x,
					y: dd.y - dd.r - FONTSIZE*.5,
					text: dd.data.key
				});

				clustersInfo.push(dd);

			});
		});


		positionNodesInCircles();
		updateLabels(dataLabels);



	} else if(s.dimensionC !== null) {

		window.settings.wander = 0.2;

		console.log(s.dimensionC)
		switch(s.dimensionC) {

			case "Genere":
			genderChart();
			break;

			case "Anno di nascita":
			birthChart();
			break;

			case "Valutazione":
			valuationChart();
			break;

		}



	} else {
		updateLabels({});
		return;
	}

	function birthChart() {
		window.settings.wander = 0.0;

		let axisData = [];
		let allClusters = [];
		let years = [];
		s.nestedData.forEach(d=>d.values.forEach(d=>{
			allClusters.push(d.key);
			d.values.forEach(d=>{
				years.push(d);
			});
		}));

		// years extent
		let ae = d3.extent(years, (d)=>+d.key);
		// max frequency 
		let mf = d3.max(years, (d)=>+d.value);


		let xss = d3.scaleLinear().domain(ae).range([width*.25, width*.8]);
		let yss = d3.scaleLinear().domain([0, allClusters.length-1]).range([height*.1, height*.9]);
		let y2s = d3.scaleLinear().domain([0, mf]).range([0, (yss(1)-yss.range()[0])*.5]);


		let row = 0;
		let c = 0;

		let labelsData = [];

		let axisY = height*.92;
		axisData.push({
			x1: xss.range()[0], 
			x2: xss.range()[1], 
			y1: axisY,
			y2: axisY
		});

		labelsData.push({
			text:ae[0] +" ",
			labelLeftAligned: true,
			rotation: 10,
			y: axisY,
			x: xss.range()[0]
		});

		labelsData.push({
			text:ae[1] +" ",
			labelLeftAligned: true,
			rotation: 10,
			y: axisY,
			x: xss.range()[1] * 1.005
		});


		s.nestedData.forEach((first)=>{

			labelsData.push({
				text:first.key,
				y: yss(row) - FONTSIZE,
				x: xss.range()[1] * 1.1,
				labelLeftAligned: true,
				first: true
			});



			first.values.forEach((second)=> {

				labelsData.push({
					text:second.key,
					labelLeftAligned: true,
					y:yss(row) - FONTSIZE,
					x: xss.range()[1] * 1.02
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

		updateAxes(axisData);
		updateLabels(labelsData);
	}


	function valuationChart() {


		const x0 = d3.scaleBand()
		.rangeRound([width*0.25, width*0.9])
		.paddingInner(0.1)
		.domain(s.nestedData.map(d=>d.key));

		// find all the unique keys for the second dimension
		let keys = [];
		s.nestedData.forEach(d=>d.values.forEach(dd=>{if(keys.indexOf(dd.key)==-1) keys.push(dd.key)}));

		const x1 = d3.scaleBand()
		.domain(keys)
		.rangeRound([0, x0.bandwidth()])
		.padding(0.05);


		const voteScale = d3.scaleLinear()
		.domain([0,110])
		.range([height*0.8, height*0.2]);

		let c = 0; 
		let labelsData = [];

		s.nestedData.forEach( (first, column) =>{
			

			labelsData.push({
				first:true,
				text:first.key,
				labelLeftAligned: false,
				y: voteScale.range()[0]*1.1, 
				x: x0(first.key) +  x0.bandwidth()/2
			});

			first.values.forEach((second, column2)=>{
				
				let ix = x0(first.key) + x1(second.key);

				labelsData.push({
					text:second.key,
					labelLeftAligned: false,
					y: voteScale.range()[0]*1.05, 
					x: ix
				});
				second.values.forEach((third,i)=>{

					d3.range(third.value).forEach((n, i)=>{
						if(c<s.data.length) {	
							s.data[c].tx = ix
							s.data[c].ty =voteScale(+third.key);
							c++;
						}
					});
				});
			});
		});


		let axisLabelsData = voteScale.ticks(5);
		axisLabelsData.push(110);
		axisLabelsData = axisLabelsData.map(d=>({
			x: x0.range()[0]*0.85,
			y: voteScale(d),
			text: d + " ",
		}));

		let axisX = x0.range()[0]*0.88;
		const axisData = [{
			x1: axisX,
			y1: voteScale.range()[1],
			x2: axisX,
			y2: voteScale.range()[0]
		}];

		updateAxes(axisData);
		updateLabels(labelsData.concat(axisLabelsData));

	}

	function genderChart() {

		// max value in all records
		let mv = d3.max(s.nestedData, (d)=>d3.max(d.values, (d)=>d3.max(d.values, (d)=>d.value)));

		// unique second dimensions keys
		let uniqueSdk = [];
		s.nestedData.forEach(d=>d.values.forEach(d=>{
			if(uniqueSdk.indexOf(d.key) ==-1) uniqueSdk.push(d.key);
		}));

		const gRange = [height*.3, height*.7];
		const ys = d3.scaleLinear().domain([0, s.nestedData.length-1]).range(gRange);
		const yss = d3.scaleLinear().domain([1, mv]).range([0, (gRange[1]-gRange[0])/s.nestedData.length ]);
		const xs = d3.scaleLinear().domain([0, uniqueSdk.length-1]).range([width*.3, width*.95]);

		let c = 0;
		let labelsData = [];
		let axisData = [];




		s.nestedData.forEach((first, row)=>{

			let iy = ys(row);

			let labelX = xs(0) * .92;

			labelsData.push({
				text:"M",
				x: labelX,
				y: iy -10 
			});

			labelsData.push({
				text:"F",
				x: labelX,
				y: iy + 10
			});

			axisData.push({x1:labelX*.9, y1:ys(row), x2:xs.range()[1], y2:ys(row)});

			// first.values.sort((a,b)=> {
				// if(!a.values[1] || !a.values[0]) return 1;
				// if(!b.values[1] || !b.values[0]) return -1;
				// return (b.values[0].value + b.values[1].value) - (a.values[0].value + a.values[1].value);
				// });


				uniqueSdk.forEach((key, col)=>{

					let ix = xs(col);


					let second = first.values.find(d=>d.key==key);
					if(second) {

						second.values.forEach((third)=>{
							let yw = yss(third.value);
							yw *= (third.key === "M" ? -1 : 1);

							labelsData.push({
								text:second.key,
								y: ys.range()[1] * 1.2,
								x: ix
							});


							d3.range(0,third.value).forEach((n, i)=>{
								s.data[c].tx = ix ;
								s.data[c].ty = iy +(n/third.value)*yw;
								s.data[c].ty += third.key === "M" ? -5 : 5;
								// s.data[c].sprite.tint = third.key === "M" ? 0x2864C7 : 0xC4256A;
								c++;
							});
						});
					}

				});

			});


		updateLabels(labelsData);
		updateAxes(axisData);
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

	// TODO should this update functions be methods of selections?
	function updateLabels(data) {


		// TODO hm something is not working right in the join so I remove everything here
		d3.selectAll("mylabel.p")
		// .exit()
		.remove()
		.each(d=>stage.removeChild(d.cont));

		d3.selectAll("mylabel.p").each(d=>stage.removeChild(d.cont));

		let selection = d3.selectAll("mylabel.p").data(data, d=>d.text);


		selection
		.enter()
		.append("mylabel")
		.attr("class","p")
		.each((d,i)=>{


			let fontWeight = d.first ? 'bold' : 'normal';
			const textcolor = "white";
			const textValue = d.first ? d.text.toUpperCase() : toTitleCase(d.text.toLowerCase());
			const text = new PIXI.Text(textValue, {fontFamily : 'Calibre', fontWeight: fontWeight, fontSize: FONTSIZE, fill : textcolor});
			const cont = new PIXI.Sprite();
			const tw = text.width;
			const th = text.height;



			cont.position.x = d.x;
			cont.position.y = d.y;
			if(!d.labelLeftAligned) {
				cont.position.x -= tw * .5;
				cont.position.y -= th * .5;
			} 
			cont.addChild(text);
			stage.addChild(cont);
			d.cont = cont;

			if(d.rotation) {
				cont.anchor.x = 1;
				d.cont.rotation = d.rotation * 180 / Math.PI;
			}
			TweenMax.from(cont, 1.5, {delay:1, alpha:0})
		});
	}

	function updateAxes(data) {

		axisGraphics.clear();
		axisGraphics.alpha = 0;

		if(!data.length) return;

		axisGraphics.lineStyle(1,0xffffff);
		data.forEach(d=>{
			axisGraphics.moveTo(d.x1,d.y1);
			axisGraphics.lineTo(d.x2,d.y2);
		});

		TweenMax.to(axisGraphics, 1, {delay:1, alpha:.5})
	}
}


function tick() {
	time+=0.01;
	renderer.render(stage);
	let globalspeed = window.settings.speed/100;
	state.data.forEach((d,i)=> {
		let speed = d.offset * globalspeed + .1;
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


function toTitleCase(str)
{
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
