/* global config csv2geojson turf Assembly $ mapboxgl */

'use strict';

mapboxgl.accessToken = config.accessToken;
const columnHeaders = config.sideBarInfo;
let geojsonData = {}; // Define geojsonData as a global variable

const map = new mapboxgl.Map({
  container: 'map',
  style: config.style,
  center: config.center,
  zoom: config.zoom,
  transformRequest: transformRequest,
});
map.touchZoomRotate.enable();
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserHeading: true
  })
);

function flyToLocation(currentFeature) {
  map.flyTo({
    center: currentFeature,
    zoom: 11,
  });
}

function createPopup(currentFeature) {
  const popups = document.getElementsByClassName('mapboxgl-popup');
  if (popups[0]) popups[0].remove();
  new mapboxgl.Popup({ closeOnClick: true })
    .setLngLat(currentFeature.geometry.coordinates)
    .setHTML('<h3>' + currentFeature.properties[config.popupInfo] + '</h3>' +
             '<p><b>Address:</b> ' + currentFeature.properties.physical_address + '</p>' +
             '<p><b>Phone:</b> ' + currentFeature.properties.phone_number + '</p>' +
             '<p><b>Pick-Up/Drop-Off?</b> ' + currentFeature.properties.pick_up + '</p>' +
             '<p><b>Max Distance Willing to Travel:</b> ' + currentFeature.properties.max_distance + ' mi</p>')
    .addTo(map);
}

function buildLocationList(locationData) {
  const listings = document.getElementById('listings');
  listings.innerHTML = '';
  locationData.features.forEach((location, i) => {
    const prop = location.properties;

    const listing = listings.appendChild(document.createElement('div'));
    listing.id = 'listing-' + prop.id;
    listing.className = 'item';

    const link = listing.appendChild(document.createElement('button'));
    link.className = 'title';
    link.id = 'link-' + prop.id;
    link.innerHTML =
      '<p style="line-height: 1.25">' + prop[columnHeaders[0]] + '</p>';

    const details = listing.appendChild(document.createElement('div'));
    details.className = 'content';

    for (let i = 1; i < columnHeaders.length; i++) {
      const div = document.createElement('div');
      div.innerText += prop[columnHeaders[i]];
      details.appendChild(div);
    }

    link.addEventListener('click', function () {
      const clickedListing = location.geometry.coordinates;
      flyToLocation(clickedListing);
      createPopup(location);

      const activeItem = document.getElementsByClassName('active');
      if (activeItem[0]) {
        activeItem[0].classList.remove('active');
      }
      this.parentNode.classList.add('active');

      const divList = document.querySelectorAll('.content');
      const divCount = divList.length;
      for (let i = 0; i < divCount; i++) {
        divList[i].style.maxHeight = null;
      }

      for (let i = 0; i < geojsonData.features.length; i++) {
        this.parentNode.classList.remove('active');
        this.classList.toggle('active');
        const content = this.nextElementSibling;
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      }
    });
  });
}

const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  marker: true,
  zoom: 11,
});

function sortByDistance(selectedPoint) {
  const options = { units: 'miles' };
  let data;
  if (filteredGeojson.features.length > 0) {
    data = filteredGeojson;
  } else {
    data = geojsonData;
  }
  data.features.forEach((data) => {
    Object.defineProperty(data.properties, 'distance', {
      value: turf.distance(selectedPoint, data.geometry, options),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  data.features.sort((a, b) => {
    if (a.properties.distance > b.properties.distance) {
      return 1;
    }
    if (a.properties.distance < b.properties.distance) {
      return -1;
    }
    return 0;
  });
  const listings = document.getElementById('listings');
  while (listings.firstChild) {
    listings.removeChild(listings.firstChild);
  }
  buildLocationList(data);
}

geocoder.on('result', (ev) => {
  const searchResult = ev.result.geometry;
  sortByDistance(searchResult);
});

map.on('load', () => {
  map.addControl(geocoder, 'top-right');

  // csv2geojson - following the Sheet Mapper tutorial https://www.mapbox.com/impact-tools/sheet-mapper
  console.log('loaded');


  $(document).ready(() => {

    console.log('ready');
    let currentCSV = config.CSV;

    $.ajax({
      type: 'GET',
      url: config.CSV,
      dataType: 'text',
      success: function (csvData) {
        makeGeoJSON(csvData);
      },
      error: function (request, status, error) {
        console.log(request);
        console.log(status);
        console.log(error);
      },
    });
  });


  makeGeoJSON(config.CSV);

  function makeGeoJSON(currentCSV) {
    $.ajax({
      type: 'GET',
      url: currentCSV,
      dataType: 'text',
      success: function (csvData) {
        csv2geojson.csv2geojson(
          csvData,
          {
            latfield: 'Latitude',
            lonfield: 'Longitude',
            delimiter: ',',
          },
          (err, data) => {
            data.features.forEach((data, i) => {
              data.properties.id = i;
            });

            geojsonData = data;

            // Add the layer to the map
            map.addLayer({
              id: 'locationData',
              type: 'circle',
              source: {
                type: 'geojson',
                data: geojsonData,
              },
              paint: {
                'circle-radius': 5, // size of circles
                'circle-color': '#3D2E5D', // color of circles
                'circle-stroke-color': 'white',
                'circle-stroke-width': 1,
                'circle-opacity': 0.7,
              },
            });
          },
        );

        map.on('click', 'locationData', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['locationData'],
          });
          const clickedPoint = features[0].geometry.coordinates;
          flyToLocation(clickedPoint);
          sortByDistance(clickedPoint);
          createPopup(features[0]);
        });

        map.on('mouseenter', 'locationData', () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'locationData', () => {
          map.getCanvas().style.cursor = '';
        });

        buildLocationList(geojsonData);
      },
      error: function (request, status, error) {
        console.log(request);
        console.log(status);
        console.log(error);
      },
    });
  }

});

map.on('load', () => {
  map.addControl(geocoder, 'top-right');
  console.log('loaded');
  makeGeoJSON(config.CSV1); // Load CSV1 when the map is loaded
});

// CSV Dropdown change event
document.getElementById('csvDropdown').addEventListener('change', function() {
  const selectedCsv = this.value;
  loadCsv(selectedCsv);
});

// Load CSV function
function loadCsv(csvPath) {
  $.ajax({
    type: 'GET',
    url: csvPath,
    dataType: 'text',
    success: function(csvData) {
      makeGeoJSON(csvData);
    },
    error: function(request, status, error) {
      console.error('Error loading CSV:', error);
    }
  });
}
