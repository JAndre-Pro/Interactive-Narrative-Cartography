const map = L.map('map').setView([20, -10], 2.5);
map.setMaxBounds([[-90, -180], [90, 180]]); //sets map bounds
L.tileLayer('https://api.mapbox.com/styles/v1/jandre-pro/cmlwyuil3000401sm8dnye6eg/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiamFuZHJlLXBybyIsImEiOiJjbWxmaTFsOTIwMjY5M2VvaWIzbWgyb3F2In0.6E3iTTICdzYRJcjiQGGCMQ', {
        minZoom: 2.5,
        maxZoom: 17,
        noWrap: true,//only draws tiles for the initial world view
        bounds: [[-90, -180], [90, 180]], //sets bounds of world map for tile layer
        maxBounds: [[-90, -180], [90, 180]],// sets max bounds for pan area
        maxBoundsViscosity: 5.0, // defines how strong the edges will snap back when trying to pan out of bounds
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                     '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                     'Imagery © <a href="http://mapbox.com">Mapbox</a>',
}).addTo(map);

//////////// Adds legend control to change with selected layer//////////////
let legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
    let div = L.DomUtil.create("div", "info legend");
    div.innerHTML = ""; // will be filled dynamically
    return div;
};
legend.addTo(map);

///////////////////////Map box logo attribution///////////////////////////

var logo = L.control({position: 'bottomleft'});

//add mapBox logo to map for required attribution
logo.onAdd = function(map) {
  var div = L.DomUtil.create('div', 'mapbox-logo');
  div.innerHTML = '<img src="img/mapbox-logo-white.png" width="100"/>';
  return div;
};
logo.addTo(map);

/////////////////////// Fetch geoJSONs ////////////////////////////////

// make airport data accessible to polygons
let airportData;   // global variable

// Load Airport data
fetch('data/airports.geojson')
  .then(response => response.json())
  .then(data => {
      console.log(data);
      airportData = data;   // define airport data for turf analysis

// Load State data within airports fetch so airports load first
    fetch('data/ne_10m_admin_1_states_provinces.json')
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // Run Turf count before adding to map
        addAirportCounts(data, airportData);

        //create variables that hold layers to cycle through with L.control.layers
        //this assigns the choropleth layer to countLayer
        let countLayer = L.geoJSON(data, {
            style: countStyle,
            onEachFeature: (feature, layer) => onEachFeature(feature, layer, "count")
        });
        //this assigns the second choropleth layer to seviceLayer
        let serviceLayer = L.geoJSON(data, {
            style: serviceStyle,
            onEachFeature: (feature, layer) => onEachFeature(feature, layer, "service")
        });

        //CREATE CENTROID DATASET
        //add to constant variable
        const centroidCollection = createCentroids(data);

        //proportional symbols based on area
        // assigns prop layer to symbolLayer
        let symbolLayer = createProportionalSymbols(centroidCollection);
        
        //default layer when map opens
        countLayer.addTo(map);
        //legend for default layer
        legend.getContainer().innerHTML = getCountLegendHTML();
        //Adds a bubble data layer selector to switch between the layers
        L.control.layers(
            {
                "Airport Count (Choropleth)": countLayer,
                "Average Airport Service Area": serviceLayer,
                "Airport Count (Proportional)": symbolLayer
            }
        ).addTo(map);
        // Update legend when user switches layers
            map.on("baselayerchange", function (e) {

                if (e.name === "Airport Count (Choropleth)") {
                    legend.getContainer().innerHTML = getCountLegendHTML();
                }
                else if (e.name === "Average Airport Service Area") {
                    legend.getContainer().innerHTML = getServiceLegendHTML();
                }
                else if (e.name === "Airport Count (Proportional)") {
                    legend.getContainer().innerHTML = getSymbolLegendHTML();
                }

            });
    });
}).catch(error => console.error('States Error: ', error));

/////////////////     Perform spatial analysis for symbols     ////////////////

// Turf Function to count airports and add new attribute to each polygon
function addAirportCounts(states, airports) {

    //create constant that lets us intersect airports with state polygons
    const airportPoints = turf.featureCollection(airports.features);

    // Loop through every state polygon in the GeoJSON
    states.features.forEach(state => {
        
        // Find all airport points that fall inside this state polygon
        const pointsWithin = turf.pointsWithinPolygon(
            airportPoints,
            state
        );

        // Store the number of airports inside this state
        state.properties.airport_count = pointsWithin.features.length;//adds attribute airport_counts
        
        // Compute the state's area in square kilometers
        state.properties.area_sqkm = turf.area(state) / 1000000;
        
        // normalize by service area =  square km/ airport count
        // Only do this if the state has at least one airport
        if (state.properties.airport_count > 0) {
                state.properties.airport_service = state.properties.area_sqkm / state.properties.airport_count;
        } else {
                // If no airports, set service area to 0 to avoid dividing by zero to get infinity output
                state.properties.airport_service = 0; 
        }     
    }); // end loop
}

