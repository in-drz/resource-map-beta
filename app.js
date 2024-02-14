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
    csv2geojson.csv2geojson(
      csvData,
      {
        latfield: 'Latitude',
        lonfield: 'Longitude',
        delimiter: ',',
      },
      (err, data) => {
        if (err) {
          console.error('Error converting CSV to GeoJSON:', err);
          displayErrorMessage('Error converting CSV to GeoJSON.');
          return;
        }

        // Filter out features with empty latitude or longitude values
        data.features = data.features.filter(feature => {
          const latitude = feature.geometry.coordinates[1];
          const longitude = feature.geometry.coordinates[0];
          return latitude !== undefined && longitude !== undefined;
        });

        // Add unique IDs to GeoJSON features
        data.features.forEach((feature, i) => {
          feature.properties.id = i;
        });

        geojsonData = data;

        // Add the GeoJSON layer to the map
        addGeoJSONLayer();
      }
    );
  }

  // Function to display error message
  function displayErrorMessage(message) {
    // You can implement how you want to display the error message to the user
    alert(message);
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


// Function to toggle sidebar visibility
$('#menu-toggle').on('click', function(e) {
  e.preventDefault();
  $('#wrapper').toggleClass('toggled');
});
