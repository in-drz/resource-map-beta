'use strict';

// eslint-disable-next-line no-unused-vars
const config = {
  style: 'mapbox://styles/mapbox/light-v11',
  accessToken:
    'pk.eyJ1IjoiaW4tZHJ6IiwiYSI6ImNsYWZ3NzdkczBtcmMzb28xaG95NGY1NDEifQ.Tat9_7mZSMKUOx4dfm9GhA',
  CSV: 'https://docs.google.com/spreadsheets/d/1dZPNr8u9DMW41r79DN0y6tntrSjwlxWBcsTZK027HRw/gviz/tq?tqx=out:csv&sheet=fridge_list',
  center: [-118.254643, 34.049157],
  zoom: 10,
  title: 'Community Fridges + Pantries',
  description:
    'This is a tool to find resources in Los Angeles and the surrounding areas. You can find the nearest food pantries, fridges, or shelters with just a few clicks',
  sideBarInfo: ['Location_Name', 'Address', 'Description', 'Hours'],
  popupInfo: ['Location_Name'],
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
