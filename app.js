/* global config csv2geojson turf Assembly $ mapboxgl */

'use strict';

mapboxgl.accessToken = config.accessToken;
const columnHeaders = config.sideBarInfo;
let geojsonData = {}; // Define geojsonData as a global variable

function transformRequest(url) {
  const isMapboxRequest =
    url.slice(8, 22) === 'api.mapbox.com' ||
    url.slice(10, 26) === 'tiles.mapbox.com';
  return {
    url: isMapboxRequest ? url.replace('?', '?pluginName=finder&') : url,
  };
}

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

const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  marker: true,
  zoom: 11,
});

function sortByDistance(selectedPoint) {
  const options = { units: 'miles' };
  let data;
  if (filteredGeojson && filteredGeojson.features.length > 0) {
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
  // Add Mapbox geocoder control
  map.addControl(geocoder, 'top-right');
  console.log('Map loaded');

  function toggleCsvLayer(csvFilePath, layerId) {
      if (map.getLayer(layerId)) {
          // If the layer exists, remove it
          map.removeLayer(layerId);
          map.removeSource(layerId);
      } else {
          // If the layer doesn't exist, load it
          makeGeoJSON(csvFilePath, function(geojsonData) {
              map.addSource(layerId, {
                  type: 'geojson',
                  data: geojsonData
              });

              map.addLayer({
                  id: layerId,
                  type: 'circle',
                  source: layerId,
                  paint: {
                      'circle-radius': 5,
                      'circle-color': '#3D2E5D', // Different colors for different layers
                      'circle-stroke-color': 'white',
                      'circle-stroke-width': 1,
                      'circle-opacity': 0.7
                  }
              });
          });
      }
  }

  // Function to populate the CSV dropdown
  function populateCsvCheckboxes() {
      const container = document.getElementById('csvCheckboxList');
      if (!container) {
          console.error("csvCheckboxList container not found");
          return;
      }

      Object.keys(config).forEach((key) => {
          if (key.startsWith('CSV')) {
              // Create checkbox element
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.id = key; // Use the key as the ID
              checkbox.value = config[key]; // Use the value from config

              // Create label element
              const label = document.createElement('label');
              label.htmlFor = key;
              label.textContent = key; // Or any other title you want to display

              // Append checkbox and label to the container
              container.appendChild(checkbox);
              container.appendChild(label);

              // Add event listener to the checkbox
              checkbox.addEventListener('change', function() {
                  toggleCsvLayer(this.value, key);
              });
          }
      });
  }


  // Call this function when initializing your application
  document.addEventListener('DOMContentLoaded', function() {
      populateCsvCheckboxes();
  });
  
  // Event listener for CSV dropdown change
  document.getElementById('csvDropdown').addEventListener('change', function() {
    const selectedCsv = this.value;
    loadCsv(selectedCsv);
  });

  // Function to make GeoJSON from CSV data
  function makeGeoJSON(currentCSV, callback) {
      $.ajax({
          type: 'GET',
          url: currentCSV,
          dataType: 'text',
          success: function(csvData) {
              // Parse CSV data manually first
              const parsedCsv = Papa.parse(csvData, {
                  header: true,
                  skipEmptyLines: true
              });

              // Filter out entries with blank latitudes or longitudes
              const filteredCsvData = parsedCsv.data.filter(function(row) {
                  return row.Latitude && row.Longitude;
              });

              // Convert to CSV string format again
              const filteredCsvString = Papa.unparse(filteredCsvData);

              // Convert filtered CSV string to GeoJSON
              csv2geojson.csv2geojson(
                  filteredCsvString,
                  {
                      latfield: 'Latitude',
                      lonfield: 'Longitude',
                      delimiter: ','
                  },
                  function(err, data) {
                      if (err) {
                          console.error('Error converting CSV to GeoJSON:', err);
                          return;
                      }

                      data.features.forEach(function(feature, i) {
                          feature.properties.id = i;
                      });

                      geojsonData = data;

                      // Remove existing layer/source if they exist
                      if (map.getLayer('locationData')) {
                          map.removeLayer('locationData');
                      }
                      if (map.getSource('locationData')) {
                          map.removeSource('locationData');
                      }

                      // Add source and layer to the map
                      map.addSource('locationData', {
                          type: 'geojson',
                          data: geojsonData
                      });

                      map.addLayer({
                          id: 'locationData',
                          type: 'circle',
                          source: 'locationData',
                          paint: {
                              'circle-radius': 5,
                              'circle-color': '#3D2E5D',
                              'circle-stroke-color': 'white',
                              'circle-stroke-width': 1,
                              'circle-opacity': 0.7
                          }
                      });

                      // Additional map event listeners can be added here
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

                      // Callback function to execute after geoJSON is ready
                      if (callback) {
                          callback();
                      }
                  }
              );
          },
          error: function(request, status, error) {
              console.error('Error loading CSV:', error);
              displayErrorMessage('Error loading CSV. Please try again.');
          }
      });
  }


  // Function to load CSV data
  function loadCsv(csvPath) {
    makeGeoJSON(csvPath, function() {
      // Call buildLocationList after GeoJSON data is ready
      buildLocationList(geojsonData);
    });
  }


  function buildLocationList(locationData) {
    const listings = document.getElementById('listings');
    listings.innerHTML = '';

    // Check if locationData.features is defined and is an array
    if (locationData && Array.isArray(locationData.features)) {
      locationData.features.forEach((location, i) => {
        const prop = location.properties;

        const listing = listings.appendChild(document.createElement('div'));
        listing.id = 'listing-' + prop.id;
        listing.className = 'item';

        const link = listing.appendChild(document.createElement('button'));
        link.className = 'title';
        link.id = 'link-' + prop.id;
        link.innerHTML = '<p style="line-height: 1.25">' + prop[columnHeaders[0]] + '</p>';

        const details = listing.appendChild(document.createElement('div'));
        details.className = 'content';

        for (let j = 1; j < columnHeaders.length; j++) {
          const div = document.createElement('div');
          div.innerText += prop[columnHeaders[j]];
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
          for (let k = 0; k < divCount; k++) {
            divList[k].style.maxHeight = null;
          }

          this.parentNode.classList.toggle('active');
          const content = this.nextElementSibling;
          if (content.style.maxHeight) {
            content.style.maxHeight = null;
          } else {
            content.style.maxHeight = content.scrollHeight + 'px';
          }
        });
      });
    } else {
      console.error('Invalid or empty GeoJSON data');
      // Handle the scenario of invalid or empty data here
    }
  }

  // Add event listeners for sidebar toggle arrows
  document.getElementById('toggleLeft').addEventListener('click', function () {
    document.getElementById('sidebarB').classList.add('collapsed');
  });

  document.getElementById('toggleRight').addEventListener('click', function () {
    document.getElementById('sidebarB').classList.remove('collapsed');
  });

  // Load the default CSV
  loadCsv(config.CSV1);
});

// Function to display error message
function displayErrorMessage(message) {
  // You can implement how you want to display the error message to the user
  alert(message);
}

// Function to toggle sidebar visibility
$('#menu-toggle').on('click', function(e) {
  e.preventDefault();
  $('#wrapper').toggleClass('toggled');
});

// Event listener for weather toggle checkbox
document.getElementById('weatherToggle').addEventListener('change', function() {
  const radarLayerId = 'weather-radar';
  if (this.checked) {
    // Add radar layer to the map
    map.addLayer({
      id: radarLayerId,
      type: 'raster',
      source: {
        type: 'raster',
        tiles: [
          'https://api.openweathermap.org/data/3.0/onecall?lat=34.049157&lon=-118.254643&exclude={part}&appid=13b7a33f1b10f254853164c4b2d67c71',
        ],
        tileSize: 256,
      },
      minzoom: 1,
      maxzoom: 19,
    });
  } else {
    // Remove radar layer from the map
    if (map.getLayer(radarLayerId)) {
      map.removeLayer(radarLayerId);
    }
  }
});
