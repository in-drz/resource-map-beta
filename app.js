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

  // Populate the CSV dropdown
  populateCsvDropdown();

  // Function to populate the CSV dropdown
  function populateCsvDropdown() {
    const dropdown = document.getElementById('csvDropdown');
    Object.keys(config).forEach(key => {
      if (key.startsWith('CSV')) { // Check if the key starts with 'CSV'
        const option = document.createElement('option');
        option.value = config[key];
        option.textContent = key;
        dropdown.appendChild(option);
      }
    });
  }

  // Event listener for CSV dropdown change
  document.getElementById('csvDropdown').addEventListener('change', function() {
    const selectedCsv = this.value;
    loadCsv(selectedCsv);
  });

  // Function to load CSV data
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
        displayErrorMessage('Error loading CSV. Please try again.');
      }
    });
  }

  // Function to make GeoJSON from CSV data
  function makeGeoJSON(csvData) {
    // Split the CSV data into rows
    const rows = csvData.split('\n');

    // Initialize an array to store GeoJSON features
    const features = [];

    // Iterate over each row of the CSV data
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Split the row into columns
        const columns = row.split(',');

        // Check if the row has at least two columns and latitude and longitude are not empty or undefined
        if (columns.length >= 2 && columns[13]?.trim() !== '' && columns[14]?.trim() !== '') {
            // Parse latitude and longitude values
            const latitude = parseFloat(columns[13].trim());
            const longitude = parseFloat(columns[14].trim());

            // Check if latitude and longitude values are valid numbers
            if (!isNaN(latitude) && !isNaN(longitude)) {
                // Create a GeoJSON feature
                const feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude], // longitude, latitude
                    },
                    properties: {
                        id: i,
                    },
                };

                // Add the feature to the array
                features.push(feature);
            }
        }
    }

    // Create a GeoJSON object from the features
    geojsonData = {
        type: 'FeatureCollection',
        features: features,
    };

    // Add the GeoJSON layer to the map
    addGeoJSONLayer();
}


  // Function to add GeoJSON layer to the map
  function addGeoJSONLayer() {
    // Check if the layer already exists and remove it before adding a new one
    if (map.getLayer('locationData')) {
      map.removeLayer('locationData');
    }

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

    // Set up event listeners for interacting with the map data
    setMapEventListeners();
  }

  // Function to set up event listeners for interacting with the map data
  function setMapEventListeners() {
    // Event listener for clicking on map features
    map.on('click', 'locationData', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['locationData'],
      });
      if (!features.length) {
        return;
      }
      const clickedPoint = features[0].geometry.coordinates;
      flyToLocation(clickedPoint);
      createPopup(features[0]);
      const activeListing = document.getElementById(
        'listing-' + features[0].properties.id
      );
      $(activeListing).addClass('active');
      $(activeListing).siblings().removeClass('active');
    });

    // Event listeners for mouseenter and mouseleave on map features
    map.on('mouseenter', 'locationData', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'locationData', () => {
      map.getCanvas().style.cursor = '';
    });

    // Build location list from GeoJSON data
    buildLocationList(geojsonData);
  }

  // Function to build the location list
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

        for (let i = 0; i < locationData.features.length; i++) {
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
          'https://tile.openweathermap.org/map/radar_new/{z}/{x}/{y}.png?appid=YOUR_OPENWEATHERMAP_API_KEY',
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
