//spazio per interfaccia a lato SX 850px, circa il 22%

var width = window.innerWidth,
  height = window.innerHeight,
  svg = d3.select("svg")
	  .attr('width', width)
	  .attr('height', height),
  canvas = document.querySelector("canvas"),
  context = canvas.getContext("2d"),
  nodeRadius = 1,
  nodes = [];

d3.select(canvas)
  .attr('width', width * 2)
  .style('width', width + 'px')
  .attr('height', height * 2)
  .style('height', height + 'px')

context.scale(2, 2);

var simulation = d3.forceSimulation(nodes)
  .force("collide", null)
  .force('x', null)
  .force('y', null)
  .force('charge', null)
  .alpha(1)
  .alphaMin(0.3)
  .alphaDecay(0.01)
  .on("tick", null)
  .on("tick", null)
  // .on("end", function() {
  //   console.log('calc done');
  // })

d3.select('.ui-box')
  .append('p')
  .attr('id', 'force-restart')
  .html('restart simulation')
  .on('click', function() {
    simulation.alpha(1)
      .restart();
  })

d3.select('.ui-box')
  .append('p')
  .attr('id', 'force-stop')
  .html('stop simulation')
  .on('click', function() {
    simulation.stop();
  })

d3.select('.ui-box')
  .append('div')
  .attr('id', 'alpha-meter')

function ticked(data, labels, clusters) {
  context.clearRect(0, 0, width, height);
  context.save();

  context.beginPath();
  data.forEach(drawNode);
  context.fillStyle = '#fff';
  context.fill();

  if (labels) {
    if (simulation.alpha() <= 0.8) {
      context.font = "9px Open Sans";
      context.textAlign = "center";
      context.fillStyle = '#fff';
      labels.forEach(function(ccc) {
        var thesePoints = nodes.filter(function(n) {
          return n[clusters] == ccc.key;
        })
        thesePoints = thesePoints.map(function(d) {
          return [d.x, d.y]
        })
        if (thesePoints.length > 2) {
          var thisHull = d3.polygonHull(thesePoints);
          var ty;
          thisHull.forEach(function(point){
          	if(!ty) {
          		ty = point[1]
          	}
          	if (ty < point[1]) {
          		ty=point[1]
          	}
          })
          var thisCentroid = d3.polygonCentroid(thisHull);

          var tw = context.measureText(ccc.key).width + 4;
          var tx = thisCentroid[0];
          ty += 20;

          context.fillStyle = "#fff";
          context.fillText(ccc.key, tx, ty);
        } else {
          var tw = context.measureText(ccc.key).width + 4;
          var tx = thesePoints[0][0];
          var ty = thesePoints[0][1] + ccc.r + 15;

          context.fillStyle = "#fff";
          context.fillText(ccc.key, tx, ty);
        }
      })
    }
  }

  context.restore();
  d3.select('#alpha-meter')
    .style('width', 100 * simulation.alpha() + '%')
}

function drawNode(d) {
  context.moveTo(d.x + d.r, d.y);
  context.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
}

