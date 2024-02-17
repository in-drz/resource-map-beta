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

  function toggleCsvLayer() {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
          const csvFilePath = checkbox.value;
          const layerId = checkbox.id.replace('layer-', ''); // Extract layerId from checkbox ID
          const uniqueLayerId = layerId + new Date().getTime(); // Ensure unique layer ID

          if (checkbox.checked && !activeLayers.includes(uniqueLayerId)) {
              addCsvLayer(csvFilePath, uniqueLayerId); // Add layer if checked and not already added
              activeLayers.push(uniqueLayerId); // Keep track of active layers
          } else if (!checkbox.checked && activeLayers.includes(uniqueLayerId)) {
              removeLayer(uniqueLayerId); // Remove layer if unchecked
              const index = activeLayers.indexOf(uniqueLayerId);
              if (index > -1) {
                  activeLayers.splice(index, 1); // Remove from active layers tracking
              }
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
  }


  function addCsvLayer(csvFilePath, layerId) {
      // Ensure layerId is unique to avoid conflicts
      const uniqueLayerId = layerId + new Date().getTime();

      // Load GeoJSON data from CSV file
      makeGeoJSON(csvFilePath, function(geojsonData) {
          // Add source for the layer
          map.addSource(uniqueLayerId, {
              type: 'geojson',
              data: geojsonData
          });

          // Get circleColor from layerIdColorMap or default to '#3D2E5D'
          const circleColor = layerIdColorMap[layerId] || '#3D2E5D';

          // Add layer to the map
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

          // Add the new layer ID to the list of active layers
          activeLayers.push(uniqueLayerId);
      });
  }


  // Function to remove all active layers from the map
  function removeAllLayers() {
      activeLayers.forEach(layerId => {
          map.removeLayer(layerId);
          map.removeSource(layerId);
      });
      activeLayers.length = 0; // Clear the array
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
        checkbox.addEventListener('change', toggleCsvLayer);
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


  function buildLocationList(locationData) {
      const listings = document.getElementById('listings');
      if (!listings) {
          console.error('Listings element not found in the DOM');
          return;
      }
      listings.innerHTML = '';

      // Ensure locationData.features is properly structured
      if (!locationData || !locationData.features || !Array.isArray(locationData.features)) {
          console.error('Invalid or empty GeoJSON data');
          return;
      }

      locationData.features.forEach((location, i) => {
          const prop = location.properties;
          if (!prop) {
              console.error('No properties found in feature', location);
              return;
          }

          // Assuming columnHeaders is defined globally; validate its existence
          if (!window.columnHeaders || !Array.isArray(window.columnHeaders)) {
              console.error('columnHeaders is undefined or not an array');
              return;
          }

          const listing = document.createElement('div');
          listing.id = 'listing-' + i; // Changed from prop.id to i for simplicity
          listing.className = 'item';

          const link = document.createElement('button');
          link.className = 'title';
          link.id = 'link-' + i; // Changed from prop.id to i for consistency
          link.innerHTML = '<p style="line-height: 1.25">' + prop[columnHeaders[0]] + '</p>';

          const details = document.createElement('div');
          details.className = 'content';

          for (let j = 1; j < columnHeaders.length; j++) {
              if (prop[columnHeaders[j]] === undefined) {
                  console.warn('Property not found:', columnHeaders[j]);
                  continue;
              }
              const div = document.createElement('div');
              div.innerText = prop[columnHeaders[j]];
              details.appendChild(div);
          }

          link.addEventListener('click', function () {
              // Implementation of flyToLocation, createPopup, etc., should be validated
              const clickedListing = location.geometry.coordinates;
              flyToLocation(clickedListing);
              createPopup(location);

              // Simplified active item handling
              const activeItem = document.querySelector('.item.active');
              if (activeItem) {
                  activeItem.classList.remove('active');
              }
              this.parentNode.classList.add('active');

              // Toggle content visibility
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