function createCentroids(states) {
    //map each state polygon to a centroid point
    const centroids = states.features.map(state => {
            const c = turf.centroid(state); //finds the geometric center of the polygon
            
            // Copy the attributes the centroid will contain
            // These will be used for the popups and proportional symbols
            c.properties = {
            name: state.properties.name,
            // area_sqkm: state.properties.area_sqkm,
            airport_count: state.properties.airport_count,
            // airport_service: state.properties.airport_service
        };
        return c;
    });
    return turf.featureCollection(centroids);
}

///////////////     CREATE MAP STYLES     ///////////////////
//create color ramp for airport_count choropleth map
function getColor(d) {
    return d > 12 ? '#800026' :
           d > 9  ? '#BD0026' :
           d > 6  ? '#fc4e2a' :
           d > 3  ? '#FD8D3C' :
           d > 0   ? '#FFEDA0' :
                     '#35343473' ;
};
//create function that applies the color ramp to symbolize polygons based on total airport_count
function countStyle(feature) {
    return {
        fillColor: getColor(feature.properties.airport_count),
        weight: 1,
        opacity: 1,
        color: '#35343473',
        fillOpacity: 1
    };
};
//create color ramp for airport_service choropleth map
function getServiceColor(d) {
    return d > 500000  ? '#800026' :
           d > 100000  ? '#BD0026' :
           d > 50000  ? '#FC4E2A' :
           d > 10000 ? '#FD8D3C' :
           d > 0     ? '#f8cb04ff' :
                       '#35343473' ;
};
//create function that applies the color ramp to symbolize polygons based on total airport_service area
function serviceStyle(feature) {
    return {
        fillColor: getServiceColor(feature.properties.airport_service),
        weight: .5,
        color: '#35343473',
        fillOpacity: 1
    };
};
let selectedLayer = null;

///////////////////  Add click listener for the layers ///////////////////

function onEachFeature(feature, layer, type = "count") {

    layer.on({
        click: function(e) {

            layer.setStyle({
                weight: 3,
                color: '#000'
            });

            let value;
            if (type === "count") {
                value = feature.properties.airport_count;
            } else if (type === "service") {
                value = feature.properties.airport_service.toFixed(3);
            }

            layer.bindPopup(
                "<b>" + feature.properties.name + "</b><br>" +
                (type === "service" ? "Airport Service area (sq. km): " : "Airports: ") + value
            ).openPopup();
        }
    });
}

///////////Create proportional symbols for state area layer///////////////

function createProportionalSymbols(centroids) {
    return L.geoJSON(centroids, {
        pointToLayer: function (feature, latlng) {
            
            if (feature.properties.airport_count === 0) {
                return null;
            }
            // Scale symbol by area
            let radius = feature.properties.airport_count * 3;

            return L.circleMarker(latlng, {
                radius: radius,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                fillOpacity: 0.6
            }).bindPopup(
                `<strong>${feature.properties.name}</strong><br>
                 Airports: ${feature.properties.airport_count.toFixed(0)}`
            );
        }
    });
}

/////////////// Create the Legends for each layer //////////////////

// Legend for Airport Count choropleth
function getCountLegendHTML() {
    return `
        <h4>Airport Count</h4>
        <i style="background:#35343473"></i> 0<br>
        <i style="background:#ffeda0"></i> 1 - 2<br>
        <i style="background:#Fd8d3c"></i> 3 - 5<br>
        <i style="background:#fc4e2a"></i> 6 - 8<br>
        <i style="background:#BD0026"></i> 9 - 11<br>
        <i style="background:#800026"></i> 12+<br>
    `;
}

// Legend for Airport Service Area choropleth
function getServiceLegendHTML() {
    return `
        <h4>Average Area Serviced per Airport (sq km)</h4>
        <i style="background:35343473"></i>    0<br>
        <i style="background:#f8cb04ff"></i> >= 1<br>
        <i style="background:#FD8D3C"></i> >= 10000<br>
        <i style="background:#FC4E2A"></i> >= 50000<br>
        <i style="background:#BD0026"></i> >= 100000<br>
        <i style="background:#800026"></i> >= 500000<br>
    `;
}

// Legend for Proportional Symbols
function getSymbolLegendHTML() {
    return `
        <h4>Airport Count</h4>
        <svg width="100" height="80">

        //Largest circle (goes in back)
        <circle cx="40" cy="41" r="36" fill="#ff7800" stroke="#000"></circle>

        <circle cx="40" cy="50" r="27" fill="#ff7800" stroke="#000"></circle>

        <circle cx="40" cy="60" r="18" fill="#ff7800" stroke="#000"></circle>

        <circle cx="40" cy="69" r="9" fill="#ff7800" stroke="#000"></circle>

        // Smallest circle (front)
        <circle cx="40" cy="75" r="3" fill="#ff7800" stroke="#000"></circle>

        //Labels
        <text x="78" y="9" font-size="12" font-weight="bold">13</text>   //top label
        <text x="78" y="77" font-size="12" font-weight="bold">1</text>   //bottom label

</svg>
    `;
}