function layout(config) {

  var data = config.data,
    type = config.layout,
    clusters = config.clusters,
    filter = config.filter,
    facet = config.facet,
    size = config.size;

  console.log(data.length + ' points')
  if (filter.property && filter.value) {
    if (filter.equal) {
      data = data.filter(function(d) {
        return d[filter.property] == filter.value;
      })
      console.log('Data filtered by: ' + JSON.stringify(filter) + '. ' + data.length + ' points');
    } else {
      data = data.filter(function(d) {
        return d[filter.property] != filter.value;
      })
      console.log('Data filtered by NOT: ' + JSON.stringify(filter) + '. ' + data.length + ' points');
    }

  } else {
    console.log('Data not filtered');
  }

  switch (type) {
    case 'flock':
      console.log('Selected floking layout on ' + clusters + ' with a filter on ' + JSON.stringify(filter));

      var thisGroups = d3.nest()
        .key(function(d) { return d[clusters]; })
        .rollup(function(d) { return d.length; })
        .entries(data);
      thisGroups.forEach(function(d, i) {
        d.r = Math.sqrt(d.value / Math.PI) * 3.2;
        d.x = size.left + ((width - size.left) / (thisGroups.length + 1) * (i + 1));
        d.y = height / 2;
      })
      console.log('Found clusters on property', clusters + ': ', thisGroups);

      data.forEach(function(d) {
        d.cluster_x = thisGroups.find(function(e) {
            return e.key == d[clusters]
          })
          .x
        d.cluster_y = thisGroups.find(function(e) {
            return e.key == d[clusters]
          })
          .y
      })

      var forceX = d3.forceX(function(d) {
        return d.cluster_x
      })

      var forceY = d3.forceY(function(d) {
        return d.cluster_y
      })

      var repulsion = d3.forceManyBody()
        .strength(-0.3)
        .theta(1.6);
      simulation
        .nodes(data)
        .force('x', forceX)
        .force('y', forceY)
        .force('charge', repulsion)
        .on("tick", function() {
          ticked(data, thisGroups, clusters);
          if (simulation.alpha() <= .8) {
            simulation
              .force('charge', repulsion.theta(0.9))
          }
        })
        .alpha(1)
        .alphaDecay(0.01)
        .restart();
      console.log('--- --- --- --- --- ---')

      break;

    case 'grid':
      console.log('Selected grid layout on ' + clusters + ' with a filter on ' + JSON.stringify(filter));

      var thisGroups = d3.nest()
        .key(function(d) { return d[clusters]; })
        .rollup(function(d) { return d.length; })
        .entries(data);
      thisGroups.forEach(function(d, i) {
        d.x = size.left + ((width - size.left) / (thisGroups.length + 1) * (i + 1));
        d.y = height / 2;
      })
      console.log('Found clusters on property', clusters + ': ', thisGroups);

      thisGroups = thisGroups.sort(function(a, b) {
        return b.value - a.value;
      })

      // // Filter data if needed
      // var cut = { floor: 0, ceil: 120 }
      // thisGroups = thisGroups.slice(cut.floor, cut.ceil);
      // data = data.filter(function(d) {
      //   var flag = false;
      //   thisGroups.forEach(function(e) {
      //     if (e.key == d['Cittadinanza']) {
      //       flag = true;
      //     }
      //   })
      //   return flag
      // })

      var row = {
        number: 0,
        y: undefined,
        maxradius: undefined,
        margin: 60
      }
      thisGroups.forEach(function(d, i) {
        d.r = Math.sqrt(d.value / Math.PI) * 3.2;
        d.x = d.r + row.margin;
        if (i == 0) {
          d.x += size.left + row.margin * 0
          row.maxradius = d.r * 0.35;
        } else if (i > 0) {
          d.x += thisGroups[i - 1].x + thisGroups[i - 1].r;
        }

        if (!row.y) {
          row.y = d.r + row.margin * 1;
        }
        var k = Math.floor((d.x / size.right))
        if (k == 1) {
          d.x -= thisGroups[i - 1].x + thisGroups[i - 1].r;
          d.x += size.left;
          row.y = thisGroups[i - 1].y + row.maxradius + d.r + row.margin * 0.65;
          row.maxradius = d.r;
        }
        d.y = row.y;
      })

      data.forEach(function(d) {
        d.cluster_x = thisGroups.find(function(e) {
            return e.key == d[clusters]
          })
          .x
        d.cluster_y = thisGroups.find(function(e) {
            return e.key == d[clusters]
          })
          .y
      })

      // console.log(data)

      var forceX = d3.forceX(function(d) {
        return d.cluster_x
      })

      var forceY = d3.forceY(function(d) {
        return d.cluster_y
      })

      var repulsion = d3.forceManyBody()
        .strength(-0.3)
        .theta(1.6);

      simulation
        .nodes(data)
        .force('x', forceX)
        .force('y', forceY)
        .force('charge', repulsion)
        .on("tick", function() {
          ticked(data, thisGroups, clusters);
          if (simulation.alpha() <= .8) {
            simulation
              .force('charge', repulsion.theta(0.9))
          }
        })
        .alpha(1)
        .alphaDecay(0.01)
        .restart();
      break;

    default:
      console.log('switch to default');
      simulation
        .nodes(data)
        .force('x', null)
        .force('y', null)
        .force('charge', null)
        .on("tick", function() {
          ticked(data);
        })
        .alpha(1)
        .alphaDecay(0.01)
        .restart();
      break;
  }

}

