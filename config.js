'use strict';

// eslint-disable-next-line no-unused-vars
const config = {
  style: 'mapbox://styles/mapbox/light-v11',
  accessToken:
    'pk.eyJ1IjoiaW4tZHJ6IiwiYSI6ImNsZXhxdWNmOTFxZDQzdnFvYmRhdHl0czQifQ.fJZWF9JhBmdx-DbEY4deow',
  CSV: 'https://docs.google.com/spreadsheets/d/1YvbSE3Lg-osHDwpM3_wCIdLEBk2riEFbu7j2Il1xogc/gviz/tq?tqx=out:csv&sheet=resource_responders'
  // Second CSV layer
  center: [-118.254643, 34.049157],
  zoom: 10,
  
   // CSV configuration options
  CSVs: {
    resource_responders: {
      url:
        'https://docs.google.com/spreadsheets/d/1YvbSE3Lg-osHDwpM3_wCIdLEBk2riEFbu7j2Il1xogc/gviz/tq?tqx=out:csv&sheet=resource_responders',
      latColumn: 'latitude',
      lonColumn: 'longitude',
      markerColor: '#3FB1CE',
      markerRadius: 8,
      markerType: 'circle',
      visible: true,
    },
    donations: {
      url:
        'https://docs.google.com/spreadsheets/d/1qE-SgwW8JcZpPnZw57n19Yi-EW_zPmL07X2ySGeB85c/gviz/tq?tqx=out:csv&sheet=bag_donations',
      latColumn: 'latitude',
      lonColumn: 'longitude',
      markerColor: '#ED4D5D',
      markerRadius: 8,
      markerType: 'circle',
      visible: false,
    },
  },
  
  // Initial active CSV
  activeCSV: 'resource_responders',

  title: 'Resource Maps',
  description:
    'This is a tool to find resources in Los Angeles and the surrounding areas. You can find the nearest food pantries, fridges, or shelters with just a few clicks',
  sideBarInfo: ['full_name', 'email_address', 'physical_address'],
  popupInfo: ['full_name'],
  filters: [
    {
      type: 'dropdown',
      title: 'Languages supported: ',
      columnHeader: 'Languages',
      listItems: [
        'Amharic',
        'ASL',
        'Cambodian',
        'Chinese',
        'Danish',
        'English',
        'French',
        'German',
        'Greek',
        'Hindi',
        'Italian',
        'Japanese',
        'Korean',
        'Language Line Services',
        'Norwegian',
        'Oriya',
        'Portuguese',
        'Punjabi',
        'Russian',
        'Somali',
        'Spanish',
        'Swedish',
        'Tagalog',
        'Thai',
        'Tigrinya',
        'Tongan',
        'Vietnamese',
        'Ukranian',
      ],
    },
    {
      type: 'checkbox',
      title: 'Devices available: ',
      columnHeader: 'Devices_available', // Case sensitive - must match spreadsheet entry
      listItems: ['Computer', 'Wi-Fi', 'Adaptive Laptops'], // Case sensitive - must match spreadsheet entry; This will take up to six inputs but is best used with a maximum of three;
    },
    {
      type: 'dropdown',
      title: 'Clients: ',
      columnHeader: 'Clients',
      listItems: [
        'Adults',
      ],
    },
  ],
 
};
