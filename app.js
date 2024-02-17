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

  // Define a mapping between layerId and colors
  const activeLayers = []; // Maintain a list of active layer IDs

  const layerIdColorMap = {
      'CSV1': '#3D2E5D',
      'CSV2': '#009688',
      'CSV3': '#FF5722',
      'CSV4': '#FFC107',
      'CSV5': '#2196F3'
  };


  // Track checked checkboxes
  const checkedCheckboxes = {};

  // Function to toggle CSV layer
  function toggleCsvLayer() {
      removeAllLayers(); // Remove all existing layers
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
          checkedCheckboxes[checkbox.value] = checkbox.checked;
          if (checkbox.checked) {
              const csvFilePath = checkbox.value;
              const layerId = checkbox.id.replace('layer-', ''); // Extract layerId from checkbox ID
              addCsvLayer(csvFilePath, layerId);
          }
      });
      // Rebuild location list based on checked checkboxes
      buildLocationList();
  }

  function attachCheckboxEventListeners() {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
          checkbox.addEventListener('change', function() {
              toggleCsvLayer();
          });
      });
  }

  function addCsvLayer(csvFilePath, layerId, callback) {
      const uniqueLayerId = layerId + new Date().getTime();

      // Check if the layer is already added
      if (activeLayers.includes(uniqueLayerId)) {
          console.log("Layer already added: ", uniqueLayerId);
          return; // If already added, don't add it again
      }

      makeGeoJSON(csvFilePath, function(geojsonData) {
          map.addSource(uniqueLayerId, {
              type: 'geojson',
              data: geojsonData
          });

          const circleColor = layerIdColorMap[layerId] || '#3D2E5D';

          map.addLayer({
              id: uniqueLayerId,
              type: 'circle',
              source: uniqueLayerId,
              paint: {
                  'circle-radius': 5,
                  'circle-color': circleColor,
                  'circle-stroke-color': 'white',
                  'circle-stroke-width': 1,
                  'circle-opacity': 0.7
              }
          });

          // Add the unique layer ID to the list of active layers only if it's not already there
          if (!activeLayers.includes(uniqueLayerId)) {
              activeLayers.push(uniqueLayerId);
          }

          // Call the callback function if it's provided
          if (callback && typeof callback === 'function') {
              callback(geojsonData);
          }
      });
  }


  function removeLayer(layerId) {
      if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
      }
      if (map.getSource(layerId)) {
          map.removeSource(layerId);
      }
      const index = activeLayers.indexOf(layerId);
      if (index > -1) {
          activeLayers.splice(index, 1);
      }
  }



  // Function to populate the CSV dropdown
  function populateCsvCheckboxes() {
      console.log("Populating CSV Checkboxes");
      const container = document.getElementById('csvCheckboxList');
      if (!container) {
          console.error("Container not found");
          return;
      }
      console.log("Container found:", container);
      console.log("Config object:", config);
      Object.keys(config).forEach((key) => {
          if (key.startsWith('CSV')) {
              const csvConfig = config[key];
              console.log("Adding checkbox for:", csvConfig.label);
              // Create unique source ID by appending key to 'source'
              const uniqueSourceId = 'source-' + key;
              // Create unique layer ID by appending key to 'layer'
              const uniqueLayerId = 'layer-' + key;

              // Create checkbox element
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.id = uniqueLayerId; // Use the unique layer ID
              checkbox.value = csvConfig.url;

              // Create label element
              const label = document.createElement('label');
              label.htmlFor = uniqueLayerId;
              label.textContent = csvConfig.label;

              // Append checkbox and label to the container
              container.appendChild(checkbox);
              container.appendChild(label);

              // Add event listener to the checkbox
              attachCheckboxEventListeners();
          }
      });
  }

  function attachCheckboxEventListeners() {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
          checkbox.addEventListener('change', function() {
              const csvFilePath = this.value; // Get the file path from the checkbox value
              const layerId = this.id.replace('layer-', '');

              if (this.checked) {
                  loadCsv(csvFilePath); // Call loadCsv with the path of the checked CSV
              } else {
                  // Logic for when a checkbox is unchecked
                  const layerIndex = activeLayers.findIndex(id => id.startsWith(layerId));
                  if (layerIndex > -1) {
                      const uniqueLayerId = activeLayers[layerIndex];
                      removeLayer(uniqueLayerId);
                      activeLayers.splice(layerIndex, 1);
                  }
              }
          });
      });
  }


  // Call this function when initializing your application
  populateCsvCheckboxes();

  // Event listener for CSV dropdown change