d3.tsv('./assets/data/data.tsv', function(err, data) {
  if (err) {
    throw err;
  }
  console.log(data)
  data.forEach(function(d) {
    var myX = width * 0.22 + width * 0.78 * Math.random();
    myX = width * Math.random();
    var myY = Math.random() * height;
    d.x = myX;
    d.y = myY;
    d.r = 1;
  })

  nodes = data;

  // // filter the data so to have less things to display and improve performances
  var tempData = [];
  for (var i = 0; i < data.length; i += 10) {
    tempData.push(data[i]);
  }
  nodes = tempData;

  var configReset = {
    data: nodes,
    layout: null,
    clusters: null,
    filter: {
      property: null,
      value: null,
      equal: true
    },
    facet: null,
    size: null
  }
  layout(configReset);

  var dropDownLayout = d3.select('#select-layout')
    .attr("name", "select-layout");
  var layoutOptions = dropDownLayout.selectAll("option")
    .data(["select a layout", "flock", "grid"]) // eg., data = [ {'value': 10}, {'value': 11}, {'value': 12} ]
    .enter()
    .append("option");
  layoutOptions.text(function(d) { return d; })
    .attr("value", function(d) { return d; });
  dropDownLayout.on("change", function() {
    // console.log(d3.event.target.value)
    config.layout = d3.event.target.value;
    config.size = d3.event.target.value == 'flock' ? sizeFlock : sizeGrid
    // console.log(config)
  });

  var dropDownClusters = d3.select('#select-cluster')
    .attr("name", "select-clusters");
  var clusterOptions = dropDownClusters.selectAll("option")
    .data(data.columns) // eg., data = [ {'value': 10}, {'value': 11}, {'value': 12} ]
    .enter()
    .append("option");
  clusterOptions.text(function(d) { return d; })
    .attr("value", function(d) { return d; });
  dropDownClusters.on("change", function() {
    // console.log(d3.event.target.value)
    config.clusters = d3.event.target.value;
    // console.log(config)
  });

  var dropDownFilter = d3.select('#select-filter')
    .attr("name", "select-filter");
  var filterOptions = dropDownFilter.selectAll("option")
    .data(data.columns) // eg., data = [ {'value': 10}, {'value': 11}, {'value': 12} ]
    .enter()
    .append("option");
  filterOptions.text(function(d) { return d; })
    .attr("value", function(d) { return d; });
  dropDownFilter.on("change", function() {
    // console.log(d3.event.target.value)
    config.filter.property = d3.event.target.value;
    // console.log(config)

    var values = d3.nest()
      .key(function(d) { return d[d3.event.target.value]; })
      .rollup(function(d) { return d.length; })
      .entries(nodes);

    values.unshift({key:'choose an option', value: 0})

    dropDownFilterValue.selectAll('*')
      .remove();

    var valuesOptions = dropDownFilterValue.selectAll("option")
      .data(values)
      .enter()
      .append("option");
    valuesOptions.text(function(d) { return d.key; })
      .attr("value", function(d) { return d.key; });

  });

  var dropDownFilterValue = d3.select('#value-filter')
    .attr("name", "value-filter")
    .on("change", function() {
      // console.log(d3.event.target.value)
      config.filter.value = d3.event.target.value;
      // console.log(config)
    });

  d3.select("#filter-mode")
    .on("change", function() {
      // console.log(d3.event.target.checked)
      config.filter.equal = d3.event.target.checked;
      // console.log(config)
    });

  d3.select('input[name="updateButton"]')
    .on('click', function() {
      layout(config)
    })

  d3.select('input[name="resetButton"]')
    .on('click', function() {
    	dropDownFilterValue.selectAll('*')
      .remove();
      nodes.forEach(function(d) {
        var myX = width * Math.random();
        var myY = Math.random() * height;
        d.x = myX;
        d.y = myY;
      })
      layout(configReset);
    })

  var sizeFlock = {
    top: 0,
    bottom: height,
    left: width * 0.22,
    right: width,
    height: height,
    width: width
  }

  var sizeGrid = {
    top: 0,
    bottom: height,
    left: width * 0.22,
    right: width * 0.9,
    height: height,
    width: width
  }

  var config = {
    data: nodes,
    layout: 'flock',
    clusters: 'Tipo',
    filter: {
      property: null,
      value: null,
      equal: false
    },
    facet: null,
    size: sizeFlock
  }

})
