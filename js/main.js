const map = L.map('map').setView([36, -94], 4.1);

L.tileLayer('https://api.mapbox.com/styles/v1/jandre-pro/cmlwyuil3000401sm8dnye6eg/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiamFuZHJlLXBybyIsImEiOiJjbWxmaTFsOTIwMjY5M2VvaWIzbWgyb3F2In0.6E3iTTICdzYRJcjiQGGCMQ', {
        maxZoom: 19,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                     '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                     'Imagery © <a href="http://mapbox.com">Mapbox</a>',
}).addTo(map);
var logo = L.control({position: 'bottomleft'});

logo.onAdd = function(map) {
  var div = L.DomUtil.create('div', 'mapbox-logo');
  div.innerHTML = '<img src="img/mapbox-logo-white.png" width="100"/>';
  return div;
};
logo.addTo(map);


// make airport data accessible to polygons
let airportData;   // global variable

// Load Airport data
fetch('data/airports.geojson')
  .then(response => response.json())
  .then(data => {
      console.log(data);
      airportData = data;   // define airport data for turf analysis
      // createSymbols(data).addTo(map);  // Turn on to see symbols on the map
  }).catch(error => console.error('Airports Error: ', error)); //prints error if something fails

// Load State data
fetch('data/ne_10m_admin_1_states_provinces.json')
  .then(response => response.json())
  .then(data => {
      console.log(data);
      // Run Turf count before adding to map
      addAirportCounts(data, airportData);

      let countLayer = L.geoJSON(data, {
          style: countStyle,
          onEachFeature: (feature, layer) => onEachFeature(feature, layer, "count")
      });

      let serviceLayer = L.geoJSON(data, {
          style: serviceStyle,
          onEachFeature: (feature, layer) => onEachFeature(feature, layer, "service")
      });

      // let symbolLayer = createProportionalSymbols(data);
      countLayer.addTo(map);

      L.control.layers(
          {
              "Airport Count": countLayer,
              "Average Airport Service Area": serviceLayer,
              // "Proportional Symbols": symbolLayer
          }
      ).addTo(map);

  })
  .catch(error => console.error('States Error: ', error));


// Turf Function to count airports and add new attribute to each polygon
function addAirportCounts(states, airports) {

    const airportPoints = turf.featureCollection(airports.features);

    states.features.forEach(state => {

        const pointsWithin = turf.pointsWithinPolygon(
            airportPoints,
            state
        );

        state.properties.airport_count = pointsWithin.features.length;//adds attribute airport_counts
        state.properties.area_sqkm = turf.area(state) / 1000000;
        // normalize by service area =  square km/ airport count
        if (state.properties.airport_count > 0) {
                state.properties.airport_service = state.properties.area_sqkm / state.properties.airport_count;
        } else {
                state.properties.airport_service = 0; 
        }
        // state.properties.area_sqkm = turf.area(state) / 1000000;
        // state.properties.airport_service = state.properties.area_sqkm/state.properties.airport_count;
      });
}

///////////////     CREATE MAP STYLES     ///////////////////
//create color ramp for airport_count choropleth map
function getColor(d) {
    return d > 100 ? '#800026' :
           d > 50  ? '#BD0026' :
           d > 20  ? '#E31A1C' :
           d > 10  ? '#FC4E2A' :
           d > 0   ? '#FD8D3C' :
                     '#FFEDA0' ;
}
//create function that applies the color ramp to symbolize polygons based on total airport_count
function countStyle(feature) {
    return {
        fillColor: getColor(feature.properties.airport_count),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}
//create color ramp for airport_service choropleth map
function getServiceColor(d) {
    return d > 500000  ? '#800026' :
           d > 100000  ? '#BD0026' :
           d > 50000  ? '#E31A1C' :
           d > 10000 ? '#FC4E2A' :
           d > 0     ? '#FD8D3C' :
                       '#FFEDA0' ;
}
//create function that applies the color ramp to symbolize polygons based on total airport_service area
function serviceStyle(feature) {
    return {
        fillColor: getServiceColor(feature.properties.airport_service),
        weight: 1,
        color: "white",
        fillOpacity: 0.7
    };
}
let selectedLayer = null;

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
                (type === "service" ? "Airport Service area in sq. km: " : "Airports: ") + value
            ).openPopup();
        }
    });
}
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
function createSymbols(data) {

    L.geoJSON(data, {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
    }).addTo(map);
}
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

getData();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////