getData();
// function onEachFeature(feature, layer) {

//     layer.on({
//         click: function(e) {
          
//             layer.setStyle({
//                 weight: 3,
//                 color: '#000'
//             });
//             let value;
//             if (type === "count") {
//                 value = feature.properties.airport_count;
//             } else if (type === "density") {
//                 value = feature.properties.airport_density.toFixed(3);
//             }
//             layer.bindPopup(
//                 "<b>" + feature.properties.name + "</b><br>" +
//                 "Airports: " + feature.properties.airport_count
//             ).openPopup();
//         }
//     });

// }











// function ptsWithin(data) {
//       var points = turf.points(fetch('data/airports.geojson'));
//       var searchWithin = turf.polygons(data);
//       var airportCount = turf.pointsWithinPolygon(points, searchWithin);
//     return airportCount
// }
// function countPoints(){
//       L.geoJSON(data, {
//               ptsWithin,
//               onEachFeature: onEachFeature
// }.addTo(map))};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Creates the popup on click

// fetch('data/airports.geojson')
//           .then(response => response.json())
//           .then(data => {
//               console.log(data);
//             // L.geoJSON(data).addTo(map);
//               createSymbols(data).addTo(map);
//           }).catch(error => console.error('Airports Error: ', error));  
// fetch('data/ne_10m_admin_1_states_provinces.json')
//           .then(response => response.json())
//           .then(data => {
//               console.log(data)
//             // countPoints(data);
//               L.geoJSON(data).addTo(map);
//               // onEachFeature: onEachFeature;
//           }).catch(error => console.error('States Error: ', error));

// function onEachFeature(feature, layer) {
//       layer.bindPopup("<p> There are " + feature.properties.airport_count + "</b> airports in " + feature.properties.name + "</p>");
    // if (feature.properties) {

        // var popupContent =
        //     "<p> There are " + feature.properties.airport_count + "</b> airports in " + feature.properties.name + "</p>";

        // layer.bindPopup(popupContent);
    // }
// };
// var polygon = turf.polygon('data/ne_10m_admin_1_states_provinces.json');
// var pts = turf.point('data/airports.geojson', {
//     "fill": "#6BC65F",
//     "stroke": "#6BC65F",
//     “stroke-width”: 5,
// “title”:”Polygon”,
// “description”:”A sample polygon”
// });

//create symbology for airports
// function createSymbols(data) {

//     L.geoJSON(data, {
//         pointToLayer: function(feature, latlng) {
//             return L.circleMarker(latlng, {
//                 radius: 6,
//                 fillColor: "#ff7800",
//                 color: "#000",
//                 weight: 1,
//                 opacity: 1,
//                 fillOpacity: 0.8
//             });
//         }
//     }).addTo(map);
// }
//Add the json files to the map
// function getData() {
//       fetch('data/airports.geojson')
//           .then(response => response.json())
//           .then(data => {
//               console.log(data);
//             // L.geoJSON(data).addTo(map);
//               createSymbols(data).addTo(map);
//           }).catch(error => console.error('Airports Error: ', error));  
//       fetch('data/ne_10m_admin_1_states_provinces.json')
//           .then(response => response.json())
//           .then(data => {
//               console.log(data)
//             // countPoints(data);
//               L.geoJSON(data).addTo(map);
//               // onEachFeature: onEachFeature;
//           }).catch(error => console.error('States Error: ', error));
// };

//     ]).then(([airports,states]) => {
//         states.features.forEach(function(state) {
//           let polygon = turf.feature(state.geometry);
//           let ptsWithin = turf.pointsWithinPolygon(airports, polygon);
//           console.log(state.properties.name, ptsWithin.features.length);
//           state.properties.airport_count = ptsWithin.features.length;
// });
  // L.geoJSON(states, {
  //     onEachFeature:onEachFeature,
  //     style: {
  //       color: "#555",
  //       weight: 1,
  //       fillOpacity: 0.3
  //     }
  // }).addTo(map);
  // createSymbols(airports);


// });

// state.properties.airport_service = state.properties.area_sqkm/state.properties.airport_count;
        // const centroidFeature = states.features.map(states =>{///new
        //     const centroid = turf.centroid(states);////new
        //     centroid.properties = {///new
        //         ...state.properties.area_sqkm,///new
        //         point_count:count///new
        //     };
        //     return centroid;///new
        // });
        // const centroidCollection = turf.featureCollection(centroidFeature);// new
        // var lat = centroid.geometry.coordinates[1];
        // var lon = centroid.geometry.coordinates[0];
        // L.marker([lat, lon])
        //     .addTo(map)
        //     .bindPopup(state.properties.name + " centroid");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////