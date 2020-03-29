(function(){

//pseudo-global variables for data join
var attrArray = ["con_now", "con_sum", "dead", "recovered", "pop_total(million)"];
var expressed = attrArray[4]; //initial attribute

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    // map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 600;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on China
    var projection = d3.geoConicEqualArea()
        .center([31.8084676, 104.8607508]) // 31.8084676, 104.8607508
        .rotate([-45, 45, 0])
        .parallels([20, 60])
        .scale(900)
        .translate([-width / 6, height / 2]);

    var path = d3.geoPath()
        .projection(projection);


    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/attr.csv"),
                    d3.json("data/china.topojson")
                   ];
    Promise.all(promises).then(callback);

    function callback(data){
    csvData = data[0];
    china = data[1];
        console.log(csvData);
        console.log(china);
    //translate china TopoJSON
    var chinaProvinces = topojson.feature(china, china.objects.china).features;
    //examine the results
    console.log(chinaProvinces);

    //join csv data to GeoJSON enumeration units
    chinaProvinces = joinData(chinaProvinces, csvData);

    //create the color scale
    var colorScale = makeColorScale(csvData);

    //add enumeration units to the map
    setEnumerationUnits(chinaProvinces, map, path, colorScale);

    //add coordinated visualization to the map
    setChart(csvData, colorScale);
    };
}; //end of setMap()

function joinData(chinaProvinces, csvData){
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.id; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<chinaProvinces.length; a++){

            var geojsonProps = chinaProvinces[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.id; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return chinaProvinces;
};

function setEnumerationUnits(chinaProvinces, map, path, colorScale){
    //add China provinces to map
    var provinces = map.selectAll(".provinces")
        .data(chinaProvinces)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "provinces " + d.properties.id;
        })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(d.properties[expressed]);
            } else {
            	return "#ccc";
            }
    });
};

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 600,
        leftPadding = 30,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([chartHeight, 0])
        .domain([0, 115]);

    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.id;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) - topBottomPadding;
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //annotate bars with attribute value text
    // var numbers = chart.selectAll(".numbers")
    //     .data(csvData)
    //     .enter()
    //     .append("text")
    //     .sort(function(a, b){
    //         return b[expressed]-a[expressed]
    //     })
    //     .attr("class", function(d){
    //         return "numbers " + d.id;
    //     })
    //     .attr("text-anchor", "middle")
    //     .attr("x", function(d, i){
    //         var fraction = chartWidth / csvData.length;
    //         return i * fraction + (fraction - 1) / 2;
    //     })
    //     .attr("y", function(d){
    //         return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    //     })
    //     .text(function(d){
    //         return d[expressed];
    //     });

    //below Example 2.8...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 100)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed + " in each province");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(30,-5)")
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
};

})(); //last line of main.js
