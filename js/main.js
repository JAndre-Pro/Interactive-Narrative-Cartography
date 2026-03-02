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

//Creates the popup on click
function onEachFeature(feature, layer) {

    // if (feature.properties) {

        var popupContent =
            "<p> There are " + feature.properties.airport_count + "</b> airports in " + feature.properties.name + "</p>";

        layer.bindPopup(popupContent);
    // }
};

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
Promise.all([
    fetch('data/airports.geojson').then(res => res.json()),
    fetch('data/ne_10m_admin_1_states_provinces.json').then(res => res.json())
]).then(([airports, states]) => {

    states.features.forEach(function(state) {

        // wrap state geometry as Turf feature
        let polygon = turf.feature(state.geometry);

        // airports is already a FeatureCollection
        let ptsWithin = turf.pointsWithinPolygon(airports, polygon);

        state.properties.airport_count = ptsWithin.features.length;
    });

});
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