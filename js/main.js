(function(){

//pseudo-global variables for data join
var attrArray = ["GDP(billion 2019)","Infected per million(till 3/29)","Recovered per million(till 3/29)","Beds per ten thousand(2018)","Population(million 2018)"];
var expressed = attrArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = window.innerWidth * 0.47,
    chartHeight = 600,
    leftPadding = 40,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([chartHeight, 0])
    .domain([0, 1600]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    // map frame dimensions
    var width = window.innerWidth * 0.47,
        height = 600;

    // title
    var title = d3.select("body")
            .append("svg")
            .attr("class", "firsttitle")
            .attr("width", window.innerWidth - 10)
            .attr("height", 50);

    title.append("text")
            .attr("x", 10)
            .attr("y", 35)
            .text("China in COVID-19: Epidemic and Social Development Level of Each Province")
            .style('fill', 'white');

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on China
    var projection = d3.geoConicEqualArea()
        .center([98.8607508,31.8084676]) // 31.8084676, 104.8607508
        .scale(600)
        .translate([width/2, height/16])
        .parallels([0,0])
        .rotate([-10, 10,-30]);


    var path = d3.geoPath()
        .projection(projection);


    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/attr.csv"),
                    d3.json("data/china.topojson"),
                    d3.json("data/outofchina.topojson")
                   ];
    Promise.all(promises).then(callback);

    function callback(data){
    csvData = data[0];
    china = data[1];
    outofchina = data[2]
    //translate china TopoJSON
    var chinaProvinces = topojson.feature(china, china.objects.china).features;
    var asianCountries = topojson.feature(outofchina, outofchina.objects.collection);

    //join csv data to GeoJSON enumeration units
    chinaProvinces = joinData(chinaProvinces, csvData);

    //create the color scale
    var colorScale = makeColorScale(csvData);

    //add enumeration units to the map
    setEnumerationUnits(chinaProvinces, asianCountries, map, path, colorScale);

    //add coordinated visualization to the map
    setChart(csvData, colorScale);

    // initialize the map using the first attribute data
    changeAttribute(expressed,csvData);

    createDropdown();

    var board = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("id", "intro")
            .attr("width", window.innerWidth - 60)
            .attr("height", 400)
            .attr("align","center");

    textdata = [{text:"The COVID-19 epidemic is currently sweeping the world and has become an international health crisis. Facts have proved that the spread of COVID-19 in an area is closely related to the level of local social development, such as medical resources, economic development level, population size, etc. Focusing on China, where the epidemic occurred early, I collected, normalized, and visualized five province-level data related to the epidemic situation and social development level in China (Gross Domestic Product (GDP), infected cases, recovered cases, beds in hospitals, and population size), and analyzed the internal connections between them to better reveal the spatial heterogeneity in the spread of COVID-19.", resize: false},
    {text: "From the GDP choropleth map and Population choropleth map, we can see that China's major economic provinces are basically population-intensive provinces, and thus population and economic development levels are positively correlated. Intuitively, we may think that the people living in more economically developed provinces can enjoy more medical resources. However, it is not always the case considering the population factors. As can be seen from the Bed choropleth map, the provinces with the most beds per capita in China are basically northeast, northwest, southwest and central provinces. The per capita bed of the most economically developed southeastern coastal provinces such as Guangdong Province, on the contrary,  is lower than the national average. This is because the overpopulation of these provinces has led to insufficient medical resources per capita."},
  {text: "Next, from the Infected choropleth map and Recovered choropleth map, it can be seen that infection cases and recovered cases are positively related to the population and medical resources per capita. For example, the most infected areas are mainly concentrated in the most populous provinces in the central and southeastern coasts. It is worth noting that Heilongjiang Province has also reported many recovered cases, while its economic development level ranks only the 9th last. From the perspective of per capita medical resources, Heilongjiang Province actually has the 9th national per-capita medical resources, which is a very positive sign for the timely treatment of patients and the control of the spread of the epidemic. Therefore, it also proves that the spread of the epidemic is closely linked to the level of social development."},
  {text: "Data sources: National Bureau of Statistics of China http://www.stats.gov.cn/english/"}]
    textbox = new d3plus.TextBox()
    .select('#intro')
    .data(textdata)
    .fontSize(16)
    .height(300)
    .fontColor('#FFF')
    .width(window.innerWidth - 60)
    .y(function(d, i) { return i * 100 })
    .padding(10)
    .render();


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

function setEnumerationUnits(chinaProvinces, asianCountries, map, path, colorScale){

    //add Asian countries to map
    var countries = map.append("path")
        .datum(asianCountries)
        .attr("class", "countries")
        .attr("d", path)
        .style("fill", "#3F3F41");

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
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
    dehighlight(d.properties);
        })
        .on("mousemove", moveLabel)

    var desc = provinces.append("desc")
      .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

//function to create color scale generator
function makeColorScale(data,expressed){

    var colorClasseslist = [];
    colorClasseslist[0] = [
        "#edf8fb",
        "#b2e2e2",
        "#66c2a4",
        "#2ca25f",
        "#006d2c"
    ]

    colorClasseslist[1] = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ]
    colorClasseslist[2] = [
        "#f1eef6",
        "#bdc9e1",
        "#74a9cf",
        "#2b8cbe",
        "#045a8d"
    ]
    colorClasseslist[3] = [
        "#f2f0f7",
        "#cbc9e2",
        "#9e9ac8",
        "#756bb1",
        "#54278f"
    ]
    colorClasseslist[4] = [
        "#fee5d9",
        "#fcae91",
        "#fb6a4a",
        "#de2d26",
        "#a50f15"
    ]

  var idx = attrArray.indexOf(expressed)
  if (idx == -1)
  {
    idx = 0;
  }

  var colorClasses = colorClasseslist[idx]

  console.log(colorClasses)

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
    var chartWidth = window.innerWidth * 0.47,
        chartHeight = 600,
        leftPadding = 40,
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
        .domain([0, 1600]);

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
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel)
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

    var desc = bars.append("desc")
      .text('{"stroke": "none", "stroke-width": "0px"}');

    //below Example 2.8...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 100)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text(expressed + " in each province");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(40,-5)")
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);
};

function createDropdown(){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
    changeAttribute(this.value, csvData)});


    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .property("selected", function(d){ return d === "GDP(billion 2019)"; })
        .text(function(d){ return d });

};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData,expressed);

    //recolor enumeration units
    var provinces = d3.selectAll(".provinces")
      .transition()
      .duration(1000)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(value);
            } else {
            	return "#ccc";
            }
    });
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(600);

    updateChart(bars, csvData.length, colorScale);

};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){

    //position bars
    //set bars for each province

    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        .attr("height", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) - topBottomPadding;
        })
        .style("fill", function(d){
          var value = d[expressed];
          console.log(value)
          if(value) {
               return colorScale(value);
           } else {
               return "#ccc";
           }
        });

    var chartTitle = d3.select(".chartTitle")
      .text(expressed + " in each province")
      .style('fill', 'white');
};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.id)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    setLabel(props);
};

function dehighlight(props){
    var selected = d3.selectAll("." + props.id)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};

//Example 2.8 line 1...function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = 0
    // console.log(window.innerWidth - labelWidth, d3.event.clientX)
    if(d3.event.clientX<window.innerWidth/2){
      x = d3.event.clientX > window.innerWidth * 0.47 - labelWidth - 10 ? x2 : x1;
    }
    else{
      x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    }
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 150 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.id + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.en_name);
};

})(); //last line of main.js
