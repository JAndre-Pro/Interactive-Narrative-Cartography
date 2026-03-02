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

fetch('data/airports.geojson')
    .then(response => response.json())
    .then(data => {
        // var vorP = turf.voronoi(data);
        L.geoJSON(data).addTo(map);
        //console.log(data);
    }).catch(error => console.error('Error: ', error));