/*  document.getElementById('csvDropdown').addEventListener('change', function() {
    const selectedCsv = this.value;
    loadCsv(selectedCsv);
  }); */

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
                  return row.Latitude !== '' && row.Longitude !== '';
              });

              // Check if any valid data is present
              if (filteredCsvData.length === 0) {
                  console.error('No valid data found in CSV');
                  displayErrorMessage('No valid data found in CSV');
                  return;
              }

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
                          displayErrorMessage('Error converting CSV to GeoJSON. Please try again.');
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
              console.error('Error loading CSV - Request:', request);
              console.error('Error loading CSV - Status:', status);
              console.error('Error loading CSV - Error:', error);
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

  // Function to build location list based on checked checkboxes
  function buildLocationList() {
      const listings = document.getElementById('listings');
      if (!listings) {
          console.error('Listings element not found in the DOM');
          return;
      }
      listings.innerHTML = '';

      // Ensure locationData.features is properly structured
      if (!geojsonData || !geojsonData.features || !Array.isArray(geojsonData.features)) {
          console.error('Invalid or empty GeoJSON data');
          return;
      }

      // Group GeoJSON features by type
      const groupedFeatures = {};
      geojsonData.features.forEach(feature => {
          const type = feature.properties.type; // Assuming there's a 'type' property for each feature
          if (!groupedFeatures[type]) {
              groupedFeatures[type] = [];
          }
          groupedFeatures[type].push(feature);
      });

      // Iterate over checked checkboxes and build location list
      Object.entries(checkedCheckboxes).forEach(([type, checked]) => {
          if (checked && groupedFeatures[type]) {
              // Add header for type
              const header = document.createElement('h2');
              header.textContent = type;
              listings.appendChild(header);

              // Build location list for features of this type
              groupedFeatures[type].forEach((feature, i) => {
                  const prop = feature.properties;
                  if (!prop) {
                      console.error('No properties found in feature', feature);
                      return;
                  }

                  const listing = document.createElement('div');
                  listing.id = 'listing-' + i;
                  listing.className = 'item';

                  const link = document.createElement('button');
                  link.className = 'title';
                  link.id = 'link-' + i;
                  link.innerHTML = '<p style="line-height: 1.25">' + prop[columnHeaders[0]] + '</p>'; // Example, using 'name' property

                  const details = listing.appendChild(document.createElement('div'));
                  details.className = 'content';

                  for (let i = 1; i < columnHeaders.length; i++) {
                    const div = document.createElement('div');
                    div.innerText += prop[columnHeaders[i]];
                    div.className;
                    details.appendChild(div);
                  }

                  // Here you can add details based on your specific needs

                  link.addEventListener('click', function () {
                      // Implementation of flyToLocation, createPopup, etc., should be validated
                      const clickedListing = feature.geometry.coordinates;
                      flyToLocation(clickedListing);
                      createPopup(feature);

                      const activeItem = document.querySelector('.item.active');
                      if (activeItem) {
                          activeItem.classList.remove('active');
                      }
                      this.parentNode.classList.add('active');

                      const content = this.nextElementSibling;
                      if (content.style.maxHeight) {
                          content.style.maxHeight = null;
                      } else {
                          content.style.maxHeight = content.scrollHeight + 'px';
                      }
                  });

                  listing.appendChild(link);
                  listing.appendChild(details);
                  listings.appendChild(listing);
              });
          }
      });
  }

  // Event listener for checkbox change
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', toggleCsvLayer);
  });

  toggleCsvLayer();

  // Add event listeners for sidebar toggle arrows
  document.getElementById('toggleLeft').addEventListener('click', function () {
    document.getElementById('sidebarB').classList.add('collapsed');
  });

  document.getElementById('toggleRight').addEventListener('click', function () {
    document.getElementById('sidebarB').classList.remove('collapsed');
  });

  // Load the default CSV

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

});
