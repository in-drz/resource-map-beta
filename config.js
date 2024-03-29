'use strict';
//hello
// eslint-disable-next-line no-unused-vars
const config = {
  style: 'mapbox://styles/mapbox/light-v11',
  accessToken:
    'pk.eyJ1IjoiaW4tZHJ6IiwiYSI6ImNsZXhxdWNmOTFxZDQzdnFvYmRhdHl0czQifQ.fJZWF9JhBmdx-DbEY4deow',
  CSV1: {
      url: 'https://docs.google.com/spreadsheets/d/1xunXdoTGyTaQDb96_5Bklld7E7wQSG6VOKYviLGpRqY/gviz/tq?tqx=out:csv&sheet=charging_locations',
      label: 'Charging Locations' // Assign label for CSV1
  },
  CSV2: {
      url: 'https://docs.google.com/spreadsheets/d/1xunXdoTGyTaQDb96_5Bklld7E7wQSG6VOKYviLGpRqY/gviz/tq?tqx=out:csv&sheet=fridge_list',
      label: 'Fridge List' // Assign label for CSV2
  },
  CSV3: {
      url: 'https://docs.google.com/spreadsheets/d/1xunXdoTGyTaQDb96_5Bklld7E7wQSG6VOKYviLGpRqY/gviz/tq?tqx=out:csv&sheet=mutual_aid_groups',
      label: 'Mutual Aid Groups' // Assign label for CSV3
  },
  CSV4: {
      url: 'https://docs.google.com/spreadsheets/d/1xunXdoTGyTaQDb96_5Bklld7E7wQSG6VOKYviLGpRqY/gviz/tq?tqx=out:csv&sheet=resource_responders',
      label: 'Resource Responders' // Assign label for CSV4
  },
  CSV5: {
      url: 'https://docs.google.com/spreadsheets/d/1xunXdoTGyTaQDb96_5Bklld7E7wQSG6VOKYviLGpRqY/gviz/tq?tqx=out:csv&sheet=public_hotspot locations',
      label: 'Public Hotspot Locations' // Assign label for CSV5
  },
  center: [-118.254643, 34.049157],
  zoom: 10,
  title: 'Resource Responders',
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
        'English',
        'Spanish',
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
