//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    // map frame dimensions
    var width = 1000,
        height = 800;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on China
    var projection = d3.geoConicEqualArea()
        .center([31.8084676, 104.8607508]) // 31.8084676, 104.8607508
        .rotate([-50, 50, 0])
        .parallels([20, 60])
        .scale(1000)
        .translate([-width / 4, height / 2]);

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

    //add China provinces to map
    var provinces = map.selectAll(".provinces")
        .data(chinaProvinces)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "provinces " + d.properties.id;
        })
        .attr("d", path);
    };
};
